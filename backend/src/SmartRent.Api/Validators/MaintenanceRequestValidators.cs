using FluentValidation;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;

namespace SmartRent.Api.Validators;

/// <summary>
/// Chỉ kiểm tra định dạng (api-design mục 18). Hợp đồng của người gọi, trạng thái hợp đồng và ảnh do chính
/// Người thuê tải lên là quy tắc nghiệp vụ, kiểm ở MaintenanceRequestService.
/// </summary>
public class ReportMaintenanceRequestRequestValidator : AbstractValidator<ReportMaintenanceRequestRequest>
{
    public ReportMaintenanceRequestRequestValidator()
    {
        RuleFor(x => x.ContractId).NotNull();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Urgency).NotNull().IsInEnum();
        RuleFor(x => x.ImagePaths!.Count)
            .LessThanOrEqualTo(MaintenanceRequest.MaxImages)
            .When(x => x.ImagePaths is not null)
            .WithName("imagePaths")
            .WithMessage($"Tối đa {MaintenanceRequest.MaxImages} ảnh.");
        RuleForEach(x => x.ImagePaths).NotEmpty();
    }
}

/// <summary>Ngày dự kiến sửa xong được null; có giá trị thì không trước hôm nay theo giờ Việt Nam (FR-140).</summary>
public class MaintenanceExpectedCompletionDateRequestValidator
    : AbstractValidator<MaintenanceExpectedCompletionDateRequest>
{
    public MaintenanceExpectedCompletionDateRequestValidator()
    {
        RuleFor(x => x.ExpectedCompletionDate)
            .Must(date => date >= VietnamTime.DateOf(DateTimeOffset.UtcNow))
            .When(x => x.ExpectedCompletionDate is not null)
            .WithMessage("Ngày dự kiến sửa xong không được trước hôm nay.");
    }
}

public class RejectMaintenanceRequestRequestValidator : AbstractValidator<RejectMaintenanceRequestRequest>
{
    public RejectMaintenanceRequestRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);

        // Số đồng nguyên lớn hơn 0, tối đa 12 chữ số như phần nguyên của cột tiền numeric(14,2) (api-design mục 1).
        RuleFor(x => x.EstimatedCompensation).GreaterThan(0).PrecisionScale(12, 0, true);
    }
}

public class MaintenanceNotFixedRequestValidator : AbstractValidator<MaintenanceNotFixedRequest>
{
    public MaintenanceNotFixedRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
