using FluentValidation;
using SmartRent.Api.Contracts;
using SmartRent.Domain;

namespace SmartRent.Api.Validators;

/// <summary>Câu hỏi không rỗng, không quá 500 ký tự (FR-131, api-design mục 16).</summary>
public class AskAssistantRequestValidator : AbstractValidator<AskAssistantRequest>
{
    public AskAssistantRequestValidator()
    {
        RuleFor(x => x.Question).NotEmpty().MaximumLength(AssistantScope.MaxQuestionLength);
    }
}
