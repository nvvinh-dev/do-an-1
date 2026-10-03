using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Ràng buộc giá trị của điều khoản hợp đồng — sai trả 400 (api-design.md mục 8).
/// Ngày bắt đầu, ngày kết thúc và tổng số người ở là quy tắc nghiệp vụ, trả 422 ở ContractService.
/// </summary>
public class ContractTermsRequestValidator : AbstractValidator<ContractTermsRequest>
{
    public ContractTermsRequestValidator()
    {
        RuleFor(x => x.RentPrice).NotNull().GreaterThan(0);
        RuleFor(x => x.ElectricityUnitPrice).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.WaterUnitPrice).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.DepositAmount).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.InitialElectricityIndex).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.InitialWaterIndex).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.StartDate).NotNull();
        RuleFor(x => x.EndDate).NotNull();
        RuleFor(x => x.PaymentDueDays).NotNull().InclusiveBetween(1, 30);

        RuleForEach(x => x.ServiceFees).ChildRules(fee =>
        {
            fee.RuleFor(f => f.Name).NotEmpty();
            fee.RuleFor(f => f.Amount).NotNull().GreaterThanOrEqualTo(0);
        });

        // Số điện thoại người ở cùng theo cùng định dạng với số điện thoại tài khoản.
        RuleForEach(x => x.Occupants).ChildRules(occupant =>
        {
            occupant.RuleFor(o => o.FullName).NotEmpty();
            occupant.RuleFor(o => o.PhoneNumber).MaximumLength(20);
        });
    }
}

public class CreateContractRequestValidator : AbstractValidator<CreateContractRequest>
{
    public CreateContractRequestValidator()
    {
        Include(new ContractTermsRequestValidator());
        RuleFor(x => x.RentalRequestId).NotNull();
    }
}

public class UpdateContractRequestValidator : AbstractValidator<UpdateContractRequest>
{
    public UpdateContractRequestValidator()
    {
        Include(new ContractTermsRequestValidator());
    }
}

public class RequestContractChangesRequestValidator : AbstractValidator<RequestContractChangesRequest>
{
    public RequestContractChangesRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty();
    }
}

public class CancelContractRequestValidator : AbstractValidator<CancelContractRequest>
{
    public CancelContractRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty();
    }
}

/// <summary>Thời điểm nhận cọc sau thời điểm hiện tại là quy tắc nghiệp vụ, trả 422 ở ContractService.</summary>
public class ConfirmDepositRequestValidator : AbstractValidator<ConfirmDepositRequest>
{
    public ConfirmDepositRequestValidator()
    {
        RuleFor(x => x.ReceivedAt).NotNull();
        RuleFor(x => x.Method).NotNull().IsInEnum();
    }
}

/// <summary>Số tiền hoàn và lý do giữ lại cọc phụ thuộc bên hủy, kiểm tra ở ContractService (422).</summary>
public class RefundDepositRequestValidator : AbstractValidator<RefundDepositRequest>
{
    public RefundDepositRequestValidator()
    {
        RuleFor(x => x.RefundedAt).NotNull();
        RuleFor(x => x.RefundMethod).NotNull().IsInEnum();
    }
}

public class InitialMeterReadingsRequestValidator : AbstractValidator<InitialMeterReadingsRequest>
{
    public InitialMeterReadingsRequestValidator()
    {
        RuleFor(x => x.InitialElectricityIndex).NotNull().GreaterThanOrEqualTo(0);
        RuleFor(x => x.InitialWaterIndex).NotNull().GreaterThanOrEqualTo(0);
    }
}
