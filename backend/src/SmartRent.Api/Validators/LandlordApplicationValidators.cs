using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>Số không khớp số hiện tại của người nộp là quy tắc nghiệp vụ, trả 409 ở LandlordApplicationService (BR-01).</summary>
public class ApproveLandlordApplicationRequestValidator : AbstractValidator<ApproveLandlordApplicationRequest>
{
    public ApproveLandlordApplicationRequestValidator()
    {
        RuleFor(x => x.VerifiedPhoneNumber).NotEmpty().MaximumLength(20);
    }
}

public class RejectLandlordApplicationRequestValidator : AbstractValidator<RejectLandlordApplicationRequest>
{
    public RejectLandlordApplicationRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
