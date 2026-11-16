using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Sự cố / yêu cầu sửa chữa do Người thuê báo (BP-08). Người thuê đứng tên và Chủ trọ sở hữu truy qua
/// hợp đồng → phòng → khu trọ (BR-04).
/// </summary>
public class MaintenanceRequest
{
    public long Id { get; set; }

    public long ContractId { get; set; }

    public Contract Contract { get; set; } = null!;

    /// <summary>Tiêu đề, 1–200 ký tự.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Mô tả, 1–2000 ký tự.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Chỉ để hiển thị và sắp xếp, không đổi hạn nào.</summary>
    public MaintenanceUrgency Urgency { get; set; }

    public MaintenanceRequestStatus Status { get; set; }

    /// <summary>Lúc Người thuê gửi; mốc 72 giờ chưa tiếp nhận (BP-08 A4).</summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Lần đầu Chủ trọ tiếp nhận.</summary>
    public DateTimeOffset? AcceptedAt { get; set; }

    /// <summary>Ngày dự kiến sửa xong, không bắt buộc.</summary>
    public DateOnly? ExpectedCompletionDate { get; set; }

    /// <summary>Lần gần nhất Chủ trọ báo đã sửa xong; mốc tự đóng (BP-08 A3).</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    /// <summary>Lý do "Chưa đạt" gần nhất của Người thuê; lần sau ghi đè.</summary>
    public string? NotFixedReason { get; set; }

    /// <summary>Bắt buộc khi <see cref="Status"/> là TuChoi.</summary>
    public string? RejectionReason { get; set; }

    /// <summary>Bồi thường dự kiến Chủ trọ ghi khi từ chối (BP-08 A1); chỉ là ghi chú, không nối với hóa đơn.</summary>
    public decimal? EstimatedCompensation { get; set; }

    public DateTimeOffset? RejectedAt { get; set; }

    /// <summary>Lúc chuyển DaDong.</summary>
    public DateTimeOffset? ClosedAt { get; set; }

    /// <summary><c>true</c> khi hệ thống tự đóng.</summary>
    public bool IsAutoClosed { get; set; }

    /// <summary>Lúc Người thuê hủy.</summary>
    public DateTimeOffset? CancelledAt { get; set; }

    /// <summary>Từ 0 tới 5 ảnh, ghi một lần khi tạo.</summary>
    public ICollection<MaintenanceRequestImage> Images { get; set; } = [];

    /// <summary>Số ảnh tối đa của một sự cố (FR-136).</summary>
    public const int MaxImages = 5;

    /// <summary>
    /// FR-136: sự cố mới ở trạng thái Mới. Điều kiện hợp đồng (<see cref="Contract.CanReportMaintenance"/>) và
    /// quyền sở hữu ảnh do service kiểm tra trước. Thứ tự <paramref name="imagePaths"/> là thứ tự hiển thị.
    /// </summary>
    public static MaintenanceRequest Report(
        long contractId,
        string title,
        string description,
        MaintenanceUrgency urgency,
        IReadOnlyList<string> imagePaths,
        DateTimeOffset now) => new()
    {
        ContractId = contractId,
        Title = title,
        Description = description,
        Urgency = urgency,
        Status = MaintenanceRequestStatus.Moi,
        CreatedAt = now,
        Images = imagePaths
            .Select((path, index) => new MaintenanceRequestImage { Url = path, DisplayOrder = index })
            .ToList()
    };
}
