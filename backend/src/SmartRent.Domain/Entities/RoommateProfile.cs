using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hồ sơ ở ghép của Người thuê (BP-11), mỗi Người thuê một hồ sơ. Là dữ liệu cá nhân nên xóa hẳn được.
/// Điểm phù hợp tính lại mỗi lần đọc danh sách ứng viên (FR-113), không lưu.
/// </summary>
public class RoommateProfile
{
    public long Id { get; set; }

    public long TenantUserId { get; set; }

    public Gender Gender { get; set; }

    /// <summary>Lọc cứng hai chiều (BR-19).</summary>
    public PreferredRoommateGender PreferredRoommateGender { get; set; }

    /// <summary>Tỉnh/thành mong muốn; khác tỉnh/thành thì không ghép (BR-19).</summary>
    public string City { get; set; } = string.Empty;

    /// <summary>Phường/xã mong muốn thuộc <see cref="City"/>; null là chấp nhận mọi phường/xã.</summary>
    public string? Ward { get; set; }

    /// <summary>Số tiền tối thiểu mỗi người tự trả mỗi tháng.</summary>
    public decimal BudgetMin { get; set; }

    /// <summary>Số tiền tối đa mỗi người tự trả mỗi tháng.</summary>
    public decimal BudgetMax { get; set; }

    public SleepTime SleepTime { get; set; }

    public bool Smokes { get; set; }

    public bool HasPet { get; set; }

    public CookingFrequency Cooking { get; set; }

    public NoiseLevel NoiseLevel { get; set; }

    public OccupationType OccupationType { get; set; }

    /// <summary>Tên trường hoặc công ty, tối đa 200 ký tự.</summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>Thời điểm mong muốn chuyển vào.</summary>
    public DateOnly MoveInFrom { get; set; }

    public RoommateProfileVisibility Visibility { get; set; }

    /// <summary><c>false</c> khi Người thuê tạm dừng tìm.</summary>
    public bool IsSearching { get; set; }

    /// <summary>Lần sửa gần nhất; ứng viên cùng điểm thì hồ sơ sửa gần hơn đứng trước.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
