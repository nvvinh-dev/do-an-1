using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

public class LockUserRequestValidator : AbstractValidator<LockUserRequest>
{
    public LockUserRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
