using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Tìm kiếm và chi tiết phòng công khai — BP-04, FR-21 đến FR-24. Người chưa đăng nhập dùng được, nên kết quả chỉ gồm phòng đủ BR-05
/// và không có thông tin liên hệ hay tài khoản ngân hàng của Chủ trọ (QR-07, FR-82).
/// </summary>
public class RoomSearchService
{
    private readonly AppDbContext _db;
    private readonly IFileStorage _fileStorage;

    public RoomSearchService(AppDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    /// <summary>
    /// Lọc theo khoảng giá, khoảng diện tích, khu vực, tiện ích và số người (FR-22). Tỉnh/thành, phường/xã không có
    /// trong danh mục hoặc tiện ích không tồn tại thì không phòng nào khớp, trả trang rỗng.
    /// </summary>
    public async Task<PagedResponse<RoomSearchItemResponse>> SearchAsync(
        RoomSearchQuery filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Rooms.AsNoTracking().WhereListed(_db.Users);

        if (filter.MinPrice is { } minPrice)
        {
            query = query.Where(r => r.RentPrice >= minPrice);
        }

        if (filter.MaxPrice is { } maxPrice)
        {
            query = query.Where(r => r.RentPrice <= maxPrice);
        }

        if (filter.MinArea is { } minArea)
        {
            query = query.Where(r => r.Area >= minArea);
        }

        if (filter.MaxArea is { } maxArea)
        {
            query = query.Where(r => r.Area <= maxArea);
        }

        if (filter.MinOccupants is { } minOccupants)
        {
            query = query.Where(r => r.MaxOccupants >= minOccupants);
        }

        // Tên lưu trong database đã chuẩn hóa như danh mục (PropertyService), nên đưa tên tìm kiếm về cùng dạng.
        if (!string.IsNullOrWhiteSpace(filter.City))
        {
            var city = LocationCatalog.Normalize(filter.City);
            query = query.Where(r => r.Property.City == city);

            if (!string.IsNullOrWhiteSpace(filter.Ward))
            {
                var ward = LocationCatalog.Normalize(filter.Ward);
                query = query.Where(r => r.Property.Ward == ward);
            }
        }

        var amenityIds = (filter.AmenityIds ?? []).Distinct().ToList();

        if (amenityIds.Count > 0)
        {
            // Id không có trong danh mục thì không phòng nào có đủ tiện ích; dừng sớm thay vì sinh một EXISTS
            // cho mỗi id client gửi lên.
            var knownCount = await _db.Amenities.CountAsync(a => amenityIds.Contains(a.Id), cancellationToken);

            if (knownCount != amenityIds.Count)
            {
                return new PagedResponse<RoomSearchItemResponse>([], page, pageSize, 0, 0);
            }

            // Tiện ích có thể là của phòng hoặc của khu trọ chứa phòng.
            foreach (var amenityId in amenityIds)
            {
                query = query.Where(r => r.Amenities.Any(a => a.AmenityId == amenityId)
                                         || r.Property.Amenities.Any(a => a.AmenityId == amenityId));
            }
        }

        var total = await query.CountAsync(cancellationToken);

        var descending = string.Equals(filter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        // Xếp thêm theo id giảm dần để phòng cùng giá, cùng diện tích có thứ tự ổn định giữa các trang.
        var ordered = filter.SortBy?.ToLowerInvariant() switch
        {
            "price" => descending
                ? query.OrderByDescending(r => r.RentPrice).ThenByDescending(r => r.Id)
                : query.OrderBy(r => r.RentPrice).ThenByDescending(r => r.Id),
            "area" => descending
                ? query.OrderByDescending(r => r.Area).ThenByDescending(r => r.Id)
                : query.OrderBy(r => r.Area).ThenByDescending(r => r.Id),
            _ => query.OrderByDescending(r => r.Id)
        };

        var rows = await ordered
            .Select(r => new
            {
                r.Id,
                r.Code,
                PropertyName = r.Property.Name,
                r.Property.Address,
                r.Property.City,
                r.Property.Ward,
                r.RentPrice,
                r.Area,
                r.MaxOccupants,
                CoverPath = r.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).FirstOrDefault(),
                PropertyAmenities = r.Property.Amenities.Select(a => new { a.AmenityId, a.Amenity.Name }).ToList(),
                RoomAmenities = r.Amenities.Select(a => new { a.AmenityId, a.Amenity.Name }).ToList()
            })
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(r => new RoomSearchItemResponse(
                r.Id,
                r.Code,
                r.PropertyName,
                r.Address,
                r.City,
                r.Ward,
                r.RentPrice,
                r.Area,
                r.MaxOccupants,
                r.CoverPath is null ? null : _fileStorage.GetPublicUrl(r.CoverPath),
                r.PropertyAmenities
                    .Concat(r.RoomAmenities)
                    .OrderBy(a => a.AmenityId)
                    .Select(a => a.Name)
                    .Distinct()
                    .ToList()))
            .ToList();

        return new PagedResponse<RoomSearchItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>
    /// FR-21: chi tiết phòng và khu trọ cho người tìm phòng. Phòng không đủ BR-05 trả 404 như không tồn tại,
    /// để không dò được phòng đang ẩn qua id. Người thuê xem lại phòng đã gửi yêu cầu hoặc đang thuê qua
    /// chi tiết yêu cầu thuê và hợp đồng, không qua endpoint này.
    /// </summary>
    public async Task<ServiceResult<PublicRoomDetailResponse>> GetPublicAsync(
        long roomId,
        CancellationToken cancellationToken = default)
    {
        var room = await _db.Rooms
            .AsNoTracking()
            .WhereListed(_db.Users)
            .Where(r => r.Id == roomId)
            .Select(r => new
            {
                r.Id,
                r.Code,
                r.Area,
                r.MaxOccupants,
                r.RentPrice,
                r.ElectricityUnitPrice,
                r.WaterUnitPrice,
                r.Description,
                ImagePaths = r.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).ToList(),
                Amenities = r.Amenities.OrderBy(a => a.AmenityId).Select(a => a.Amenity.Name).ToList(),
                ServiceFees = r.ServiceFees
                    .OrderBy(f => f.Id)
                    .Select(f => new RoomServiceFeeResponse(f.Name, f.Amount))
                    .ToList(),
                Property = new
                {
                    r.Property.Name,
                    r.Property.Address,
                    r.Property.City,
                    r.Property.Ward,
                    r.Property.Description,
                    ImagePaths = r.Property.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).ToList(),
                    Amenities = r.Property.Amenities.OrderBy(a => a.AmenityId).Select(a => a.Amenity.Name).ToList()
                }
            })
            .AsSplitQuery()
            .FirstOrDefaultAsync(cancellationToken);

        if (room is null)
        {
            return ServiceResult<PublicRoomDetailResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy phòng.");
        }

        return ServiceResult<PublicRoomDetailResponse>.Ok(new PublicRoomDetailResponse(
            new PublicRoomResponse(
                room.Id,
                room.Code,
                room.Area,
                room.MaxOccupants,
                room.RentPrice,
                room.ElectricityUnitPrice,
                room.WaterUnitPrice,
                room.Description,
                room.ImagePaths.Select(_fileStorage.GetPublicUrl).ToList(),
                room.Amenities,
                room.ServiceFees),
            new PublicPropertyResponse(
                room.Property.Name,
                room.Property.Address,
                room.Property.City,
                room.Property.Ward,
                room.Property.Description,
                room.Property.ImagePaths.Select(_fileStorage.GetPublicUrl).ToList(),
                room.Property.Amenities)));
    }

    /// <summary>Danh mục tiện ích cố định (database-design mục 4.4), cho bộ lọc tìm kiếm và form của Chủ trọ.</summary>
    public async Task<IReadOnlyList<AmenityResponse>> ListAmenitiesAsync(CancellationToken cancellationToken = default)
        => await _db.Amenities
            .AsNoTracking()
            .OrderBy(a => a.Id)
            .Select(a => new AmenityResponse(a.Id, a.Name, a.Scope))
            .ToListAsync(cancellationToken);
}
