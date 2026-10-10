using FluentValidation;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Enums;

namespace SmartRent.Api.Validators;

/// <summary>Ngày trả phòng dự kiến trước hôm nay là quy tắc nghiệp vụ, trả 422 ở SettlementService.</summary>
public class SendMoveOutNoticeRequestValidator : AbstractValidator<SendMoveOutNoticeRequest>
{
    public SendMoveOutNoticeRequestValidator()
    {
        RuleFor(x => x.ExpectedMoveOutDate).NotNull();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

/// <summary>
/// Thiếu trường bắt buộc hoặc số sai định dạng trả 400. Quá 50 dòng, dòng thiếu mô tả (BR-22), loại dòng do hệ thống tự
/// thêm, phí phạt không hợp lệ, chỉ số nhỏ hơn chỉ số cũ, đường dẫn ảnh sai và số tiền tính ra vượt cột tiền là quy tắc
/// nghiệp vụ, trả 422 ở SettlementService (api-design mục 10).
/// </summary>
public class SettlementInvoiceRequestValidator : AbstractValidator<SettlementInvoiceRequest>
{
    public SettlementInvoiceRequestValidator()
    {
        RuleFor(x => x.CurrentElectricityIndex).NotNull().GreaterThanOrEqualTo(0).PrecisionScale(12, 2, true);
        RuleFor(x => x.CurrentWaterIndex).NotNull().GreaterThanOrEqualTo(0).PrecisionScale(12, 2, true);
        RuleFor(x => x.MoveOutDate).NotNull();

        // ChildRules bỏ qua phần tử null, nên phải chặn null riêng.
        RuleForEach(x => x.Lines).NotNull().ChildRules(line =>
        {
            line.RuleFor(l => l.Category).NotNull();
            line.RuleFor(l => l.Amount).NotNull().PrecisionScale(14, 2, true);
            line.RuleFor(l => l.Description).MaximumLength(500);
        });
    }
}

public class SettlementChangeRequestValidator : AbstractValidator<SettlementChangeRequest>
{
    public SettlementChangeRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

public class SettlementFinalizeRequestValidator : AbstractValidator<SettlementFinalizeRequest>
{
    public SettlementFinalizeRequestValidator()
    {
        RuleFor(x => x.Note).NotEmpty().MaximumLength(500);
    }
}

public class CompleteSettlementRequestValidator : AbstractValidator<CompleteSettlementRequest>
{
    public CompleteSettlementRequestValidator()
    {
        RuleFor(x => x.RoomNextStatus).NotNull();

        RuleFor(x => x.RoomNextStatus)
            .Must(status => status is RoomOccupancyStatus.Trong or RoomOccupancyStatus.BaoTri)
            .When(x => x.RoomNextStatus is not null)
            .WithMessage("Sau thanh lý, phòng chỉ chuyển sang Trống hoặc Bảo trì.");

        RuleFor(x => x.RefundMethod).IsInEnum();
    }
}
