using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hồ sơ ở ghép của Người thuê (BP-11), mỗi Người thuê một hồ sơ. Là dữ liệu cá nhân nên xóa hẳn được.
/// Điểm phù hợp tính lại mỗi lần đọc danh sách ứng viên (FR-113), không lưu.
/// </summary>
public class RoommateProfile
{
    /// <summary>Độ dài tối đa của tên trường hoặc công ty (FR-112).</summary>
    public const int MaxOrganizationNameLength = 200;

    /// <summary>
    /// Người thuê có hợp đồng ở trạng thái này không tạo, sửa hồ sơ, không xem ứng viên, không gửi hay chấp nhận
    /// lời mời; hồ sơ của họ không xuất hiện trong danh sách ứng viên (FR-107). Sắp hết hạn, Đang thanh lý vẫn dùng được.
    /// </summary>
    public const ContractStatus BlockingContractStatus = ContractStatus.DangHieuLuc;

    public static bool BlocksRoommateFeatures(ContractStatus status) => status == BlockingContractStatus;

    /// <summary>Hồ sơ mới của Người thuê, đang tìm; service điền các tiêu chí rồi lưu.</summary>
    public static RoommateProfile CreateFor(long tenantUserId) => new()
    {
        TenantUserId = tenantUserId,
        IsSearching = true
    };

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

    /// <summary>
    /// Mã trường trong danh mục trường (FR-112), chỉ có khi <see cref="OccupationType"/> là Sinh viên. <c>null</c> là
    /// Trường khác (tên gõ tự do) hoặc đi làm.
    /// </summary>
    public string? SchoolCode { get; set; }

    /// <summary>
    /// Tên trường hoặc công ty, tối đa 200 ký tự. Có <see cref="SchoolCode"/> thì là tên trường theo danh mục lúc lưu.
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;

    /// <summary>Thời điểm mong muốn chuyển vào.</summary>
    public DateOnly MoveInFrom { get; set; }

    public RoommateProfileVisibility Visibility { get; set; }

    /// <summary><c>false</c> khi Người thuê tạm dừng tìm.</summary>
    public bool IsSearching { get; set; }

    /// <summary>
    /// FR-106: hồ sơ Công khai và đang tìm mới xuất hiện trong danh sách ứng viên của người khác; Chỉ khi tôi kết nối
    /// hoặc đang tạm dừng thì không.
    /// </summary>
    public bool IsListedAsCandidate => Visibility == RoommateProfileVisibility.CongKhai && IsSearching;

    /// <summary>Lần sửa gần nhất; ứng viên cùng điểm thì hồ sơ sửa gần hơn đứng trước.</summary>
    public DateTimeOffset UpdatedAt { get; set; }
}
