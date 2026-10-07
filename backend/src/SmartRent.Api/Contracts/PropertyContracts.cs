using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Body chung của tạo và sửa khu trọ. <see cref="AmenityIds"/> và <see cref="ImagePaths"/> bỏ trống nghĩa là
/// không có; khi sửa, danh sách mới thay toàn bộ danh sách cũ. Thứ tự trong <see cref="ImagePaths"/> là thứ tự
/// hiển thị, ảnh đầu tiên là ảnh đại diện.
/// </summary>
public record PropertyRequest(
    string Name,
    string Address,
    string City,
    string Ward,
    string? Description,
    IReadOnlyList<long>? AmenityIds,
    IReadOnlyList<string>? ImagePaths);

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

/// <summary>Khoản phí dịch vụ cố định của phòng. <see cref="Amount"/> nullable để thiếu thì validator trả 400.</summary>
public record RoomServiceFeeRequest(string Name, decimal? Amount);

/// <summary>
/// Body chung của thêm và sửa phòng. Các trường số khai báo nullable để thiếu trường thì validator trả 400;
/// giá trị ngoài khoảng cho phép là quy tắc nghiệp vụ, trả 422 ở PropertyService.
/// Khi sửa, danh sách phí dịch vụ, tiện ích và ảnh mới thay toàn bộ danh sách cũ; ảnh đầu tiên là ảnh đại diện.
/// </summary>
public record RoomRequest(
    string Code,
    decimal? Area,
    int? MaxOccupants,
    decimal? RentPrice,
    decimal? ElectricityUnitPrice,
    decimal? WaterUnitPrice,
    string? Description,
    IReadOnlyList<RoomServiceFeeRequest>? ServiceFees,
    IReadOnlyList<long>? AmenityIds,
    IReadOnlyList<string>? ImagePaths);

public record RoomServiceFeeResponse(string Name, decimal Amount);

/// <summary>
/// Chi tiết phòng ở góc nhìn quản lý. <see cref="IsListed"/> cho biết phòng có đang xuất hiện trong tìm kiếm không
/// (đủ bốn điều kiện BR-05); <see cref="CurrentContractId"/> là hợp đồng chưa kết thúc gần nhất của phòng.
/// </summary>
public record RoomResponse(
    long Id,
    long PropertyId,
    string PropertyName,
    string Code,
    decimal Area,
    int MaxOccupants,
    decimal RentPrice,
    decimal ElectricityUnitPrice,
    decimal WaterUnitPrice,
    string? Description,
    RoomOccupancyStatus OccupancyStatus,
    RoomVisibilityStatus VisibilityStatus,
    bool IsListed,
    IReadOnlyList<RoomServiceFeeResponse> ServiceFees,
    IReadOnlyList<AmenityReferenceResponse> Amenities,
    IReadOnlyList<ImageResponse> Images,
    long? CurrentContractId);

/// <summary>Dòng trong danh sách phòng của một khu trọ.</summary>
public record RoomListItemResponse(
    long Id,
    string Code,
    decimal Area,
    int MaxOccupants,
    decimal RentPrice,
    RoomOccupancyStatus OccupancyStatus,
    RoomVisibilityStatus VisibilityStatus,
    bool IsListed,
    string? CoverImageUrl);

/// <summary>Bật hoặc tắt hiển thị tin của phòng. Chỉ nhận DangHienThi hoặc DaAnBoiChuTro.</summary>
public record RoomVisibilityRequest(RoomVisibilityStatus? VisibilityStatus);

/// <summary>Chủ trọ chuyển phòng giữa Trống và Bảo trì; giá trị khác là chuyển tiếp không hợp lệ (409).</summary>
public record RoomOccupancyRequest(RoomOccupancyStatus? OccupancyStatus);
