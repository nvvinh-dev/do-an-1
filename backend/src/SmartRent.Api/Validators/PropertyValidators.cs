using FluentValidation;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Enums;

namespace SmartRent.Api.Validators;

/// <summary>
/// Chỉ kiểm tra định dạng. Cặp tỉnh/thành – phường/xã có trong danh mục, tiện ích đúng phạm vi khu trọ
/// và ảnh (số lượng, chủ sở hữu, loại) là quy tắc nghiệp vụ, trả 422 ở PropertyService.
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
        RuleForEach(x => x.ImagePaths).NotEmpty();
    }
}

/// <summary>
/// Chỉ kiểm tra định dạng: trường bắt buộc và giới hạn của cột numeric (vượt thì PostgreSQL báo tràn số).
/// Diện tích, số người, giá, số khoản phí, tên phí trùng, tiện ích đúng phạm vi phòng và ảnh
/// là quy tắc nghiệp vụ, trả 422 ở PropertyService (api-design mục 5.2).
/// </summary>
public class RoomRequestValidator : AbstractValidator<RoomRequest>
{
    public RoomRequestValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Area).NotNull().PrecisionScale(8, 2, true);
        RuleFor(x => x.MaxOccupants).NotNull();
        RuleFor(x => x.RentPrice).NotNull().PrecisionScale(14, 2, true);
        RuleFor(x => x.ElectricityUnitPrice).NotNull().PrecisionScale(14, 2, true);
        RuleFor(x => x.WaterUnitPrice).NotNull().PrecisionScale(14, 2, true);
        RuleFor(x => x.Description).MaximumLength(2000);

        // ChildRules bỏ qua phần tử null, nên phải chặn null riêng.
        RuleForEach(x => x.ServiceFees).NotNull().ChildRules(fee =>
        {
            fee.RuleFor(f => f.Name).NotEmpty().MaximumLength(100);
            fee.RuleFor(f => f.Amount).NotNull().PrecisionScale(14, 2, true);
        });

        RuleForEach(x => x.ImagePaths).NotEmpty();
    }
}

public class RoomVisibilityRequestValidator : AbstractValidator<RoomVisibilityRequest>
{
    public RoomVisibilityRequestValidator()
    {
        // DaAnBoiAdmin chỉ Admin đặt được, ở Phase 2.
        RuleFor(x => x.VisibilityStatus)
            .Cascade(CascadeMode.Stop)
            .NotNull()
            .Must(v => v is RoomVisibilityStatus.DangHienThi or RoomVisibilityStatus.DaAnBoiChuTro)
            .WithMessage("Chỉ nhận DangHienThi hoặc DaAnBoiChuTro.");
    }
}

/// <summary>
/// Chỉ kiểm tra có giá trị và là một trạng thái có thật — JsonStringEnumConverter vẫn nhận số nguyên như 99.
/// Chuyển tiếp nào hợp lệ là quy tắc nghiệp vụ, trả 409 ở PropertyService.
/// </summary>
public class RoomOccupancyRequestValidator : AbstractValidator<RoomOccupancyRequest>
{
    public RoomOccupancyRequestValidator()
    {
        RuleFor(x => x.OccupancyStatus).Cascade(CascadeMode.Stop).NotNull().IsInEnum();
    }
}
