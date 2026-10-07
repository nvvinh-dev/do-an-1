using FluentValidation;
using SmartRent.Api.Contracts;

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
