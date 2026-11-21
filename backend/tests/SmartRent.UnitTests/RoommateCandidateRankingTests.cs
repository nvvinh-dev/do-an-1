using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Danh sách ứng viên ở ghép — FR-106, FR-108, FR-109, FR-113.</summary>
public class RoommateCandidateRankingTests
{
    private const string Hcm = "Thành phố Hồ Chí Minh";

    private static readonly DateTimeOffset Base = new(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);

    private static RoommateProfile Profile(
        long id,
        long userId,
        DateTimeOffset? updatedAt = null,
        Gender gender = Gender.Nam,
        PreferredRoommateGender preferred = PreferredRoommateGender.KhongYeuCau,
        string city = Hcm,
        string organization = "Đại học Công nghệ Thông tin",
        RoommateProfileVisibility visibility = RoommateProfileVisibility.CongKhai,
        bool isSearching = true) => new()
    {
        Id = id,
        TenantUserId = userId,
        Gender = gender,
        PreferredRoommateGender = preferred,
        City = city,
        Ward = "Phường Sài Gòn",
        BudgetMin = 1_500_000,
        BudgetMax = 2_500_000,
        SleepTime = SleepTime.Tu23Den1Gio,
        Smokes = false,
        HasPet = false,
        Cooking = CookingFrequency.ThinhThoang,
        NoiseLevel = NoiseLevel.BinhThuong,
        OccupationType = OccupationType.SinhVien,
        OrganizationName = organization,
        Visibility = visibility,
        IsSearching = isSearching,
        UpdatedAt = updatedAt ?? Base
    };

    [Theory]
    [InlineData(RoommateProfileVisibility.CongKhai, true, true)]
    [InlineData(RoommateProfileVisibility.CongKhai, false, false)]
    [InlineData(RoommateProfileVisibility.ChiKhiToiKetNoi, true, false)]
    [InlineData(RoommateProfileVisibility.ChiKhiToiKetNoi, false, false)]
    public void IsListedAsCandidate_ChiHoSoCongKhaiDangTim(
        RoommateProfileVisibility visibility, bool isSearching, bool expected)
    {
        Assert.Equal(expected, Profile(1, 1, visibility: visibility, isSearching: isSearching).IsListedAsCandidate);
    }

    // Người xem: nam, không yêu cầu giới tính, TP.HCM, sinh viên ĐH CNTT.
    // - Hồ sơ 11 giống hệt → 100.
    // - Hồ sơ 12 và 13 khác tên trường → trường 0,5 → 100 − 7,5 = 92,5 → 93; hồ sơ 13 sửa gần hơn nên đứng trước.
    // - Hồ sơ 14 chỉ nhận nữ, 15 ở Hà Nội (lọc cứng); 16 chỉ khi tôi kết nối, 17 tạm dừng (không liệt kê);
    //   chính hồ sơ của người xem cũng bị bỏ.
    [Fact]
    public void Rank_LocCung_BoHoSoKhongLietKe_DiemCaoTruoc_CungDiemThiSuaGanHonTruoc()
    {
        var viewer = Profile(10, userId: 1);
        var candidates = new[]
        {
            viewer,
            Profile(12, userId: 3, updatedAt: Base.AddHours(1), organization: "Đại học Bách khoa"),
            Profile(11, userId: 2),
            Profile(13, userId: 4, updatedAt: Base.AddHours(2), organization: "Đại học Kinh tế"),
            Profile(14, userId: 5, gender: Gender.Nu, preferred: PreferredRoommateGender.ChiNu),
            Profile(15, userId: 6, city: "Thành phố Hà Nội"),
            Profile(16, userId: 7, visibility: RoommateProfileVisibility.ChiKhiToiKetNoi),
            Profile(17, userId: 8, isSearching: false)
        };

        var ranked = RoommateMatching.Rank(viewer, candidates);

        Assert.Equal([11L, 13L, 12L], ranked.Select(m => m.Profile.Id));
        Assert.Equal([100, 93, 93], ranked.Select(m => m.Score.Score));
        Assert.Equal(0.5m, ranked[1].Score.Organization);
    }

    // Cùng điểm, cùng thời điểm sửa: id lớn hơn trước để thứ tự không đổi giữa hai lần gọi.
    [Fact]
    public void Rank_CungDiemCungLucSua_IdLonHonTruoc()
    {
        var viewer = Profile(1, userId: 1);

        var ranked = RoommateMatching.Rank(viewer, [Profile(2, userId: 2), Profile(3, userId: 3)]);

        Assert.Equal([3L, 2L], ranked.Select(m => m.Profile.Id));
    }

    [Fact]
    public void Rank_ToiDa20UngVien()
    {
        var viewer = Profile(1, userId: 1);
        var candidates = Enumerable.Range(2, 25).Select(i => Profile(i, userId: i));

        var ranked = RoommateMatching.Rank(viewer, candidates);

        Assert.Equal(RoommateMatching.MaxCandidates, ranked.Count);
        Assert.Equal(20, ranked.Count);
    }

    // Hồ sơ của người xem đang tạm dừng hay Chỉ khi tôi kết nối vẫn xem được danh sách của mình.
    [Fact]
    public void Rank_NguoiXemTamDungVanCoDanhSach()
    {
        var viewer = Profile(1, userId: 1, isSearching: false, visibility: RoommateProfileVisibility.ChiKhiToiKetNoi);

        Assert.Single(RoommateMatching.Rank(viewer, [Profile(2, userId: 2)]));
    }
}
