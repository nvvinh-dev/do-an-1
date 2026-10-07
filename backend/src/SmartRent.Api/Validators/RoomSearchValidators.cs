using FluentValidation;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Validators;

/// <summary>
/// Các trường hợp 400 của GET /rooms/search (api-design mục 6). Tỉnh/thành, phường/xã không có trong danh mục
/// và tiện ích không tồn tại không phải lỗi — chỉ là không có phòng nào khớp.
/// </summary>
public class RoomSearchQueryValidator : AbstractValidator<RoomSearchQuery>
{
    private static readonly string[] SortFields = ["price", "area"];

    private static readonly string[] SortDirections = ["asc", "desc"];

    public RoomSearchQueryValidator()
    {
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).WithMessage("Giá thấp nhất không được âm.");
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).WithMessage("Giá cao nhất không được âm.");
        RuleFor(x => x.MinArea).GreaterThanOrEqualTo(0).WithMessage("Diện tích nhỏ nhất không được âm.");
        RuleFor(x => x.MaxArea).GreaterThanOrEqualTo(0).WithMessage("Diện tích lớn nhất không được âm.");
        RuleFor(x => x.MinOccupants).GreaterThanOrEqualTo(1).WithMessage("Số người phải từ 1 trở lên.");

        RuleFor(x => x.MaxPrice)
            .Must((query, max) => max >= query.MinPrice)
            .When(x => x.MinPrice is not null && x.MaxPrice is not null)
            .WithMessage("Giá thấp nhất không được lớn hơn giá cao nhất.");

        RuleFor(x => x.MaxArea)
            .Must((query, max) => max >= query.MinArea)
            .When(x => x.MinArea is not null && x.MaxArea is not null)
            .WithMessage("Diện tích nhỏ nhất không được lớn hơn diện tích lớn nhất.");

        // Tên phường/xã trùng nhau giữa các tỉnh, nên lọc theo phường/xã phải kèm tỉnh/thành.
        RuleFor(x => x.City)
            .NotEmpty()
            .When(x => !string.IsNullOrWhiteSpace(x.Ward))
            .WithMessage("Lọc theo phường/xã phải chọn kèm tỉnh/thành.");

        RuleFor(x => x.SortBy)
            .Must(v => SortFields.Contains(v, StringComparer.OrdinalIgnoreCase))
            .When(x => x.SortBy is not null)
            .WithMessage("sortBy chỉ nhận price hoặc area.");

        RuleFor(x => x.SortDirection)
            .Must(v => SortDirections.Contains(v, StringComparer.OrdinalIgnoreCase))
            .When(x => x.SortDirection is not null)
            .WithMessage("sortDirection chỉ nhận asc hoặc desc.");
    }
}
