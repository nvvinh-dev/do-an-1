using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Chỉ kiểm tra định dạng. Ngày vào ở so với hôm nay và số người so với số người tối đa của phòng
/// là quy tắc nghiệp vụ, trả 422 ở RentalRequestService.
/// </summary>
public class SubmitRentalRequestRequestValidator : AbstractValidator<SubmitRentalRequestRequest>
{
    public SubmitRentalRequestRequestValidator()
    {
        RuleFor(x => x.ExpectedMoveInDate).NotNull();
        RuleFor(x => x.ExpectedOccupants).NotNull();
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public class RejectRentalRequestRequestValidator : AbstractValidator<RejectRentalRequestRequest>
{
    public RejectRentalRequestRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty();
    }
}
