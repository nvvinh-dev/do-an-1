using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Dữ liệu gửi AI để giải thích điểm phù hợp ở ghép — FR-120, BR-19, BR-25.</summary>
public class RoommateMatchExplanationTests
{
    private const string Hcm = "Thành phố Hồ Chí Minh";

    private static RoommateProfile Profile(
        string? ward = "Phường Linh Xuân",
        decimal budgetMin = 2_000_000,
        decimal budgetMax = 3_000_000,
        SleepTime sleep = SleepTime.Tu23Den1Gio,
        bool smokes = false,
        bool hasPet = false,
        CookingFrequency cooking = CookingFrequency.ThinhThoang,
        NoiseLevel noise = NoiseLevel.BinhThuong,
        OccupationType occupation = OccupationType.SinhVien,
        string organization = "Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM",
        string? schoolCode = "truong-dai-hoc-cong-nghe-thong-tin-dhqg-tp-hcm") => new()
    {
        TenantUserId = 1,
        Gender = Gender.Nam,
        PreferredRoommateGender = PreferredRoommateGender.KhongYeuCau,
        City = Hcm,
        Ward = ward,
        BudgetMin = budgetMin,
        BudgetMax = budgetMax,
        SleepTime = sleep,
        Smokes = smokes,
        HasPet = hasPet,
        Cooking = cooking,
        NoiseLevel = noise,
        OccupationType = occupation,
        OrganizationName = organization,
        SchoolCode = schoolCode
    };

    /// <summary>
    /// Ngân sách 2–3 triệu và 2,5–4 triệu trùng 0,5 triệu trên khoảng hẹp 1 triệu → 0,5 × 30 = 15. Thói quen: giờ ngủ
    /// lệch một bậc 0,5, hút thuốc khác 0, thú cưng 1, nấu ăn 1, độ ồn lệch một bậc 0,5 → 0,6 × 30 = 18. Khác phường
    /// 0,5 × 25 = 12,5. Cùng là sinh viên, khác trường 0,5 × 15 = 7,5. Tổng 53.
    /// </summary>
    private static readonly RoommateProfile Candidate = Profile(
        ward: "Phường Linh Trung",
        budgetMin: 2_500_000,
        budgetMax: 4_000_000,
        sleep: SleepTime.Sau1Gio,
        smokes: true,
        noise: NoiseLevel.YenTinh,
        organization: "Trường Đại học Bách khoa – ĐHQG TP.HCM",
        schoolCode: "truong-dai-hoc-bach-khoa-dhqg-tp-hcm");

    [Fact]
    public void Build_DiemTongLayTuCongThuc_ChuaTungTieuChiTheoTrongSo()
    {
        var facts = RoommateMatchExplanation.Build(Profile(), Candidate);

        Assert.Equal(53, facts.TotalScore);
        Assert.Equal(RoommateMatching.Calculate(Profile(), Candidate).Score, facts.TotalScore);
        Assert.Equal(Hcm, facts.City);
        Assert.Equal(
            [
                ("Ngân sách", 30m, 0.5m, 15m),
                ("Thói quen sinh hoạt", 30m, 0.6m, 18m),
                ("Khu vực", 25m, 0.5m, 12.5m),
                ("Trường học hoặc nơi làm việc", 15m, 0.5m, 7.5m)
            ],
            facts.Criteria.Select(c => (c.Criterion, c.Weight, c.Score, c.Points)));
    }

    [Fact]
    public void Build_GiaTriHaiBenVietBangChuNguoiDungDoc()
    {
        var facts = RoommateMatchExplanation.Build(Profile(), Candidate);
        var items = facts.Criteria.SelectMany(c => c.Items).ToDictionary(i => i.Item);

        Assert.Equal(("2.000.000 – 3.000.000 đ", "2.500.000 – 4.000.000 đ"),
            (items["Ngân sách mỗi người mỗi tháng"].Mine, items["Ngân sách mỗi người mỗi tháng"].Theirs));
        Assert.Equal(("Từ 23 giờ tới 1 giờ", "Sau 1 giờ"), (items["Giờ ngủ"].Mine, items["Giờ ngủ"].Theirs));
        Assert.Equal(("Không", "Có"), (items["Hút thuốc"].Mine, items["Hút thuốc"].Theirs));
        Assert.Equal(("Thỉnh thoảng", "Thỉnh thoảng"), (items["Nấu ăn"].Mine, items["Nấu ăn"].Theirs));
        Assert.Equal(("Bình thường", "Yên tĩnh"), (items["Độ ồn"].Mine, items["Độ ồn"].Theirs));
        Assert.Equal(("Phường Linh Xuân", "Phường Linh Trung"),
            (items["Phường/xã mong muốn"].Mine, items["Phường/xã mong muốn"].Theirs));
        Assert.Equal(("Sinh viên", "Sinh viên"), (items["Loại"].Mine, items["Loại"].Theirs));
        Assert.Equal("Trường Đại học Bách khoa – ĐHQG TP.HCM", items["Trường hoặc công ty"].Theirs);
    }

    [Fact]
    public void Build_DiemLeLamTronHaiChuSo_DiemQuyRaMotChuSo()
    {
        // Trùng 1 triệu trên khoảng hẹp 3 triệu → 1/3: điểm 0,33, quy ra 30 × 1/3 = 10,0.
        var facts = RoommateMatchExplanation.Build(
            Profile(budgetMin: 1_000_000, budgetMax: 4_000_000),
            Profile(budgetMin: 3_000_000, budgetMax: 6_000_000));

        var budget = facts.Criteria[0];

        Assert.Equal(0.33m, budget.Score);
        Assert.Equal(10.0m, budget.Points);
    }

    [Fact]
    public void Build_NganSachMotSo_KhongChonPhuong_VietRo()
    {
        var facts = RoommateMatchExplanation.Build(
            Profile(ward: null, budgetMin: 2_500_000, budgetMax: 2_500_000),
            Profile());
        var items = facts.Criteria.SelectMany(c => c.Items).ToDictionary(i => i.Item);

        Assert.Equal("2.500.000 đ", items["Ngân sách mỗi người mỗi tháng"].Mine);
        Assert.StartsWith("Không chọn", items["Phường/xã mong muốn"].Mine);
        Assert.Equal(25m, facts.Criteria[2].Points);
    }

    [Fact]
    public void Build_KhongCoTruongDinhDanh()
    {
        // BR-25: kiểu dữ liệu gửi AI không có chỗ cho họ tên, số điện thoại, email hay mã tài khoản.
        var names = new[] { typeof(RoommateMatchFacts), typeof(RoommateCriterionFact), typeof(RoommateFactItem) }
            .SelectMany(t => t.GetProperties())
            .Select(p => p.Name)
            .ToHashSet();

        Assert.True(names.SetEquals(
            ["TotalScore", "City", "Criteria", "Score", "Criterion", "Weight", "Points", "Items", "Item", "Mine", "Theirs"]));
    }
}
