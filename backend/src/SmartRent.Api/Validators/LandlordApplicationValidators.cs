using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Đường dẫn ảnh sai hay không thuộc người nộp trả 422 ở LandlordApplicationService (api-design mục 3),
/// nên validator chỉ kiểm tra số CCCD.
/// </summary>
public class SubmitLandlordApplicationRequestValidator : AbstractValidator<SubmitLandlordApplicationRequest>
{
    public SubmitLandlordApplicationRequestValidator()
    {
        RuleFor(x => x.IdCardNumber)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Vui lòng nhập số CCCD.")
            // \z thay cho $: trong .NET, $ còn khớp ngay trước "\n" cuối chuỗi. [0-9] thay cho \d: \d nhận cả chữ số Unicode khác.
            .Matches(@"^[0-9]{12}\z").WithMessage("Số CCCD phải gồm đúng 12 chữ số.");
    }
}

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
