using FluentValidation;
using SmartRent.Api.Contracts;
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
