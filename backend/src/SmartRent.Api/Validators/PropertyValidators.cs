using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Chỉ kiểm tra định dạng. Cặp tỉnh/thành – phường/xã có trong danh mục và tiện ích đúng phạm vi khu trọ
/// là quy tắc nghiệp vụ, trả 422 ở PropertyService.
/// </summary>
public class PropertyRequestValidator : AbstractValidator<PropertyRequest>
{
    public PropertyRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Address).NotEmpty().MaximumLength(500);
        RuleFor(x => x.City).NotEmpty();
        RuleFor(x => x.Ward).NotEmpty();
        RuleFor(x => x.Description).MaximumLength(2000);
    }
}
