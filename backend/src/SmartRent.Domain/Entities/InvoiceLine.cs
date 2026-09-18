using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Khoản mục chi tiết của hóa đơn. Mọi khoản khấu trừ tiền cọc phải là một dòng riêng
/// có mô tả lý do — không cho phép khấu trừ một cục không giải thích.
/// </summary>
public class InvoiceLine
{
    public long Id { get; set; }

    public long InvoiceId { get; set; }

    public Invoice Invoice { get; set; } = null!;

    public InvoiceLineCategory Category { get; set; }

    /// <summary>Lý do của khoản mục. Bắt buộc.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Dương là khoản phải thu, âm là khoản trừ.</summary>
    public decimal Amount { get; set; }

    public string? EvidenceUrl { get; set; }
}
