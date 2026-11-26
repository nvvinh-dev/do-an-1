using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>Câu hỏi rỗng (kể cả chỉ có khoảng trắng) hoặc quá 300 ký tự trả 400 (FR-126, api-design mục 16).</summary>
public class InterpretRoomSearchRequestValidator : AbstractValidator<InterpretRoomSearchRequest>
{
    public const int MaxQueryLength = 300;

    public InterpretRoomSearchRequestValidator()
    {
        RuleFor(x => x.Query)
            .NotEmpty().WithMessage("Hãy nhập câu tìm phòng.")
            .MaximumLength(MaxQueryLength).WithMessage($"Câu tìm phòng tối đa {MaxQueryLength} ký tự.");
    }
}
