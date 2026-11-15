using SmartRent.Domain.Entities;

namespace SmartRent.Domain;

/// <summary>
/// Kết quả tính hóa đơn thanh lý: danh sách dòng cuối cùng theo thứ tự FR-55 — công nợ kỳ trước, các khoản Chủ trọ gửi,
/// dòng trừ tiền cọc — và các khoản tiền tính từ chính danh sách đó, nên tổng luôn khớp với các dòng được lưu.
/// </summary>
public sealed record SettlementInvoiceCalculation(IReadOnlyList<InvoiceLine> Lines, SettlementInvoiceAmounts Amounts);
