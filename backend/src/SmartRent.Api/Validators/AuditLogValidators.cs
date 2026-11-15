using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

public class AuditLogFilterValidator : AbstractValidator<AuditLogFilter>
{
    public AuditLogFilterValidator()
    {
        RuleFor(x => x.To)
            .Must((filter, to) => to >= filter.From)
            .When(x => x.From is not null && x.To is not null)
            .WithMessage("Thời điểm kết thúc không được trước thời điểm bắt đầu.");
    }
}
