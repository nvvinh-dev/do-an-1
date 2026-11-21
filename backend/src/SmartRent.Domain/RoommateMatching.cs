using System.Text;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.Domain;

/// <summary>
/// Điểm phù hợp ở ghép giữa hai hồ sơ — BR-19, FR-108 đến FR-113. Công thức trọng số cố định do hệ thống tính, không
/// do AI. Giới tính và tỉnh/thành là điều kiện lọc cứng (<see cref="CanMatch"/>), không tham gia tính điểm; bên gọi lọc
/// trước rồi mới gọi <see cref="Calculate"/>. Điểm đối xứng: đổi chỗ hai hồ sơ cho cùng kết quả.
/// </summary>
public static class RoommateMatching
{
    public const decimal BudgetWeight = 30;
    public const decimal HabitsWeight = 30;
    public const decimal AreaWeight = 25;
    public const decimal OrganizationWeight = 15;

    /// <summary>Danh sách ứng viên có tối đa 20 hồ sơ (FR-113).</summary>
    public const int MaxCandidates = 20;

    private const int HabitItemCount = 5;

    /// <summary>
    /// FR-113: xếp hạng ứng viên của <paramref name="viewer"/>. Bỏ hồ sơ của chính người xem, hồ sơ không được liệt kê
    /// (<see cref="RoommateProfile.IsListedAsCandidate"/>) và hồ sơ không qua lọc cứng (<see cref="CanMatch"/>); điểm
    /// cao trước, cùng điểm thì hồ sơ sửa gần hơn trước, rồi id lớn hơn trước cho thứ tự ổn định; lấy tối đa
    /// <see cref="MaxCandidates"/>. Các điều kiện cần database — tài khoản bị khóa, hợp đồng Đang hiệu lực, lời mời,
    /// chặn — do bên gọi lọc trước.
    /// </summary>
    public static IReadOnlyList<RoommateMatch> Rank(RoommateProfile viewer, IEnumerable<RoommateProfile> candidates)
        => candidates
            .Where(c => c.TenantUserId != viewer.TenantUserId && c.IsListedAsCandidate && CanMatch(viewer, c))
            .Select(c => new RoommateMatch(c, Calculate(viewer, c)))
            .OrderByDescending(m => m.Score.Score)
            .ThenByDescending(m => m.Profile.UpdatedAt)
            .ThenByDescending(m => m.Profile.Id)
            .Take(MaxCandidates)
            .ToList();

    /// <summary>
    /// FR-108, FR-109: yêu cầu giới tính của mỗi bên chấp nhận giới tính của bên kia, và hai bên cùng tỉnh/thành.
    /// </summary>
    public static bool CanMatch(RoommateProfile a, RoommateProfile b)
        => Accepts(a.PreferredRoommateGender, b.Gender)
           && Accepts(b.PreferredRoommateGender, a.Gender)
           && string.Equals(a.City, b.City, StringComparison.Ordinal);

    /// <summary>FR-113: điểm từng tiêu chí và tổng có trọng số, làm tròn tới số nguyên phần trăm.</summary>
    public static RoommateMatchScore Calculate(RoommateProfile a, RoommateProfile b)
    {
        var budget = BudgetScore(a, b);
        var habits = HabitsScore(a, b);
        var area = AreaScore(a, b);
        var organization = OrganizationScore(a, b);

        var total = BudgetWeight * budget
                    + HabitsWeight * habits
                    + AreaWeight * area
                    + OrganizationWeight * organization;

        var score = (int)Math.Round(total, MidpointRounding.AwayFromZero);

        return new RoommateMatchScore(score, budget, habits, area, organization);
    }

    /// <summary>
    /// FR-110: độ dài phần trùng nhau của hai khoảng chia cho độ dài khoảng hẹp hơn; không trùng thì 0. Khoảng hẹp
    /// hơn chỉ là một số thì được 1 nếu số đó nằm trong khoảng kia (kể cả hai đầu), ngược lại 0.
    /// </summary>
    public static decimal BudgetScore(RoommateProfile a, RoommateProfile b)
    {
        var lengthA = a.BudgetMax - a.BudgetMin;
        var lengthB = b.BudgetMax - b.BudgetMin;
        var (narrow, wide) = lengthA <= lengthB ? (a, b) : (b, a);
        var narrowLength = Math.Min(lengthA, lengthB);

        if (narrowLength == 0)
        {
            return narrow.BudgetMin >= wide.BudgetMin && narrow.BudgetMin <= wide.BudgetMax ? 1m : 0m;
        }

        var overlap = Math.Min(a.BudgetMax, b.BudgetMax) - Math.Max(a.BudgetMin, b.BudgetMin);

        return overlap <= 0 ? 0m : overlap / narrowLength;
    }

    /// <summary>
    /// FR-111: trung bình năm mục. Mục ba bậc giống nhau được 1, lệch một bậc 0,5, lệch hai bậc 0; mục có/không giống
    /// nhau được 1, khác 0.
    /// </summary>
    public static decimal HabitsScore(RoommateProfile a, RoommateProfile b)
    {
        var sum = LevelScore((int)a.SleepTime, (int)b.SleepTime)
                  + YesNoScore(a.Smokes, b.Smokes)
                  + YesNoScore(a.HasPet, b.HasPet)
                  + LevelScore((int)a.Cooking, (int)b.Cooking)
                  + LevelScore((int)a.NoiseLevel, (int)b.NoiseLevel);

        return sum / HabitItemCount;
    }

    /// <summary>
    /// FR-109: cùng phường/xã, hoặc một bên không chọn phường/xã, được 1; khác phường/xã được 0,5. Chỉ gọi khi hai
    /// hồ sơ cùng tỉnh/thành (<see cref="CanMatch"/>).
    /// </summary>
    public static decimal AreaScore(RoommateProfile a, RoommateProfile b)
        => a.Ward is null || b.Ward is null || string.Equals(a.Ward, b.Ward, StringComparison.Ordinal) ? 1m : 0.5m;

    /// <summary>
    /// FR-112: cùng loại và cùng tên được 1, cùng loại khác tên 0,5, khác loại 0. Tên so không phân biệt hoa thường,
    /// bỏ khoảng trắng thừa.
    /// </summary>
    public static decimal OrganizationScore(RoommateProfile a, RoommateProfile b)
    {
        if (a.OccupationType != b.OccupationType)
        {
            return 0m;
        }

        return NormalizeName(a.OrganizationName) == NormalizeName(b.OrganizationName) ? 1m : 0.5m;
    }

    private static bool Accepts(PreferredRoommateGender preferred, Gender gender) => preferred switch
    {
        PreferredRoommateGender.KhongYeuCau => true,
        PreferredRoommateGender.ChiNam => gender == Gender.Nam,
        PreferredRoommateGender.ChiNu => gender == Gender.Nu,
        _ => false
    };

    /// <summary>Giá trị enum của các mục ba bậc khai báo đúng thứ tự bậc, nên lệch bậc là hiệu hai giá trị.</summary>
    private static decimal LevelScore(int a, int b) => Math.Abs(a - b) switch
    {
        0 => 1m,
        1 => 0.5m,
        _ => 0m
    };

    private static decimal YesNoScore(bool a, bool b) => a == b ? 1m : 0m;

    private static string NormalizeName(string name)
        => string.Join(' ', name.Normalize(NormalizationForm.FormC)
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
            .ToLowerInvariant();
}

/// <summary>
/// Điểm phù hợp (số nguyên phần trăm) và điểm từng tiêu chí từ 0 tới 1 — trường <c>score</c> và <c>scores</c> của
/// <c>GET /roommate-profiles/matches</c> (api-design mục 15).
/// </summary>
public record RoommateMatchScore(int Score, decimal Budget, decimal Habits, decimal Area, decimal Organization);

/// <summary>Một ứng viên trong danh sách ứng viên kèm điểm phù hợp với người xem (FR-113).</summary>
public record RoommateMatch(RoommateProfile Profile, RoommateMatchScore Score);
