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
    /// FR-143, FR-144: 7 ngày tính đủ giờ kể từ lần báo sửa xong gần nhất — quá mốc này Người thuê không báo
    /// Chưa đạt được nữa và hệ thống tự đóng (kiến trúc mục 7.1).
    /// </summary>
    public static readonly TimeSpan ConfirmationWindow = TimeSpan.FromHours(168);

    /// <summary>BP-08 A4: sự cố ở Mới quá 72 giờ thì Người thuê được nhắc liên hệ trực tiếp Chủ trọ.</summary>
    public static readonly TimeSpan AcceptanceWindow = TimeSpan.FromHours(72);

    /// <summary>Hạn Người thuê xác nhận; chỉ có nghĩa khi sự cố đang Chờ người thuê xác nhận.</summary>
    public DateTimeOffset? ConfirmationDeadline => CompletedAt + ConfirmationWindow;

    public bool CanAccept => Status == MaintenanceRequestStatus.Moi;

    public bool CanChangeExpectedCompletionDate => Status == MaintenanceRequestStatus.DangXuLy;

    public bool CanReject => Status is MaintenanceRequestStatus.Moi or MaintenanceRequestStatus.DangXuLy;

    public bool CanComplete => Status == MaintenanceRequestStatus.DangXuLy;

    /// <summary>Quá hạn xác nhận mà tác vụ định kỳ chưa kịp tự đóng thì vẫn xác nhận được (api-design mục 18).</summary>
    public bool CanConfirm => Status == MaintenanceRequestStatus.ChoNguoiThueXacNhan;

    /// <summary>FR-143: quá 168 giờ kể từ lần báo sửa xong gần nhất thì không báo Chưa đạt được, dù tác vụ chưa chạy.</summary>
    public bool CanMarkNotFixed(DateTimeOffset now)
        => Status == MaintenanceRequestStatus.ChoNguoiThueXacNhan && now <= ConfirmationDeadline;

    public bool CanCancel => Status is MaintenanceRequestStatus.Moi or MaintenanceRequestStatus.DangXuLy;

    /// <summary>FR-144: tác vụ định kỳ tự đóng sự cố Chờ người thuê xác nhận đã quá 168 giờ.</summary>
    public bool ShouldAutoClose(DateTimeOffset now)
        => Status == MaintenanceRequestStatus.ChoNguoiThueXacNhan && now > ConfirmationDeadline;

    /// <summary>BP-08 A4: sự cố vẫn ở Mới sau 72 giờ kể từ lúc gửi.</summary>
    public bool IsOverdueForAcceptance(DateTimeOffset now)
        => Status == MaintenanceRequestStatus.Moi && now > CreatedAt + AcceptanceWindow;

    /// <summary>FR-140: Mới → Đang xử lý. Ngày dự kiến được null; không trước hôm nay do validator kiểm.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanAccept"/> sai — lỗi lập trình.</exception>
    public void Accept(DateOnly? expectedCompletionDate, DateTimeOffset now)
    {
        EnsureAllowed(CanAccept, nameof(Accept));

        Status = MaintenanceRequestStatus.DangXuLy;
        AcceptedAt ??= now;
        ExpectedCompletionDate = expectedCompletionDate;
    }

    /// <summary>FR-140: sửa ngày dự kiến khi Đang xử lý; trạng thái giữ nguyên.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanChangeExpectedCompletionDate"/> sai — lỗi lập trình.</exception>
    public void ChangeExpectedCompletionDate(DateOnly? expectedCompletionDate)
    {
        EnsureAllowed(CanChangeExpectedCompletionDate, nameof(ChangeExpectedCompletionDate));

        ExpectedCompletionDate = expectedCompletionDate;
    }

    /// <summary>FR-141: Mới / Đang xử lý → Từ chối, ghi lý do và bồi thường dự kiến (được null).</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanReject"/> sai — lỗi lập trình.</exception>
    public void Reject(string reason, decimal? estimatedCompensation, DateTimeOffset now)
    {
        EnsureAllowed(CanReject, nameof(Reject));

        Status = MaintenanceRequestStatus.TuChoi;
        RejectionReason = reason;
        EstimatedCompensation = estimatedCompensation;
        RejectedAt = now;
    }

    /// <summary>FR-142: Đang xử lý → Chờ người thuê xác nhận; mốc 168 giờ tính lại từ lần báo này.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanComplete"/> sai — lỗi lập trình.</exception>
    public void Complete(DateTimeOffset now)
    {
        EnsureAllowed(CanComplete, nameof(Complete));

        Status = MaintenanceRequestStatus.ChoNguoiThueXacNhan;
        CompletedAt = now;
    }

    /// <summary>
    /// FR-143: Chờ người thuê xác nhận → Đã đóng. Đã quá hạn xác nhận thì kết quả giống tự đóng (api-design mục 18).
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanConfirm"/> sai — lỗi lập trình.</exception>
    public void Confirm(DateTimeOffset now)
    {
        EnsureAllowed(CanConfirm, nameof(Confirm));

        Close(isAutoClosed: now > ConfirmationDeadline, now);
    }

    /// <summary>FR-143: Chờ người thuê xác nhận → Đang xử lý, ghi đè lý do Chưa đạt gần nhất.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanMarkNotFixed"/> sai — lỗi lập trình.</exception>
    public void MarkNotFixed(string reason, DateTimeOffset now)
    {
        EnsureAllowed(CanMarkNotFixed(now), nameof(MarkNotFixed));

        Status = MaintenanceRequestStatus.DangXuLy;
        NotFixedReason = reason;
    }

    /// <summary>FR-145: Mới / Đang xử lý → Đã hủy.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanCancel"/> sai — lỗi lập trình.</exception>
    public void Cancel(DateTimeOffset now)
    {
        EnsureAllowed(CanCancel, nameof(Cancel));

        Status = MaintenanceRequestStatus.DaHuy;
        CancelledAt = now;
    }

    /// <summary>FR-144: tác vụ định kỳ tự đóng.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="ShouldAutoClose"/> sai — lỗi lập trình.</exception>
    public void AutoClose(DateTimeOffset now)
    {
        EnsureAllowed(ShouldAutoClose(now), nameof(AutoClose));

        Close(isAutoClosed: true, now);
    }

    private void Close(bool isAutoClosed, DateTimeOffset now)
    {
        Status = MaintenanceRequestStatus.DaDong;
        ClosedAt = now;
        IsAutoClosed = isAutoClosed;
    }

    /// <summary>
    /// Service phải kiểm tra điều kiện bằng các hàm Can.../Should... và trả 409 (hoặc bỏ qua, với tác vụ định kỳ)
    /// trước khi đổi trạng thái; tới được đây mà điều kiện sai là lỗi lập trình, không phải lỗi nghiệp vụ.
    /// </summary>
    private void EnsureAllowed(bool allowed, string operation)
    {
        if (!allowed)
        {
            throw new InvalidOperationException($"Sự cố {Id} ở trạng thái {Status}: không thực hiện được {operation}.");
        }
    }

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
