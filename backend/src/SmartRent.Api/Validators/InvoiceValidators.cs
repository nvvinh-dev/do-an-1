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
