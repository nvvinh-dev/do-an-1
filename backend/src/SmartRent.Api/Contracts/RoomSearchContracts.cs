using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Bộ lọc của GET /rooms/search (FR-22, api-design mục 6). Mọi trường tùy chọn. <see cref="AmenityIds"/> lặp lại
/// nhiều lần trên query; phòng phải có đủ mọi tiện ích được chọn, tính cả tiện ích của khu trọ chứa phòng.
/// <see cref="MinOccupants"/> là số người phòng phải ở được, so với số người tối đa của phòng.
/// <see cref="SortBy"/> nhận <c>price</c> hoặc <c>area</c>, <see cref="SortDirection"/> nhận <c>asc</c> (mặc định)
/// hoặc <c>desc</c>; không có <see cref="SortBy"/> thì phòng mới thêm xếp trước.
/// </summary>
public record RoomSearchQuery(
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal? MinArea,
    decimal? MaxArea,
    string? City,
    string? Ward,
    IReadOnlyList<long>? AmenityIds,
    int? MinOccupants,
    string? SortBy,
    string? SortDirection);

/// <summary>
/// Một phòng trong kết quả tìm kiếm. Không có thông tin liên hệ hay tài khoản ngân hàng của Chủ trọ (FR-24, FR-82).
/// <see cref="Amenities"/> là tên tiện ích của phòng và của khu trọ chứa phòng.
/// </summary>
public record RoomSearchItemResponse(
    long Id,
    string Code,
    string PropertyName,
    string Address,
    string City,
    string Ward,
    decimal RentPrice,
    decimal Area,
    int MaxOccupants,
    string? CoverImageUrl,
    IReadOnlyList<string> Amenities);

/// <summary>
/// Chi tiết phòng công khai — GET /rooms/{id}/public. Không có tên, số điện thoại, email hay tài khoản ngân hàng
/// của Chủ trọ (QR-07, FR-24, FR-82).
/// </summary>
public record PublicRoomDetailResponse(PublicRoomResponse Room, PublicPropertyResponse Property);

/// <summary>
/// Phòng ở góc nhìn người tìm phòng. <see cref="Images"/> là URL ảnh theo thứ tự Chủ trọ sắp, ảnh đầu là ảnh đại diện;
/// <see cref="Amenities"/> là tên tiện ích của phòng theo thứ tự danh mục.
/// </summary>
public record PublicRoomResponse(
    long Id,
    string Code,
    decimal Area,
    int MaxOccupants,
    decimal RentPrice,
    decimal ElectricityUnitPrice,
    decimal WaterUnitPrice,
    string? Description,
    IReadOnlyList<string> Images,
    IReadOnlyList<string> Amenities,
    IReadOnlyList<RoomServiceFeeResponse> ServiceFees);

/// <summary>Khu trọ chứa phòng. <see cref="Images"/>, <see cref="Amenities"/> cùng dạng với phòng.</summary>
public record PublicPropertyResponse(
    string Name,
    string Address,
    string City,
    string Ward,
    string? Description,
    IReadOnlyList<string> Images,
    IReadOnlyList<string> Amenities);

/// <summary>Một tiện ích trong danh mục — <see cref="Scope"/> cho biết tiện ích của khu trọ hay của phòng.</summary>
public record AmenityResponse(long Id, string Name, AmenityScope Scope);
