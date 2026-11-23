using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Tạo hoặc sửa hồ sơ ở ghép của chính mình — api-design mục 15, FR-105, FR-108 đến FR-112. Enum, số và
/// boolean khai báo nullable để thiếu trường thì validator trả 400, thay vì nhận giá trị mặc định.
/// </summary>
public record RoommateProfileRequest(
    DateOnly? MoveInFrom,
    RoommateProfileVisibility? Visibility,
    Gender? Gender,
    PreferredRoommateGender? PreferredRoommateGender,
    string City,
    string? Ward,
    decimal? BudgetMin,
    decimal? BudgetMax,
    SleepTime? SleepTime,
    bool? Smokes,
    bool? HasPet,
    CookingFrequency? Cooking,
    NoiseLevel? NoiseLevel,
    OccupationType? OccupationType,
    string? SchoolCode,
    string? OrganizationName);

/// <summary>Tạm dừng (<c>false</c>) hoặc tiếp tục (<c>true</c>) tìm bạn ở ghép — FR-106.</summary>
public record RoommateSearchingRequest(bool? IsSearching);

/// <summary>Hồ sơ ở ghép đầy đủ, chỉ trả cho chính chủ hồ sơ.</summary>
public record RoommateProfileResponse(
    long Id,
    Gender Gender,
    PreferredRoommateGender PreferredRoommateGender,
    string City,
    string? Ward,
    decimal BudgetMin,
    decimal BudgetMax,
    SleepTime SleepTime,
    bool Smokes,
    bool HasPet,
    CookingFrequency Cooking,
    NoiseLevel NoiseLevel,
    OccupationType OccupationType,
    string? SchoolCode,
    string OrganizationName,
    DateOnly MoveInFrom,
    RoommateProfileVisibility Visibility,
    bool IsSearching,
    DateTimeOffset UpdatedAt);

/// <summary>
/// Phần không định danh của hồ sơ người khác (FR-114, BR-25, QR-07) — dùng cho <c>GET /roommate-profiles/{id}</c>
/// và trường <c>profile</c> của danh sách ứng viên. Cố ý không có họ tên, số điện thoại, email, mã tài khoản,
/// mức hiển thị hay trạng thái tìm.
/// </summary>
public record RoommateProfilePublicResponse(
    long Id,
    Gender Gender,
    PreferredRoommateGender PreferredRoommateGender,
    string City,
    string? Ward,
    decimal BudgetMin,
    decimal BudgetMax,
    SleepTime SleepTime,
    bool Smokes,
    bool HasPet,
    CookingFrequency Cooking,
    NoiseLevel NoiseLevel,
    OccupationType OccupationType,
    string? SchoolCode,
    string OrganizationName,
    DateOnly MoveInFrom,
    DateTimeOffset UpdatedAt);
