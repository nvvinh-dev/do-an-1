using FluentValidation;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;

namespace SmartRent.Api.Validators;

/// <summary>
/// Chỉ kiểm tra định dạng (api-design mục 15). Cặp tỉnh/thành – phường/xã có trong danh mục (422) và hợp đồng
/// Đang hiệu lực (409) là quy tắc nghiệp vụ, kiểm ở RoommateProfileService.
/// </summary>
public class RoommateProfileRequestValidator : AbstractValidator<RoommateProfileRequest>
{
    public RoommateProfileRequestValidator()
    {
        // FR-105: không được trước hôm nay theo giờ Việt Nam, khi tạo cũng như khi sửa.
        RuleFor(x => x.MoveInFrom)
            .NotNull()
            .Must(date => date >= VietnamTime.DateOf(DateTimeOffset.UtcNow))
            .When(x => x.MoveInFrom is not null, ApplyConditionTo.CurrentValidator)
            .WithMessage("Thời điểm chuyển vào không được trước hôm nay.");

        RuleFor(x => x.Visibility).NotNull().IsInEnum();
        RuleFor(x => x.Gender).NotNull().IsInEnum();
        RuleFor(x => x.PreferredRoommateGender).NotNull().IsInEnum();

        RuleFor(x => x.City).NotEmpty();
        RuleFor(x => x.Ward).NotEmpty().When(x => x.Ward is not null);

        // FR-110: đồng nguyên, 0 < tối thiểu ≤ tối đa; tối đa 12 chữ số như phần nguyên của cột numeric(14,2).
        RuleFor(x => x.BudgetMin).NotNull().GreaterThan(0).PrecisionScale(12, 0, true);
        RuleFor(x => x.BudgetMax)
            .NotNull()
            .PrecisionScale(12, 0, true)
            .GreaterThanOrEqualTo(x => x.BudgetMin)
            .When(x => x.BudgetMin is not null, ApplyConditionTo.CurrentValidator)
            .WithMessage("Ngân sách tối đa không được nhỏ hơn ngân sách tối thiểu.");

        RuleFor(x => x.SleepTime).NotNull().IsInEnum();
        RuleFor(x => x.Smokes).NotNull();
        RuleFor(x => x.HasPet).NotNull();
        RuleFor(x => x.Cooking).NotNull().IsInEnum();
        RuleFor(x => x.NoiseLevel).NotNull().IsInEnum();

        RuleFor(x => x.OccupationType).NotNull().IsInEnum();
        RuleFor(x => x.OrganizationName)
            .NotEmpty()
            .Must(name => name.Trim().Length <= RoommateProfile.MaxOrganizationNameLength)
            .When(x => x.OrganizationName is not null, ApplyConditionTo.CurrentValidator)
            .WithMessage($"Tên trường hoặc công ty tối đa {RoommateProfile.MaxOrganizationNameLength} ký tự.");
    }
}

public class RoommateSearchingRequestValidator : AbstractValidator<RoommateSearchingRequest>
{
    public RoommateSearchingRequestValidator()
    {
        RuleFor(x => x.IsSearching).NotNull();
    }
}
