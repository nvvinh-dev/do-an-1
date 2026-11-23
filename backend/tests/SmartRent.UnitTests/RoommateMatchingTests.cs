using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Điểm phù hợp ở ghép — BR-19, FR-108 đến FR-113.</summary>
public class RoommateMatchingTests
{
    private const string Hcm = "Thành phố Hồ Chí Minh";
    private const string HaNoi = "Thành phố Hà Nội";

    private static RoommateProfile Profile(
        Gender gender = Gender.Nam,
        PreferredRoommateGender preferred = PreferredRoommateGender.KhongYeuCau,
        string city = Hcm,
        string? ward = "Phường Sài Gòn",
        decimal budgetMin = 1_500_000,
        decimal budgetMax = 2_500_000,
        SleepTime sleep = SleepTime.Tu23Den1Gio,
        bool smokes = false,
        bool hasPet = false,
        CookingFrequency cooking = CookingFrequency.ThinhThoang,
        NoiseLevel noise = NoiseLevel.BinhThuong,
        OccupationType occupation = OccupationType.SinhVien,
        string organization = "Đại học Công nghệ Thông tin",
        string? schoolCode = null) => new()
    {
        Gender = gender,
        PreferredRoommateGender = preferred,
        City = city,
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

    private const string Uit = "truong-dai-hoc-cong-nghe-thong-tin-dhqg-tp-hcm";
    private const string UitName = "Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM";
    private const string BkHcm = "truong-dai-hoc-bach-khoa-dhqg-tp-hcm";
    private const string BkHcmName = "Trường Đại học Bách khoa – ĐHQG TP.HCM";
    private const string BkHn = "dai-hoc-bach-khoa-ha-noi";
    private const string BkHnName = "Đại học Bách khoa Hà Nội";

    // ---- Lọc cứng: giới tính hai chiều (FR-108), cùng tỉnh/thành (FR-109) ----

    [Theory]
    [InlineData(Gender.Nam, PreferredRoommateGender.KhongYeuCau, Gender.Nu, PreferredRoommateGender.KhongYeuCau, true)]
    [InlineData(Gender.Nam, PreferredRoommateGender.ChiNam, Gender.Nam, PreferredRoommateGender.ChiNam, true)]
    [InlineData(Gender.Nu, PreferredRoommateGender.ChiNu, Gender.Nu, PreferredRoommateGender.KhongYeuCau, true)]
    // A chỉ nhận nam, B là nữ.
    [InlineData(Gender.Nam, PreferredRoommateGender.ChiNam, Gender.Nu, PreferredRoommateGender.KhongYeuCau, false)]
    // A chấp nhận B, nhưng B chỉ nhận nữ mà A là nam: lọc cả hai chiều.
    [InlineData(Gender.Nam, PreferredRoommateGender.KhongYeuCau, Gender.Nu, PreferredRoommateGender.ChiNu, false)]
    [InlineData(Gender.Nu, PreferredRoommateGender.ChiNam, Gender.Nam, PreferredRoommateGender.ChiNu, true)]
    public void CanMatch_GioiTinhPhaiDuocCaHaiBenChapNhan(
        Gender genderA, PreferredRoommateGender preferredA,
        Gender genderB, PreferredRoommateGender preferredB,
        bool expected)
    {
        var a = Profile(gender: genderA, preferred: preferredA);
        var b = Profile(gender: genderB, preferred: preferredB);

        Assert.Equal(expected, RoommateMatching.CanMatch(a, b));
        Assert.Equal(expected, RoommateMatching.CanMatch(b, a));
    }

    [Fact]
    public void CanMatch_KhacTinhThanhThiLoai()
    {
        Assert.False(RoommateMatching.CanMatch(Profile(city: Hcm), Profile(city: HaNoi)));
    }

    // ---- Khu vực (FR-109) ----

    [Theory]
    [InlineData("Phường Sài Gòn", "Phường Sài Gòn", 1)]
    [InlineData("Phường Sài Gòn", null, 1)]
    [InlineData(null, "Phường Bến Thành", 1)]
    [InlineData(null, null, 1)]
    [InlineData("Phường Sài Gòn", "Phường Bến Thành", 0.5)]
    public void AreaScore(string? wardA, string? wardB, double expected)
    {
        Assert.Equal((decimal)expected, RoommateMatching.AreaScore(Profile(ward: wardA), Profile(ward: wardB)));
    }

    // ---- Ngân sách (FR-110) ----

    [Theory]
    // Trùng [2tr, 2,5tr] dài 0,5tr; khoảng hẹp hơn là A dài 1tr → 0,5.
    [InlineData(1_500_000, 2_500_000, 2_000_000, 4_000_000, 0.5)]
    // B nằm trọn trong A → 1.
    [InlineData(1_000_000, 4_000_000, 2_000_000, 3_000_000, 1)]
    // Hai khoảng giống nhau → 1.
    [InlineData(1_500_000, 2_500_000, 1_500_000, 2_500_000, 1)]
    // Không trùng → 0.
    [InlineData(1_000_000, 1_500_000, 2_000_000, 3_000_000, 0)]
    // Chỉ chạm nhau tại một điểm: phần trùng dài 0 → 0.
    [InlineData(1_000_000, 2_000_000, 2_000_000, 3_000_000, 0)]
    // A nằm trọn trong B, nhìn từ phía B → 1.
    [InlineData(2_000_000, 5_000_000, 1_000_000, 6_000_000, 1)]
    public void BudgetScore_KhoangThuong(double minA, double maxA, double minB, double maxB, double expected)
    {
        var score = RoommateMatching.BudgetScore(
            Profile(budgetMin: (decimal)minA, budgetMax: (decimal)maxA),
            Profile(budgetMin: (decimal)minB, budgetMax: (decimal)maxB));

        Assert.Equal((decimal)expected, score);
    }

    [Fact]
    public void BudgetScore_PhanTrungChiaKhoangHepHon_KhongChan()
    {
        // A [1tr, 4tr], B [3tr, 6tr]: trùng [3tr, 4tr] dài 1tr, cả hai dài 3tr → 1/3.
        var score = RoommateMatching.BudgetScore(
            Profile(budgetMin: 1_000_000, budgetMax: 4_000_000),
            Profile(budgetMin: 3_000_000, budgetMax: 6_000_000));

        Assert.Equal(1m / 3m, score);
    }

    [Theory]
    // Khoảng hẹp hơn chỉ là một số: nằm trong khoảng kia (kể cả hai đầu) → 1, ngoài → 0.
    [InlineData(2_000_000, 1_500_000, 2_500_000, 1)]
    [InlineData(1_500_000, 1_500_000, 2_500_000, 1)]
    [InlineData(2_500_000, 1_500_000, 2_500_000, 1)]
    [InlineData(3_000_000, 1_500_000, 2_500_000, 0)]
    [InlineData(2_000_000, 2_000_000, 2_000_000, 1)]
    [InlineData(2_000_000, 2_100_000, 2_100_000, 0)]
    public void BudgetScore_MotBenChiLaMotSo(double point, double minB, double maxB, double expected)
    {
        var a = Profile(budgetMin: (decimal)point, budgetMax: (decimal)point);
        var b = Profile(budgetMin: (decimal)minB, budgetMax: (decimal)maxB);

        Assert.Equal((decimal)expected, RoommateMatching.BudgetScore(a, b));
        Assert.Equal((decimal)expected, RoommateMatching.BudgetScore(b, a));
    }

    // ---- Thói quen (FR-111) ----

    [Fact]
    public void HabitsScore_GiongHetThiBang1()
    {
        Assert.Equal(1m, RoommateMatching.HabitsScore(Profile(), Profile()));
    }

    [Fact]
    public void HabitsScore_LechMotBacDuocNuaDiem_LechHaiBacVaKhacCoKhongDuoc0()
    {
        // Giờ ngủ lệch hai bậc → 0; hút thuốc khác → 0; thú cưng giống → 1; nấu ăn lệch một bậc → 0,5;
        // độ ồn lệch một bậc → 0,5. Trung bình (0 + 0 + 1 + 0,5 + 0,5) / 5 = 0,4.
        var a = Profile(sleep: SleepTime.Truoc23Gio, smokes: true, hasPet: false,
            cooking: CookingFrequency.ThuongXuyen, noise: NoiseLevel.YenTinh);
        var b = Profile(sleep: SleepTime.Sau1Gio, smokes: false, hasPet: false,
            cooking: CookingFrequency.ThinhThoang, noise: NoiseLevel.BinhThuong);

        Assert.Equal(0.4m, RoommateMatching.HabitsScore(a, b));
    }

    [Theory]
    [InlineData(SleepTime.Truoc23Gio, SleepTime.Tu23Den1Gio, 0.5)]
    [InlineData(SleepTime.Tu23Den1Gio, SleepTime.Sau1Gio, 0.5)]
    [InlineData(SleepTime.Truoc23Gio, SleepTime.Sau1Gio, 0)]
    public void HabitsScore_GioNguTheoBac(SleepTime sleepA, SleepTime sleepB, double itemScore)
    {
        // Bốn mục còn lại giống nhau → (itemScore + 4) / 5.
        var expected = ((decimal)itemScore + 4) / 5;

        Assert.Equal(expected, RoommateMatching.HabitsScore(Profile(sleep: sleepA), Profile(sleep: sleepB)));
    }

    [Theory]
    [InlineData(CookingFrequency.ThuongXuyen, CookingFrequency.Khong, 0)]
    [InlineData(CookingFrequency.Khong, CookingFrequency.ThinhThoang, 0.5)]
    public void HabitsScore_NauAnTheoBac(CookingFrequency cookingA, CookingFrequency cookingB, double itemScore)
    {
        var expected = ((decimal)itemScore + 4) / 5;

        Assert.Equal(expected, RoommateMatching.HabitsScore(Profile(cooking: cookingA), Profile(cooking: cookingB)));
    }

    [Theory]
    [InlineData(NoiseLevel.YenTinh, NoiseLevel.On, 0)]
    [InlineData(NoiseLevel.On, NoiseLevel.BinhThuong, 0.5)]
    public void HabitsScore_DoOnTheoBac(NoiseLevel noiseA, NoiseLevel noiseB, double itemScore)
    {
        var expected = ((decimal)itemScore + 4) / 5;

        Assert.Equal(expected, RoommateMatching.HabitsScore(Profile(noise: noiseA), Profile(noise: noiseB)));
    }

    [Fact]
    public void HabitsScore_ThuCungKhacNhauDuoc0()
    {
        Assert.Equal(0.8m, RoommateMatching.HabitsScore(Profile(hasPet: true), Profile(hasPet: false)));
    }

    // ---- Trường học / nơi làm việc (FR-112) ----

    [Theory]
    [InlineData(OccupationType.SinhVien, "Đại học Công nghệ Thông tin", OccupationType.SinhVien, "Đại học Công nghệ Thông tin", 1)]
    // Không phân biệt hoa thường, bỏ khoảng trắng thừa ở đầu, cuối và giữa.
    [InlineData(OccupationType.SinhVien, "Đại học  Công nghệ Thông tin ", OccupationType.SinhVien, " đại học công nghệ THÔNG TIN", 1)]
    [InlineData(OccupationType.SinhVien, "Đại học Công nghệ Thông tin", OccupationType.SinhVien, "Đại học Bách khoa", 0.5)]
    [InlineData(OccupationType.DiLam, "FPT Software", OccupationType.DiLam, "Viettel", 0.5)]
    // Khác loại thì 0, kể cả cùng tên.
    [InlineData(OccupationType.SinhVien, "FPT", OccupationType.DiLam, "FPT", 0)]
    [InlineData(OccupationType.SinhVien, "Đại học Bách khoa", OccupationType.DiLam, "Viettel", 0)]
    public void OrganizationScore(
        OccupationType typeA, string nameA, OccupationType typeB, string nameB, double expected)
    {
        var a = Profile(occupation: typeA, organization: nameA);
        var b = Profile(occupation: typeB, organization: nameB);

        Assert.Equal((decimal)expected, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_CungTenNhungKhacCachDungDau_VanLaCungTen()
    {
        // Chữ "ọ" dựng sẵn (U+1ECD) và tổ hợp (o + U+0323): chuẩn hóa NFC trước khi so.
        var a = Profile(organization: "Đại học Y Dược");
        var b = Profile(organization: "Đại học Y Dược");

        Assert.Equal(1m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_HaiTruongTrongDanhMucCungMa_DuocMot()
    {
        var a = Profile(organization: UitName, schoolCode: Uit);
        // Tên lưu lúc chọn có thể khác nếu danh mục đổi tên sau đó: so theo mã.
        var b = Profile(organization: "Trường Đại học Công nghệ Thông tin, ĐHQG-HCM", schoolCode: Uit);

        Assert.Equal(1m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_BachKhoaHaNoiVaBachKhoaTpHcm_LaKhacTruong()
    {
        var a = Profile(organization: BkHnName, schoolCode: BkHn);
        var b = Profile(organization: BkHcmName, schoolCode: BkHcm);

        Assert.Equal(0.5m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_HaiTruongThanhVienCungMotDhqg_VanLaKhacTruong()
    {
        var a = Profile(organization: UitName, schoolCode: Uit);
        var b = Profile(organization: BkHcmName, schoolCode: BkHcm);

        Assert.Equal(0.5m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_MotBenTruongKhacGoDungTenTrongDanhMuc_SoTheoTen()
    {
        var a = Profile(organization: UitName, schoolCode: Uit);
        var b = Profile(organization: " trường đại học công nghệ thông tin – ĐHQG TP.HCM", schoolCode: null);

        Assert.Equal(1m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void OrganizationScore_MotBenTruongKhacTenKhac_DuocNuaDiem()
    {
        var a = Profile(organization: UitName, schoolCode: Uit);
        var b = Profile(organization: "Trường Đại học Công nghệ Thông tin Gia Định", schoolCode: null);

        Assert.Equal(0.5m, RoommateMatching.OrganizationScore(a, b));
    }

    [Fact]
    public void Calculate_HaiTruongBachKhoaKhacThanhPho_TruongDuocNuaDiem()
    {
        // Mọi tiêu chí khác giống hệt: 30 + 30 + 25 + 15 × 0,5 = 92,5 → 93.
        var a = Profile(organization: BkHnName, schoolCode: BkHn);
        var b = Profile(organization: BkHcmName, schoolCode: BkHcm);

        var result = RoommateMatching.Calculate(a, b);

        Assert.Equal(0.5m, result.Organization);
        Assert.Equal(93, result.Score);
    }

    // ---- Tổng điểm (FR-113, BR-19) ----

    [Fact]
    public void Calculate_GiongHetDuoc100()
    {
        var result = RoommateMatching.Calculate(Profile(), Profile());

        Assert.Equal(new RoommateMatchScore(100, 1m, 1m, 1m, 1m), result);
    }

    [Fact]
    public void Calculate_TongCoTrongSoVaLamTronToiPhanTram()
    {
        // Ngân sách 0,5 (A [1,5tr; 2,5tr], B [2tr; 4tr]); thói quen 0,8 (thú cưng khác); khu vực 0,5 (khác phường);
        // cùng loại khác tên 0,5. Điểm = 30 × 0,5 + 30 × 0,8 + 25 × 0,5 + 15 × 0,5 = 15 + 24 + 12,5 + 7,5 = 59.
        var a = Profile(ward: "Phường Sài Gòn", budgetMin: 1_500_000, budgetMax: 2_500_000, hasPet: true);
        var b = Profile(ward: "Phường Bến Thành", budgetMin: 2_000_000, budgetMax: 4_000_000,
            organization: "Đại học Bách khoa");

        var result = RoommateMatching.Calculate(a, b);

        Assert.Equal(new RoommateMatchScore(59, 0.5m, 0.8m, 0.5m, 0.5m), result);
    }

    [Fact]
    public void Calculate_NuaPhanTramLamTronLen()
    {
        // Thói quen 0,9 (giờ ngủ lệch một bậc: (0,5 + 4) / 5); khu vực 0,5; còn lại 1.
        // Điểm = 30 + 27 + 12,5 + 15 = 84,5 → 85 (MidpointRounding.AwayFromZero).
        var a = Profile(ward: "Phường Sài Gòn", sleep: SleepTime.Truoc23Gio);
        var b = Profile(ward: "Phường Bến Thành", sleep: SleepTime.Tu23Den1Gio);

        Assert.Equal(85, RoommateMatching.Calculate(a, b).Score);
    }

    [Fact]
    public void Calculate_PhanLeNhoHonNuaLamTronXuong()
    {
        // Ngân sách 1/3 (A [1tr; 4tr], B [3tr; 6tr]) → 30 × 1/3 ≈ 9,99…; thói quen 0,8 (thú cưng khác) → 24;
        // khu vực 0,5 → 12,5; cùng loại khác tên → 7,5. Tổng ≈ 53,99… → 54.
        var a = Profile(ward: "Phường Sài Gòn", budgetMin: 1_000_000, budgetMax: 4_000_000, hasPet: true);
        var b = Profile(ward: "Phường Bến Thành", budgetMin: 3_000_000, budgetMax: 6_000_000,
            organization: "Đại học Bách khoa");

        Assert.Equal(54, RoommateMatching.Calculate(a, b).Score);
    }

    [Fact]
    public void Calculate_ChiConKhuVucKhacPhuong()
    {
        var a = Profile(ward: "Phường Sài Gòn", budgetMin: 1_000_000, budgetMax: 1_500_000,
            sleep: SleepTime.Truoc23Gio, smokes: true, hasPet: true,
            cooking: CookingFrequency.ThuongXuyen, noise: NoiseLevel.YenTinh, occupation: OccupationType.SinhVien);
        var b = Profile(ward: "Phường Bến Thành", budgetMin: 2_000_000, budgetMax: 3_000_000,
            sleep: SleepTime.Sau1Gio, smokes: false, hasPet: false,
            cooking: CookingFrequency.Khong, noise: NoiseLevel.On, occupation: OccupationType.DiLam);

        // Chỉ còn khu vực 0,5 → 12,5 → 13.
        Assert.Equal(new RoommateMatchScore(13, 0m, 0m, 0.5m, 0m), RoommateMatching.Calculate(a, b));
    }

    [Fact]
    public void Calculate_DoiCho_HaiBenCungDiem()
    {
        var a = Profile(ward: null, budgetMin: 1_000_000, budgetMax: 4_000_000, sleep: SleepTime.Sau1Gio);
        var b = Profile(ward: "Phường Bến Thành", budgetMin: 3_000_000, budgetMax: 3_500_000,
            occupation: OccupationType.DiLam, organization: "Viettel");

        Assert.Equal(RoommateMatching.Calculate(a, b), RoommateMatching.Calculate(b, a));
    }
}
