using System.Globalization;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.Domain;

/// <summary>
/// Dữ liệu gửi AI để giải thích điểm phù hợp ở ghép — FR-120, BR-19, BR-25. Điểm lấy từ
/// <see cref="RoommateMatching.Calculate"/>, AI chỉ diễn giải; mỗi tiêu chí kèm trọng số, điểm quy ra và giá trị của
/// hai bên. Chỉ gồm các trường tham gia tính điểm, đều thuộc phần không định danh của hồ sơ (FR-114): không có họ tên,
/// số điện thoại, email hay mã tài khoản. Bên gọi kiểm tra <see cref="RoommateMatching.CanMatch"/> trước.
/// </summary>
public static class RoommateMatchExplanation
{
    private static readonly CultureInfo Vietnamese = CultureInfo.GetCultureInfo("vi-VN");

    public static RoommateMatchFacts Build(RoommateProfile viewer, RoommateProfile candidate)
    {
        var score = RoommateMatching.Calculate(viewer, candidate);

        IReadOnlyList<RoommateCriterionFact> criteria =
        [
            Criterion("Ngân sách", RoommateMatching.BudgetWeight, score.Budget,
            [
                new("Ngân sách mỗi người mỗi tháng", Budget(viewer), Budget(candidate))
            ]),
            Criterion("Thói quen sinh hoạt", RoommateMatching.HabitsWeight, score.Habits,
            [
                new("Giờ ngủ", Label(viewer.SleepTime), Label(candidate.SleepTime)),
                new("Hút thuốc", YesNo(viewer.Smokes), YesNo(candidate.Smokes)),
                new("Nuôi thú cưng", YesNo(viewer.HasPet), YesNo(candidate.HasPet)),
                new("Nấu ăn", Label(viewer.Cooking), Label(candidate.Cooking)),
                new("Độ ồn", Label(viewer.NoiseLevel), Label(candidate.NoiseLevel))
            ]),
            Criterion("Khu vực", RoommateMatching.AreaWeight, score.Area,
            [
                new("Phường/xã mong muốn", Ward(viewer), Ward(candidate))
            ]),
            Criterion("Trường học hoặc nơi làm việc", RoommateMatching.OrganizationWeight, score.Organization,
            [
                new("Loại", Label(viewer.OccupationType), Label(candidate.OccupationType)),
                new("Trường hoặc công ty", viewer.OrganizationName, candidate.OrganizationName)
            ])
        ];

        return new RoommateMatchFacts(score.Score, viewer.City, criteria);
    }

    /// <summary>Điểm tiêu chí làm tròn 2 chữ số; điểm quy ra = trọng số × điểm tiêu chí, làm tròn 1 chữ số.</summary>
    private static RoommateCriterionFact Criterion(
        string name, decimal weight, decimal score, IReadOnlyList<RoommateFactItem> items)
        => new(
            name,
            weight,
            Math.Round(score, 2, MidpointRounding.AwayFromZero),
            Math.Round(weight * score, 1, MidpointRounding.AwayFromZero),
            items);

    private static string Budget(RoommateProfile profile)
        => profile.BudgetMin == profile.BudgetMax
            ? $"{Money(profile.BudgetMin)} đ"
            : $"{Money(profile.BudgetMin)} – {Money(profile.BudgetMax)} đ";

    private static string Money(decimal amount) => amount.ToString("#,##0", Vietnamese);

    private static string Ward(RoommateProfile profile) => profile.Ward ?? "Không chọn, ở đâu trong tỉnh/thành cũng được";

    private static string YesNo(bool value) => value ? "Có" : "Không";

    private static string Label(SleepTime value) => value switch
    {
        SleepTime.Truoc23Gio => "Trước 23 giờ",
        SleepTime.Tu23Den1Gio => "Từ 23 giờ tới 1 giờ",
        SleepTime.Sau1Gio => "Sau 1 giờ",
        _ => value.ToString()
    };

    private static string Label(CookingFrequency value) => value switch
    {
        CookingFrequency.ThuongXuyen => "Thường xuyên",
        CookingFrequency.ThinhThoang => "Thỉnh thoảng",
        CookingFrequency.Khong => "Không",
        _ => value.ToString()
    };

    private static string Label(NoiseLevel value) => value switch
    {
        NoiseLevel.YenTinh => "Yên tĩnh",
        NoiseLevel.BinhThuong => "Bình thường",
        NoiseLevel.On => "Ồn",
        _ => value.ToString()
    };

    private static string Label(OccupationType value) => value switch
    {
        OccupationType.SinhVien => "Sinh viên",
        OccupationType.DiLam => "Đi làm",
        _ => value.ToString()
    };
}

/// <summary>Điểm phù hợp (số nguyên phần trăm) và các tiêu chí đã tính, theo thứ tự trọng số của BR-19.</summary>
public record RoommateMatchFacts(int Score, string City, IReadOnlyList<RoommateCriterionFact> Criteria);

/// <summary>
/// Một tiêu chí: trọng số (phần trăm), điểm tiêu chí từ 0 tới 1, điểm quy ra trên thang 100 và giá trị của hai bên.
/// </summary>
public record RoommateCriterionFact(
    string Criterion,
    decimal Weight,
    decimal Score,
    decimal Points,
    IReadOnlyList<RoommateFactItem> Items);

/// <summary>Một mục so sánh: giá trị của người xem (<c>Mine</c>) và của hồ sơ ứng viên (<c>Theirs</c>).</summary>
public record RoommateFactItem(string Item, string Mine, string Theirs);
