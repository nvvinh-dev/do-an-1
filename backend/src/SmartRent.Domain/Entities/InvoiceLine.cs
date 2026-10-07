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

    /// <summary>
    /// Hóa đơn gốc cùng hợp đồng. Bắt buộc với CongNoKyTruoc; với DieuChinhKhac khi dòng
    /// điều chỉnh sai sót của một hóa đơn trước (BR-16).
    /// </summary>
    public long? RelatedInvoiceId { get; set; }

    public Invoice? RelatedInvoice { get; set; }

    /// <summary>
    /// Hóa đơn định kỳ chỉ nhận dòng DieuChinhKhac; các loại còn lại chỉ dùng trong hóa đơn thanh lý (FR-41).
    /// </summary>
    public static bool IsAllowedOnPeriodicInvoice(InvoiceLineCategory category)
        => category == InvoiceLineCategory.DieuChinhKhac;

    /// <summary>
    /// Chủ trọ chỉ gửi được dòng bồi thường hư hỏng, phí phạt và điều chỉnh vào hóa đơn thanh lý; dòng công nợ kỳ trước
    /// và dòng trừ tiền cọc do hệ thống tự thêm, Chủ trọ gửi thì service trả 422 (FR-55, api-design mục 10).
    /// </summary>
    public static bool IsAllowedFromLandlordOnSettlement(InvoiceLineCategory category)
        => category is InvoiceLineCategory.BoiThuongHuHong or InvoiceLineCategory.PhiPhat or InvoiceLineCategory.DieuChinhKhac;
}
