using SmartRent.Domain.Enums;

namespace SmartRent.Domain;

/// <summary>
/// Phạm vi dữ liệu và dẫn chiếu của trợ lý AI — FR-128, FR-129, FR-131 (BP-12). Server lấy dữ liệu theo quyền người
/// hỏi trước khi gọi AI ("lọc trước, sinh sau"), rồi chỉ giữ những bản ghi AI nhắc tới mà có trong dữ liệu đã gửi.
/// </summary>
public static class AssistantScope
{
    /// <summary>Câu hỏi không quá 500 ký tự (FR-131).</summary>
    public const int MaxQuestionLength = 500;

    /// <summary>Gửi tối đa 12 hóa đơn gần nhất (FR-128).</summary>
    public const int MaxInvoices = 12;

    /// <summary>Gửi tối đa 20 sự cố gần nhất (FR-128).</summary>
    public const int MaxMaintenanceRequests = 20;

    /// <summary>Sự cố chưa kết thúc, xếp trước khi chọn 20 sự cố gửi AI (FR-128).</summary>
    public static readonly MaintenanceRequestStatus[] OpenMaintenanceStatuses =
    [
        MaintenanceRequestStatus.Moi,
        MaintenanceRequestStatus.DangXuLy,
        MaintenanceRequestStatus.ChoNguoiThueXacNhan
    ];

    /// <summary>
    /// FR-129, BR-18: chuyển danh sách AI trả về thành dẫn chiếu, chỉ giữ bản ghi có trong <paramref name="sent"/> — dữ
    /// liệu server đã lọc theo quyền người hỏi và gửi cho AI. Loại không khớp đúng tên trong
    /// <see cref="AssistantReferenceType"/> (không phân biệt hoa thường, không nhận số) bị bỏ; bản ghi trùng chỉ giữ lần
    /// đầu, giữ thứ tự AI trả về.
    /// </summary>
    public static IReadOnlyList<AssistantReference> KeepSentReferences(
        IEnumerable<(string? Type, long Id)> proposed,
        IReadOnlySet<AssistantReference> sent)
    {
        var kept = new List<AssistantReference>();
        var seen = new HashSet<AssistantReference>();

        foreach (var (typeName, id) in proposed)
        {
            if (!TryParseType(typeName, out var type))
            {
                continue;
            }

            var reference = new AssistantReference(type, id);

            if (sent.Contains(reference) && seen.Add(reference))
            {
                kept.Add(reference);
            }
        }

        return kept;
    }

    private static bool TryParseType(string? name, out AssistantReferenceType type)
    {
        foreach (var value in Enum.GetValues<AssistantReferenceType>())
        {
            if (string.Equals(value.ToString(), name?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                type = value;
                return true;
            }
        }

        type = default;
        return false;
    }
}
