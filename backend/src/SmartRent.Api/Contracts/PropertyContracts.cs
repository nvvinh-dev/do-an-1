using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Body chung của tạo và sửa khu trọ. <see cref="AmenityIds"/> bỏ trống nghĩa là không có tiện ích;
/// khi sửa, danh sách mới thay toàn bộ danh sách cũ.
/// </summary>
public record PropertyRequest(
    string Name,
    string Address,
    string City,
    string Ward,
    string? Description,
    IReadOnlyList<long>? AmenityIds);

/// <summary>Tiện ích gắn với khu trọ hoặc phòng.</summary>
public record AmenityReferenceResponse(long Id, string Name);

/// <summary>Ảnh công khai. <see cref="Path"/> là giá trị client gửi lại khi sửa danh sách ảnh.</summary>
public record ImageResponse(string Path, string Url);

/// <summary>Số phòng theo trạng thái khai thác, không tính phòng đã lưu trữ.</summary>
public record RoomCountsResponse(int Total, int Trong, int DangGiuCho, int DangThue, int BaoTri);

/// <summary>Chi tiết khu trọ trả cho Chủ trọ sở hữu. Ảnh đầu tiên là ảnh đại diện.</summary>
public record PropertyResponse(
    long Id,
    string Name,
    string Address,
    string City,
    string Ward,
    string? Description,
    PropertyStatus Status,
    IReadOnlyList<AmenityReferenceResponse> Amenities,
    IReadOnlyList<ImageResponse> Images,
    RoomCountsResponse RoomCounts);

/// <summary>Dòng trong danh sách khu trọ của Chủ trọ.</summary>
public record PropertyListItemResponse(
    long Id,
    string Name,
    string Address,
    string City,
    string Ward,
    PropertyStatus Status,
    string? CoverImageUrl,
    RoomCountsResponse RoomCounts);
