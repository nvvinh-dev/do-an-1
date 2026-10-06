using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Khu trọ và phòng — BP-02, BP-03. Chủ trọ chỉ thao tác được trên khu trọ của mình (BR-04, FR-13):
/// khu trọ không thuộc người gọi trả 404 như khu trọ không tồn tại.
/// </summary>
public class PropertyService
{
    private static readonly RoomCountsResponse EmptyRoomCounts = new(0, 0, 0, 0, 0);

    private readonly AppDbContext _db;
    private readonly IFileStorage _fileStorage;

    public PropertyService(AppDbContext db, IFileStorage fileStorage)
    {
        _db = db;
        _fileStorage = fileStorage;
    }

    public async Task<ServiceResult<PropertyResponse>> CreateAsync(
        long landlordUserId,
        PropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();

        if (!await AreAllPropertyAmenitiesAsync(amenityIds, cancellationToken))
        {
            return AmenityScopeError<PropertyResponse>();
        }

        var property = new Property
        {
            LandlordUserId = landlordUserId,
            Status = PropertyStatus.DangKhaiThac,
            Amenities = amenityIds.Select(id => new PropertyAmenity { AmenityId = id }).ToList()
        };

        ApplyDetails(property, request);

        _db.Properties.Add(property);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(landlordUserId, property.Id, cancellationToken);
    }

    /// <summary>Thay toàn bộ thông tin và danh sách tiện ích. Khu trọ đã lưu trữ chỉ còn xem được (409).</summary>
    public async Task<ServiceResult<PropertyResponse>> UpdateAsync(
        long landlordUserId,
        long propertyId,
        PropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        var property = await _db.Properties
            .Include(p => p.Amenities)
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

        var amenityIds = (request.AmenityIds ?? []).Distinct().ToList();

        if (!await AreAllPropertyAmenitiesAsync(amenityIds, cancellationToken))
        {
            return AmenityScopeError<PropertyResponse>();
        }

        ApplyDetails(property, request);

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

    private static void ApplyDetails(Property property, PropertyRequest request)
    {
        property.Name = request.Name.Trim();
        property.Address = request.Address.Trim();
        property.City = request.City.Trim();
        property.Ward = request.Ward.Trim();
        property.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
    }

    /// <summary>Mọi id đều là tiện ích có trong danh mục và thuộc phạm vi khu trọ (FR-100).</summary>
    private async Task<bool> AreAllPropertyAmenitiesAsync(
        IReadOnlyCollection<long> amenityIds,
        CancellationToken cancellationToken)
    {
        if (amenityIds.Count == 0)
        {
            return true;
        }

        var matched = await _db.Amenities
            .CountAsync(a => amenityIds.Contains(a.Id) && a.Scope == AmenityScope.KhuTro, cancellationToken);

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

    private static ServiceResult<T> AmenityScopeError<T>()
        => ServiceResult<T>.Fail(
            StatusCodes.Status422UnprocessableEntity, "Tiện ích không có trong danh mục tiện ích của khu trọ.");
}
