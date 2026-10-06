using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Khu trọ và phòng — BP-02, BP-03. Chủ trọ chỉ thao tác được trên khu trọ và phòng của mình (BR-04, FR-13):
/// quyền sở hữu phòng truy qua khu trọ tới Chủ trọ, tài nguyên không thuộc người gọi trả 404 như không tồn tại.
/// </summary>
public class PropertyService
{
    private const int MaxServiceFeesPerRoom = 10;

    private const int MaxImages = 10;

    /// <summary>Lý do do hệ thống sinh khi lưu trữ phòng hoặc khu trọ tự từ chối yêu cầu thuê đang chờ (FR-20).</summary>
    private const string RoomRetiredReason = "Phòng đã ngừng cho thuê.";

    private static readonly RoomCountsResponse EmptyRoomCounts = new(0, 0, 0, 0, 0);

    private readonly AppDbContext _db;
    private readonly IFileStorage _fileStorage;
    private readonly LocationCatalog _locations;
    private readonly AuditLogger _auditLogger;
    private readonly Notifier _notifier;

    public PropertyService(
        AppDbContext db,
        IFileStorage fileStorage,
        LocationCatalog locations,
        AuditLogger auditLogger,
        Notifier notifier)
    {
        _db = db;
        _fileStorage = fileStorage;
        _locations = locations;
        _auditLogger = auditLogger;
        _notifier = notifier;
    }

    public async Task<ServiceResult<PropertyResponse>> CreateAsync(
        long landlordUserId,
        PropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsKnownLocation(request))
        {
            return LocationError<PropertyResponse>();
        }

        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();

        if (!await AreAllAmenitiesInScopeAsync(amenityIds, AmenityScope.KhuTro, cancellationToken))
        {
            return AmenityScopeError<PropertyResponse>();
        }

        var imagePaths = request.ImagePaths ?? [];
        var imageError = await CheckImagePathsAsync(imagePaths, FilePurpose.AnhKhuTro, landlordUserId, cancellationToken);

        if (imageError is not null)
        {
            return ServiceResult<PropertyResponse>.Fail(StatusCodes.Status422UnprocessableEntity, imageError);
        }

        var property = new Property
        {
            LandlordUserId = landlordUserId,
            Status = PropertyStatus.DangKhaiThac,
            Amenities = amenityIds.Select(id => new PropertyAmenity { AmenityId = id }).ToList(),
            Images = imagePaths
                .Select((path, order) => new PropertyImage { Url = path, DisplayOrder = order })
                .ToList()
        };

        ApplyDetails(property, request);

        _db.Properties.Add(property);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(landlordUserId, property.Id, cancellationToken);
    }

    /// <summary>
    /// Thay toàn bộ thông tin, danh sách tiện ích và ảnh. Ảnh bị bỏ không bị xóa khỏi Storage ở Phase 1.
    /// Khu trọ đã lưu trữ chỉ còn xem được (409).
    /// </summary>
    public async Task<ServiceResult<PropertyResponse>> UpdateAsync(
        long landlordUserId,
        long propertyId,
        PropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        var property = await _db.Properties
            .Include(p => p.Amenities)
            .Include(p => p.Images)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                p => p.Id == propertyId && p.LandlordUserId == landlordUserId,
                cancellationToken);

        if (property is null)
        {
            return NotFound<PropertyResponse>();
        }

        if (property.IsArchived)
        {
            return ServiceResult<PropertyResponse>.Fail(
                StatusCodes.Status409Conflict, "Khu trọ đã lưu trữ, chỉ còn xem được.");
        }

        if (!IsKnownLocation(request))
        {
            return LocationError<PropertyResponse>();
        }

        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();

        if (!await AreAllAmenitiesInScopeAsync(amenityIds, AmenityScope.KhuTro, cancellationToken))
        {
            return AmenityScopeError<PropertyResponse>();
        }

        var imagePaths = request.ImagePaths ?? [];
        var imageError = await CheckImagePathsAsync(imagePaths, FilePurpose.AnhKhuTro, landlordUserId, cancellationToken);

        if (imageError is not null)
        {
            return ServiceResult<PropertyResponse>.Fail(StatusCodes.Status422UnprocessableEntity, imageError);
        }

        ApplyDetails(property, request);

        property.Images.Clear();

        foreach (var (path, order) in imagePaths.Select((path, order) => (path, order)))
        {
            property.Images.Add(new PropertyImage { Url = path, DisplayOrder = order });
        }

        // Chỉ xóa tiện ích bị bỏ và thêm tiện ích mới, không xóa rồi thêm lại cùng khóa.
        foreach (var removed in property.Amenities.Where(a => !amenityIds.Contains(a.AmenityId)).ToList())
        {
            property.Amenities.Remove(removed);
        }

        foreach (var added in amenityIds.Except(property.Amenities.Select(a => a.AmenityId)).ToList())
        {
            property.Amenities.Add(new PropertyAmenity { AmenityId = added });
        }

        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(landlordUserId, property.Id, cancellationToken);
    }

    /// <summary>Danh sách khu trọ của chính Chủ trọ, không phân trang (AS-04); mặc định ẩn khu đã lưu trữ.</summary>
    public async Task<IReadOnlyList<PropertyListItemResponse>> ListAsync(
        long landlordUserId,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Properties.AsNoTracking().Where(p => p.LandlordUserId == landlordUserId);

        if (!includeArchived)
        {
            query = query.Where(p => p.Status != PropertyStatus.LuuTru);
        }

        var rows = await query
            .OrderByDescending(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Address,
                p.City,
                p.Ward,
                p.Status,
                CoverPath = p.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var roomCounts = await CountRoomsAsync(rows.Select(r => r.Id).ToList(), cancellationToken);

        return rows
            .Select(r => new PropertyListItemResponse(
                r.Id,
                r.Name,
                r.Address,
                r.City,
                r.Ward,
                r.Status,
                r.CoverPath is null ? null : _fileStorage.GetPublicUrl(r.CoverPath),
                roomCounts.GetValueOrDefault(r.Id, EmptyRoomCounts)))
            .ToList();
    }

    public async Task<ServiceResult<PropertyResponse>> GetAsync(
        long landlordUserId,
        long propertyId,
        CancellationToken cancellationToken = default)
    {
        var property = await _db.Properties
            .AsNoTracking()
            .Include(p => p.Amenities).ThenInclude(pa => pa.Amenity)
            .Include(p => p.Images)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                p => p.Id == propertyId && p.LandlordUserId == landlordUserId,
                cancellationToken);

        if (property is null)
        {
            return NotFound<PropertyResponse>();
        }

        var roomCounts = await CountRoomsAsync([property.Id], cancellationToken);

        return ServiceResult<PropertyResponse>.Ok(new PropertyResponse(
            property.Id,
            property.Name,
            property.Address,
            property.City,
            property.Ward,
            property.Description,
            property.Status,
            property.Amenities
                .OrderBy(pa => pa.AmenityId)
                .Select(pa => new AmenityReferenceResponse(pa.AmenityId, pa.Amenity.Name))
                .ToList(),
            property.Images
                .OrderBy(i => i.DisplayOrder)
                .Select(i => new ImageResponse(i.Url, _fileStorage.GetPublicUrl(i.Url)))
                .ToList(),
            roomCounts.GetValueOrDefault(property.Id, EmptyRoomCounts)));
    }

    // ---------------------------------------------------------------- Phòng

    /// <summary>FR-12, FR-15: phòng mới ở Trống và chưa hiển thị cho tới khi Chủ trọ bật.</summary>
    public async Task<ServiceResult<RoomResponse>> CreateRoomAsync(
        long landlordUserId,
        long propertyId,
        RoomRequest request,
        CancellationToken cancellationToken = default)
    {
        var property = await _db.Properties
            .AsNoTracking()
            .FirstOrDefaultAsync(
                p => p.Id == propertyId && p.LandlordUserId == landlordUserId,
                cancellationToken);

        if (property is null)
        {
            return NotFound<RoomResponse>();
        }

        if (property.IsArchived)
        {
            return ServiceResult<RoomResponse>.Fail(
                StatusCodes.Status409Conflict, "Khu trọ đã lưu trữ, không thêm phòng mới được.");
        }

        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();
        var error = await ValidateRoomAsync(
            landlordUserId, propertyId, null, request, amenityIds, mustKeepImage: false, cancellationToken);

        if (error is not null)
        {
            return ServiceResult<RoomResponse>.Fail(error.StatusCode, error.Error!);
        }

        var room = new Room
        {
            PropertyId = propertyId,
            OccupancyStatus = RoomOccupancyStatus.Trong,
            VisibilityStatus = RoomVisibilityStatus.DaAnBoiChuTro,
            Amenities = amenityIds.Select(id => new RoomAmenity { AmenityId = id }).ToList()
        };

        ApplyRoomDetails(room, request);
        _db.Rooms.Add(room);

        if (!await TrySaveRoomAsync(cancellationToken))
        {
            return RoomCodeTaken<RoomResponse>();
        }

        return await GetRoomAsync(landlordUserId, room.Id, cancellationToken);
    }

    /// <summary>
    /// Thay toàn bộ thông tin, phí dịch vụ, tiện ích và ảnh; không đổi được khu trọ của phòng. Phòng đã lưu trữ trả 409;
    /// phòng đang hiển thị không được bỏ hết ảnh (422).
    /// Đổi giá hoặc phí dịch vụ thì ghi nhật ký giá trị cũ và mới (BR-23); giá mới chỉ áp dụng cho hợp đồng lập sau (BR-12).
    /// </summary>
    public async Task<ServiceResult<RoomResponse>> UpdateRoomAsync(
        long landlordUserId,
        long roomId,
        RoomRequest request,
        CancellationToken cancellationToken = default)
    {
        var room = await _db.Rooms
            .Include(r => r.ServiceFees)
            .Include(r => r.Amenities)
            .Include(r => r.Images)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (room is null)
        {
            return RoomNotFound<RoomResponse>();
        }

        if (room.IsArchived)
        {
            return ServiceResult<RoomResponse>.Fail(
                StatusCodes.Status409Conflict, "Phòng đã lưu trữ, chỉ còn xem được.");
        }

        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();
        var error = await ValidateRoomAsync(
            landlordUserId,
            room.PropertyId,
            room.Id,
            request,
            amenityIds,
            mustKeepImage: room.VisibilityStatus == RoomVisibilityStatus.DangHienThi,
            cancellationToken);

        if (error is not null)
        {
            return ServiceResult<RoomResponse>.Fail(error.StatusCode, error.Error!);
        }

        var pricesBefore = RoomPrices.Of(room);

        ApplyRoomDetails(room, request);

        // Chỉ xóa tiện ích bị bỏ và thêm tiện ích mới, không xóa rồi thêm lại cùng khóa.
        foreach (var removed in room.Amenities.Where(a => !amenityIds.Contains(a.AmenityId)).ToList())
        {
            room.Amenities.Remove(removed);
        }

        foreach (var added in amenityIds.Except(room.Amenities.Select(a => a.AmenityId)).ToList())
        {
            room.Amenities.Add(new RoomAmenity { AmenityId = added });
        }

        var pricesAfter = RoomPrices.Of(room);

        if (!pricesBefore.SameAs(pricesAfter))
        {
            _auditLogger.Write(landlordUserId, "SuaGiaPhong", nameof(Room), room.Id, pricesBefore, pricesAfter);
        }

        if (!await TrySaveRoomAsync(cancellationToken))
        {
            return RoomCodeTaken<RoomResponse>();
        }

        return await GetRoomAsync(landlordUserId, room.Id, cancellationToken);
    }

    /// <summary>Phòng của một khu trọ, không phân trang (AS-04); mặc định ẩn phòng đã lưu trữ.</summary>
    public async Task<ServiceResult<IReadOnlyList<RoomListItemResponse>>> ListRoomsAsync(
        long landlordUserId,
        long propertyId,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var property = await _db.Properties
            .AsNoTracking()
            .FirstOrDefaultAsync(
                p => p.Id == propertyId && p.LandlordUserId == landlordUserId,
                cancellationToken);

        if (property is null)
        {
            return NotFound<IReadOnlyList<RoomListItemResponse>>();
        }

        var query = _db.Rooms.AsNoTracking().Where(r => r.PropertyId == propertyId);

        if (!includeArchived)
        {
            query = query.Where(r => r.OccupancyStatus != RoomOccupancyStatus.LuuTru);
        }

        var rows = await query
            .OrderBy(r => r.Code)
            .Select(r => new
            {
                r.Id,
                r.Code,
                r.Area,
                r.MaxOccupants,
                r.RentPrice,
                r.OccupancyStatus,
                r.VisibilityStatus,
                CoverPath = r.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var landlordLocked = await IsLandlordLockedAsync(landlordUserId, cancellationToken);

        return ServiceResult<IReadOnlyList<RoomListItemResponse>>.Ok(rows
            .Select(r => new RoomListItemResponse(
                r.Id,
                r.Code,
                r.Area,
                r.MaxOccupants,
                r.RentPrice,
                r.OccupancyStatus,
                r.VisibilityStatus,
                Room.IsListed(r.OccupancyStatus, r.VisibilityStatus, property.Status, landlordLocked),
                r.CoverPath is null ? null : _fileStorage.GetPublicUrl(r.CoverPath)))
            .ToList());
    }

    public async Task<ServiceResult<RoomResponse>> GetRoomAsync(
        long landlordUserId,
        long roomId,
        CancellationToken cancellationToken = default)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Property)
            .Include(r => r.ServiceFees)
            .Include(r => r.Amenities).ThenInclude(ra => ra.Amenity)
            .Include(r => r.Images)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (room is null)
        {
            return RoomNotFound<RoomResponse>();
        }

        var landlordLocked = await IsLandlordLockedAsync(landlordUserId, cancellationToken);

        // Hợp đồng chưa kết thúc gần nhất, từ Nháp tới Đang thanh lý.
        var currentContractId = await _db.Contracts
            .AsNoTracking()
            .Where(c => c.RoomId == room.Id
                        && c.Status != ContractStatus.DaThanhLy
                        && c.Status != ContractStatus.DaHuy)
            .OrderByDescending(c => c.Id)
            .Select(c => (long?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return ServiceResult<RoomResponse>.Ok(new RoomResponse(
            room.Id,
            room.PropertyId,
            room.Property.Name,
            room.Code,
            room.Area,
            room.MaxOccupants,
            room.RentPrice,
            room.ElectricityUnitPrice,
            room.WaterUnitPrice,
            room.Description,
            room.OccupancyStatus,
            room.VisibilityStatus,
            Room.IsListed(room.OccupancyStatus, room.VisibilityStatus, room.Property.Status, landlordLocked),
            room.ServiceFees
                .OrderBy(f => f.Id)
                .Select(f => new RoomServiceFeeResponse(f.Name, f.Amount))
                .ToList(),
            room.Amenities
                .OrderBy(ra => ra.AmenityId)
                .Select(ra => new AmenityReferenceResponse(ra.AmenityId, ra.Amenity.Name))
                .ToList(),
            room.Images
                .OrderBy(i => i.DisplayOrder)
                .Select(i => new ImageResponse(i.Url, _fileStorage.GetPublicUrl(i.Url)))
                .ToList(),
            currentContractId));
    }

    /// <summary>
    /// Quy tắc dữ liệu của phòng (api-design mục 5.2): giá trị số, phí dịch vụ, tiện ích và ảnh sai trả 422;
    /// mã phòng trùng với phòng khác trong cùng khu trọ trả 409. Trả null khi hợp lệ.
    /// <paramref name="mustKeepImage"/> khi phòng đang hiển thị: phòng hiển thị phải có ít nhất một ảnh (FR-15).
    /// </summary>
    private async Task<ServiceResult?> ValidateRoomAsync(
        long landlordUserId,
        long propertyId,
        long? roomId,
        RoomRequest request,
        IReadOnlyCollection<long> amenityIds,
        bool mustKeepImage,
        CancellationToken cancellationToken)
    {
        string? invalid = null;
        var fees = request.ServiceFees ?? [];
        var imagePaths = request.ImagePaths ?? [];

        if (request.Area <= 0)
        {
            invalid = "Diện tích phải lớn hơn 0.";
        }
        else if (request.MaxOccupants < 1)
        {
            invalid = "Số người tối đa phải từ 1 trở lên.";
        }
        else if (request.RentPrice <= 0)
        {
            invalid = "Giá thuê phải lớn hơn 0.";
        }
        else if (request.ElectricityUnitPrice < 0 || request.WaterUnitPrice < 0)
        {
            invalid = "Đơn giá điện và đơn giá nước không được âm.";
        }
        else if (fees.Count > MaxServiceFeesPerRoom)
        {
            invalid = $"Phòng có tối đa {MaxServiceFeesPerRoom} khoản phí dịch vụ.";
        }
        else if (fees.Any(f => f.Amount < 0))
        {
            invalid = "Số tiền phí dịch vụ không được âm.";
        }
        else if (fees.Select(f => f.Name.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != fees.Count)
        {
            invalid = "Tên các khoản phí dịch vụ trong một phòng không được trùng nhau.";
        }
        else if (!await AreAllAmenitiesInScopeAsync(amenityIds, AmenityScope.Phong, cancellationToken))
        {
            invalid = "Tiện ích không có trong danh mục tiện ích của phòng.";
        }
        else if (mustKeepImage && imagePaths.Count == 0)
        {
            invalid = "Phòng đang hiển thị phải còn ít nhất một ảnh. Tắt hiển thị trước khi bỏ hết ảnh.";
        }
        else
        {
            invalid = await CheckImagePathsAsync(imagePaths, FilePurpose.AnhPhong, landlordUserId, cancellationToken);
        }

        if (invalid is not null)
        {
            return ServiceResult.Fail(StatusCodes.Status422UnprocessableEntity, invalid);
        }

        var code = request.Code.Trim();
        var codeTaken = await _db.Rooms.AnyAsync(
            r => r.PropertyId == propertyId && r.Code == code && r.Id != roomId,
            cancellationToken);

        return codeTaken ? RoomCodeTaken<RoomResponse>() : null;
    }

    private static void ApplyRoomDetails(Room room, RoomRequest request)
    {
        room.Code = request.Code.Trim();
        room.Area = request.Area!.Value;
        room.MaxOccupants = request.MaxOccupants!.Value;
        room.RentPrice = request.RentPrice!.Value;
        room.ElectricityUnitPrice = request.ElectricityUnitPrice!.Value;
        room.WaterUnitPrice = request.WaterUnitPrice!.Value;
        room.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();

        room.ServiceFees.Clear();

        foreach (var fee in request.ServiceFees ?? [])
        {
            room.ServiceFees.Add(new RoomServiceFee { Name = fee.Name.Trim(), Amount = fee.Amount!.Value });
        }

        // Ảnh bị bỏ không bị xóa khỏi Storage ở Phase 1.
        room.Images.Clear();

        foreach (var (path, order) in (request.ImagePaths ?? []).Select((path, order) => (path, order)))
        {
            room.Images.Add(new RoomImage { Url = path, DisplayOrder = order });
        }
    }

    /// <summary>
    /// FR-100, api-design mục 5.1 và 14: tối đa 10 ảnh, không trùng nhau, mỗi đường dẫn đúng định dạng server sinh ra,
    /// đúng loại ảnh, nằm trong thư mục của chính Chủ trọ và file còn trên Storage. Trả null khi hợp lệ.
    /// </summary>
    private async Task<string?> CheckImagePathsAsync(
        IReadOnlyList<string> paths,
        FilePurpose purpose,
        long landlordUserId,
        CancellationToken cancellationToken)
    {
        if (paths.Count > MaxImages)
        {
            return $"Tối đa {MaxImages} ảnh.";
        }

        if (paths.Distinct(StringComparer.Ordinal).Count() != paths.Count)
        {
            return "Danh sách ảnh có ảnh bị trùng.";
        }

        var owned = await Task.WhenAll(
            paths.Select(path => _fileStorage.IsOwnedByAsync(path, purpose, landlordUserId, cancellationToken)));

        if (owned.All(isOwned => isOwned))
        {
            return null;
        }

        var kind = purpose == FilePurpose.AnhKhuTro ? "ảnh khu trọ" : "ảnh phòng";
        return $"Đường dẫn ảnh không hợp lệ: chỉ nhận {kind} do chính bạn tải lên.";
    }

    /// <summary>Hai request cùng mã phòng gửi gần như đồng thời: unique index (property_id, code) chặn bên sau.</summary>
    private async Task<bool> TrySaveRoomAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return false;
        }
    }

    private Task<bool> IsLandlordLockedAsync(long landlordUserId, CancellationToken cancellationToken)
        => _db.Users
            .Where(u => u.Id == landlordUserId)
            .Select(u => u.IsLocked)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>Giá hiện hành của phòng — giá trị cũ và mới ghi vào nhật ký SuaGiaPhong.</summary>
    private sealed record RoomPrices(
        decimal RentPrice,
        decimal ElectricityUnitPrice,
        decimal WaterUnitPrice,
        IReadOnlyList<RoomServiceFeeResponse> ServiceFees)
    {
        public static RoomPrices Of(Room room) => new(
            room.RentPrice,
            room.ElectricityUnitPrice,
            room.WaterUnitPrice,
            room.ServiceFees.Select(f => new RoomServiceFeeResponse(f.Name, f.Amount)).ToList());

        /// <summary>Chỉ đổi thứ tự các khoản phí thì không tính là đổi giá.</summary>
        public bool SameAs(RoomPrices other)
            => RentPrice == other.RentPrice
               && ElectricityUnitPrice == other.ElectricityUnitPrice
               && WaterUnitPrice == other.WaterUnitPrice
               && ServiceFees.OrderBy(f => f.Name).ThenBy(f => f.Amount)
                   .SequenceEqual(other.ServiceFees.OrderBy(f => f.Name).ThenBy(f => f.Amount));
    }

    // ------------------------------------------- Hiển thị, trạng thái khai thác, lưu trữ

    /// <summary>
    /// FR-15: bật hoặc tắt hiển thị tin của phòng. Tin bị Admin ẩn và phòng đã lưu trữ trả 409;
    /// bật hiển thị khi phòng chưa có ảnh nào trả 422.
    /// </summary>
    public async Task<ServiceResult> ChangeVisibilityAsync(
        long landlordUserId,
        long roomId,
        RoomVisibilityStatus target,
        CancellationToken cancellationToken = default)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(
            r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
            cancellationToken);

        if (room is null)
        {
            return RoomNotFound();
        }

        if (!room.CanChangeVisibility)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                room.IsArchived
                    ? "Phòng đã lưu trữ, chỉ còn xem được."
                    : "Tin đăng đang bị Quản trị viên ẩn, Chủ trọ không tự bật lại được.");
        }

        if (target == RoomVisibilityStatus.DangHienThi
            && !await _db.RoomImages.AnyAsync(i => i.RoomId == room.Id, cancellationToken))
        {
            return ServiceResult.Fail(
                StatusCodes.Status422UnprocessableEntity, "Phòng phải có ít nhất một ảnh mới bật hiển thị được.");
        }

        room.VisibilityStatus = target;
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>FR-89: chỉ Trống ↔ Bảo trì; về Trống khi hợp đồng hiện tại chưa kết thúc thì từ chối (BR-08, FR-18).</summary>
    public async Task<ServiceResult> ChangeOccupancyStatusAsync(
        long landlordUserId,
        long roomId,
        RoomOccupancyStatus target,
        CancellationToken cancellationToken = default)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(
            r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
            cancellationToken);

        if (room is null)
        {
            return RoomNotFound();
        }

        var hasOpenContract = await _db.Contracts.AnyAsync(
            c => c.RoomId == room.Id && c.Status != ContractStatus.DaThanhLy && c.Status != ContractStatus.DaHuy,
            cancellationToken);

        if (!room.CanChangeOccupancyTo(target, hasOpenContract))
        {
            var blockedByContract = room.OccupancyStatus == RoomOccupancyStatus.BaoTri
                                    && target == RoomOccupancyStatus.Trong
                                    && hasOpenContract;

            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                blockedByContract
                    ? "Hợp đồng hiện tại của phòng chưa thanh lý hoặc chưa hủy, chưa chuyển phòng về Trống được."
                    : "Chủ trọ chỉ chuyển được phòng từ Trống sang Bảo trì hoặc từ Bảo trì về Trống.");
        }

        room.OccupancyStatus = target;
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-20: lưu trữ phòng đang Trống hoặc Bảo trì. Yêu cầu thuê đang chờ của phòng tự chuyển Từ chối và người thuê
    /// nhận thông báo, trong cùng transaction. Lưu trữ là vĩnh viễn.
    /// </summary>
    public async Task<ServiceResult> ArchiveRoomAsync(
        long landlordUserId,
        long roomId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var room = await _db.Rooms
            .Include(r => r.Property)
            .FirstOrDefaultAsync(
                r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (room is null)
        {
            return RoomNotFound();
        }

        if (!room.CanBeArchived)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                room.IsArchived ? "Phòng đã lưu trữ." : "Chỉ lưu trữ được phòng đang Trống hoặc Bảo trì.");
        }

        room.OccupancyStatus = RoomOccupancyStatus.LuuTru;
        await RejectPendingRentalRequestsAsync([room], room.Property.Name, cancellationToken);

        if (!await TrySaveArchiveAsync(cancellationToken))
        {
            return ArchiveConflict();
        }

        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// BR-10, FR-20: lưu trữ khu trọ khi không còn phòng Đang giữ chỗ hoặc Đang thuê. Mọi phòng của khu chuyển
    /// Lưu trữ, yêu cầu thuê đang chờ của các phòng đó tự chuyển Từ chối và người thuê nhận thông báo —
    /// tất cả trong một transaction (security-design mục 8, điều 10).
    /// </summary>
    public async Task<ServiceResult> ArchivePropertyAsync(
        long landlordUserId,
        long propertyId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var property = await _db.Properties
            .Include(p => p.Rooms)
            .FirstOrDefaultAsync(
                p => p.Id == propertyId && p.LandlordUserId == landlordUserId,
                cancellationToken);

        if (property is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy khu trọ.");
        }

        if (property.IsArchived)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Khu trọ đã lưu trữ.");
        }

        if (property.Rooms.Any(r => r.BlocksPropertyArchive))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Khu trọ còn phòng đang giữ chỗ hoặc đang cho thuê, chưa lưu trữ được.");
        }

        var rooms = property.Rooms.Where(r => !r.IsArchived).ToList();

        property.Status = PropertyStatus.LuuTru;

        foreach (var room in rooms)
        {
            room.OccupancyStatus = RoomOccupancyStatus.LuuTru;
        }

        await RejectPendingRentalRequestsAsync(rooms, property.Name, cancellationToken);

        if (!await TrySaveArchiveAsync(cancellationToken))
        {
            return ArchiveConflict();
        }

        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-20: yêu cầu thuê đang chờ của các phòng vừa lưu trữ chuyển Từ chối với lý do do hệ thống sinh;
    /// mỗi người thuê nhận YeuCauThueBiTuChoi. Chỉ thêm vào DbContext — bên gọi lưu trong transaction của mình.
    /// </summary>
    private async Task RejectPendingRentalRequestsAsync(
        IReadOnlyCollection<Room> rooms,
        string propertyName,
        CancellationToken cancellationToken)
    {
        var roomCodes = rooms.ToDictionary(r => r.Id, r => r.Code);
        var roomIds = roomCodes.Keys.ToList();

        var pending = await _db.RentalRequests
            .Where(r => roomIds.Contains(r.RoomId) && r.Status == RentalRequestStatus.ChoDuyet)
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        foreach (var request in pending)
        {
            request.Status = RentalRequestStatus.TuChoi;
            request.RejectReason = RoomRetiredReason;
            request.ProcessedAt = now;

            _notifier.Notify(
                request.TenantUserId,
                "YeuCauThueBiTuChoi",
                "Yêu cầu thuê bị từ chối",
                $"Yêu cầu thuê phòng {roomCodes[request.RoomId]} ({propertyName}) bị từ chối. Lý do: {RoomRetiredReason}",
                nameof(RentalRequest),
                request.Id);
        }
    }

    /// <summary>
    /// Yêu cầu thuê vừa được duyệt hoặc rút cùng lúc với thao tác lưu trữ: xmin của rental_requests chặn bên lưu sau.
    /// </summary>
    private async Task<bool> TrySaveArchiveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    private static void ApplyDetails(Property property, PropertyRequest request)
    {
        property.Name = request.Name.Trim();
        property.Address = request.Address.Trim();
        property.City = LocationCatalog.Normalize(request.City);
        property.Ward = LocationCatalog.Normalize(request.Ward);
        property.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    }

    /// <summary>Cặp tỉnh/thành – phường/xã có trong danh mục GET /locations (FR-99).</summary>
    private bool IsKnownLocation(PropertyRequest request)
        => _locations.Contains(LocationCatalog.Normalize(request.City), LocationCatalog.Normalize(request.Ward));

    /// <summary>Mọi id đều là tiện ích có trong danh mục và đúng phạm vi khu trọ hoặc phòng (FR-100).</summary>
    private async Task<bool> AreAllAmenitiesInScopeAsync(
        IReadOnlyCollection<long> amenityIds,
        AmenityScope scope,
        CancellationToken cancellationToken)
    {
        if (amenityIds.Count == 0)
        {
            return true;
        }

        var matched = await _db.Amenities
            .CountAsync(a => amenityIds.Contains(a.Id) && a.Scope == scope, cancellationToken);

        return matched == amenityIds.Count;
    }

    /// <summary>Số phòng theo trạng thái của từng khu trọ, không tính phòng đã lưu trữ.</summary>
    private async Task<Dictionary<long, RoomCountsResponse>> CountRoomsAsync(
        IReadOnlyCollection<long> propertyIds,
        CancellationToken cancellationToken)
    {
        var groups = await _db.Rooms
            .AsNoTracking()
            .Where(r => propertyIds.Contains(r.PropertyId) && r.OccupancyStatus != RoomOccupancyStatus.LuuTru)
            .GroupBy(r => new { r.PropertyId, r.OccupancyStatus })
            .Select(g => new { g.Key.PropertyId, g.Key.OccupancyStatus, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return groups
            .GroupBy(g => g.PropertyId)
            .ToDictionary(
                byProperty => byProperty.Key,
                byProperty =>
                {
                    int CountOf(RoomOccupancyStatus status)
                        => byProperty.Where(g => g.OccupancyStatus == status).Sum(g => g.Count);

                    var trong = CountOf(RoomOccupancyStatus.Trong);
                    var dangGiuCho = CountOf(RoomOccupancyStatus.DangGiuCho);
                    var dangThue = CountOf(RoomOccupancyStatus.DangThue);
                    var baoTri = CountOf(RoomOccupancyStatus.BaoTri);

                    return new RoomCountsResponse(trong + dangGiuCho + dangThue + baoTri, trong, dangGiuCho, dangThue, baoTri);
                });
    }

    private static ServiceResult<T> NotFound<T>()
        => ServiceResult<T>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy khu trọ.");

    private static ServiceResult RoomNotFound()
        => ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy phòng.");

    private static ServiceResult ArchiveConflict()
        => ServiceResult.Fail(
            StatusCodes.Status409Conflict,
            "Yêu cầu thuê của phòng vừa được thay đổi bởi một thao tác khác. Hãy tải lại và thử lại.");

    private static ServiceResult<T> RoomNotFound<T>()
        => ServiceResult<T>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy phòng.");

    private static ServiceResult<T> RoomCodeTaken<T>()
        => ServiceResult<T>.Fail(StatusCodes.Status409Conflict, "Mã phòng đã có trong khu trọ này.");

    private static ServiceResult<T> LocationError<T>()
        => ServiceResult<T>.Fail(
            StatusCodes.Status422UnprocessableEntity, "Cặp tỉnh/thành và phường/xã không có trong danh mục đơn vị hành chính.");

    private static ServiceResult<T> AmenityScopeError<T>()
        => ServiceResult<T>.Fail(
            StatusCodes.Status422UnprocessableEntity, "Tiện ích không có trong danh mục tiện ích của khu trọ.");
}
