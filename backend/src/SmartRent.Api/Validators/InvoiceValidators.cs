using System.Text.RegularExpressions;
using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Thiếu trường bắt buộc, số sai định dạng hoặc số tiền có phần lẻ trả 400 (api-design mục 1). Loại dòng khác Điều chỉnh,
/// dòng thiếu mô tả, hóa đơn được điều chỉnh không thuộc hợp đồng, chỉ số nhỏ hơn chỉ số cũ, đường dẫn ảnh sai, tổng âm và
/// số tiền tính ra vượt cột tiền là quy tắc nghiệp vụ, trả 422 ở InvoiceService (api-design mục 9).
/// </summary>
public class PeriodicInvoiceRequestValidator : AbstractValidator<PeriodicInvoiceRequest>
{
    public PeriodicInvoiceRequestValidator()
    {
        RuleFor(x => x.CurrentElectricityIndex).NotNull().GreaterThanOrEqualTo(0).PrecisionScale(12, 2, true);
        RuleFor(x => x.CurrentWaterIndex).NotNull().GreaterThanOrEqualTo(0).PrecisionScale(12, 2, true);

        // ChildRules bỏ qua phần tử null, nên phải chặn null riêng.
        RuleForEach(x => x.AdjustmentLines).NotNull().ChildRules(line =>
        {
            line.RuleFor(l => l.Category).NotNull();

            // Số đồng nguyên, tối đa 12 chữ số như phần nguyên của cột tiền numeric(14,2).
            line.RuleFor(l => l.Amount).NotNull().PrecisionScale(12, 0, true);
            line.RuleFor(l => l.Description).MaximumLength(500);
        });
    }
}

/// <summary>Lý do được lưu vào hóa đơn và chép vào thông báo HoaDonBiHuy gửi người thuê, nên giới hạn độ dài.</summary>
public class CancelInvoiceRequestValidator : AbstractValidator<CancelInvoiceRequest>
{
    public CancelInvoiceRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

/// <summary><c>month</c> sai dạng <c>YYYY-MM</c> trả 400 (api-design mục 9).</summary>
public class InvoiceListFilterValidator : AbstractValidator<InvoiceListFilter>
{
    public InvoiceListFilterValidator()
    {
        // Mẫu giữ đúng 4 chữ số năm và 2 chữ số tháng; TryParseMonth loại tháng ngoài 01–12 và năm 0000.
        RuleFor(x => x.Month)
            .Must(month => Regex.IsMatch(month!, @"^\d{4}-\d{2}$") && InvoiceListFilter.TryParseMonth(month!, out _))
            .When(x => x.Month is not null)
            .WithMessage("Tháng phải có dạng YYYY-MM, ví dụ 2026-10.");
    }
}
