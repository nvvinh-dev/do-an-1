using SmartRent.Domain;

namespace SmartRent.UnitTests;

/// <summary>
/// FR-124, FR-125: bộ lọc AI trả về được đối chiếu danh mục và kiểm tra như tham số của GET /rooms/search;
/// giá trị bị bỏ thì vào <c>unsupported</c>, phường/xã thiếu tỉnh/thành thì tự suy tỉnh khi tên phường/xã là duy nhất.
/// </summary>
public class NaturalRoomSearchTests
{
    private const string Hcm = "Thành phố Hồ Chí Minh";
    private const string HaNoi = "Thành phố Hà Nội";
    private const string CanTho = "Thành phố Cần Thơ";

    private static readonly NaturalRoomSearchCatalog Catalog = new(
        [
            new NaturalRoomSearchLocation(HaNoi, ["Phường Ba Đình", "Phường Tân Phong", "Xã Bình Minh"]),
            new NaturalRoomSearchLocation(Hcm, ["Phường Linh Xuân", "Phường Tân Phong", "Phường Bình Minh"]),
            new NaturalRoomSearchLocation(CanTho, ["Phường Ninh Kiều"])
        ],
        [
            new NaturalRoomSearchAmenity(1, "Bãi để xe"),
            new NaturalRoomSearchAmenity(7, "Máy lạnh"),
            new NaturalRoomSearchAmenity(10, "Gác lửng")
        ]);

    private static AiRoomSearchFilters Raw(
        decimal? minPrice = null, decimal? maxPrice = null,
        decimal? minArea = null, decimal? maxArea = null,
        string? city = null, string? ward = null,
        IReadOnlyList<string>? amenities = null, int? minOccupants = null,
        string? sortBy = null, string? sortDirection = null,
        IReadOnlyList<string>? unsupported = null)
        => new(minPrice, maxPrice, minArea, maxArea, city, ward, amenities, minOccupants, sortBy, sortDirection, unsupported);

    [Fact]
    public void Cau_mau_api_design_suy_ra_tinh_tu_phuong_va_doi_ten_tien_ich_thanh_id()
    {
        // "phòng dưới 3 triệu ở Linh Xuân có gác lửng, gần Đại học Công nghệ Thông tin"
        var result = NaturalRoomSearch.Sanitize(
            Raw(maxPrice: 3_000_000, ward: "Linh Xuân", amenities: ["Gác lửng"],
                unsupported: ["gần Đại học Công nghệ Thông tin"]),
            Catalog);

        Assert.Equal(3_000_000, result.Filters.MaxPrice);
        Assert.Equal(Hcm, result.Filters.City);
        Assert.Equal("Phường Linh Xuân", result.Filters.Ward);
        Assert.Equal([10L], result.Filters.AmenityIds);
        Assert.Equal(["gần Đại học Công nghệ Thông tin"], result.Unsupported);
        Assert.False(result.Filters.IsEmpty);
    }

    [Fact]
    public void Phuong_trung_ten_giua_hai_tinh_ma_khong_co_tinh_thi_bo_phuong()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(maxPrice: 2_000_000, ward: "Tân Phong"), Catalog);

        Assert.Null(result.Filters.City);
        Assert.Null(result.Filters.Ward);
        Assert.Equal(["Phường/xã \"Tân Phong\""], result.Unsupported);
    }

    [Fact]
    public void Phuong_trung_ten_nhung_co_tinh_thi_lay_phuong_cua_tinh_do()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(city: Hcm, ward: "tân phong"), Catalog);

        Assert.Equal(Hcm, result.Filters.City);
        Assert.Equal("Phường Tân Phong", result.Filters.Ward);
        Assert.Empty(result.Unsupported);
    }

    [Fact]
    public void Ten_day_du_co_tien_to_phan_biet_phuong_va_xa_cung_ten()
    {
        // "Bình Minh" là xã ở Hà Nội và phường ở TP.HCM: ghi rõ "Xã" thì chỉ còn một nơi.
        var withPrefix = NaturalRoomSearch.Sanitize(Raw(ward: "Xã Bình Minh"), Catalog);
        var withoutPrefix = NaturalRoomSearch.Sanitize(Raw(ward: "Bình Minh", maxPrice: 1_000_000), Catalog);

        Assert.Equal(HaNoi, withPrefix.Filters.City);
        Assert.Equal("Xã Bình Minh", withPrefix.Filters.Ward);
        Assert.Null(withoutPrefix.Filters.Ward);
    }

    [Fact]
    public void Phuong_khong_thuoc_tinh_da_neu_thi_bo_phuong_giu_tinh()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(city: CanTho, ward: "Linh Xuân"), Catalog);

        Assert.Equal(CanTho, result.Filters.City);
        Assert.Null(result.Filters.Ward);
        Assert.Equal(["Phường/xã \"Linh Xuân\""], result.Unsupported);
    }

    [Fact]
    public void Tinh_khong_co_trong_danh_muc_bi_bo_nhung_van_suy_tinh_tu_phuong()
    {
        // Người dùng gọi tên cũ "Thủ Đức" — không phải tỉnh/thành, nhưng phường Linh Xuân chỉ có ở TP.HCM.
        var result = NaturalRoomSearch.Sanitize(Raw(city: "Thủ Đức", ward: "Phường Linh Xuân"), Catalog);

        Assert.Equal(Hcm, result.Filters.City);
        Assert.Equal("Phường Linh Xuân", result.Filters.Ward);
        Assert.Equal(["Tỉnh/thành \"Thủ Đức\""], result.Unsupported);
    }

    [Fact]
    public void Tinh_chi_ghi_ten_rieng_khong_phan_biet_hoa_thuong_van_khop()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(city: "  hồ chí minh "), Catalog);

        Assert.Equal(Hcm, result.Filters.City);
    }

    [Fact]
    public void Ten_dang_to_hop_NFD_duoc_chuan_hoa_truoc_khi_so_khop()
    {
        var result = NaturalRoomSearch.Sanitize(
            Raw(city: "Thành phố Cần Thơ".Normalize(System.Text.NormalizationForm.FormD),
                amenities: ["máy lạnh".Normalize(System.Text.NormalizationForm.FormD)]),
            Catalog);

        Assert.Equal(CanTho, result.Filters.City);
        Assert.Equal([7L], result.Filters.AmenityIds);
    }

    [Fact]
    public void Tien_ich_khong_co_trong_danh_muc_vao_unsupported_tien_ich_trung_chi_lay_mot_lan_theo_thu_tu_danh_muc()
    {
        var result = NaturalRoomSearch.Sanitize(
            Raw(amenities: ["Gác lửng", "hồ bơi", "máy lạnh", "Gác lửng", "  "]),
            Catalog);

        Assert.Equal([7L, 10L], result.Filters.AmenityIds);
        Assert.Equal(["Tiện ích \"hồ bơi\""], result.Unsupported);
    }

    [Fact]
    public void Khoang_gia_nguoc_bo_ca_hai_dau()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(minPrice: 5_000_000, maxPrice: 3_000_000, minArea: 20), Catalog);

        Assert.Null(result.Filters.MinPrice);
        Assert.Null(result.Filters.MaxPrice);
        Assert.Equal(20, result.Filters.MinArea);
        Assert.Equal(["Khoảng giá"], result.Unsupported);
    }

    [Fact]
    public void Khoang_dien_tich_nguoc_va_gia_tri_am_bi_bo()
    {
        var result = NaturalRoomSearch.Sanitize(
            Raw(minArea: 30, maxArea: 15, maxPrice: -1, minPrice: 1_000_000),
            Catalog);

        Assert.Null(result.Filters.MinArea);
        Assert.Null(result.Filters.MaxArea);
        Assert.Null(result.Filters.MaxPrice);
        Assert.Equal(1_000_000, result.Filters.MinPrice);
        Assert.Equal(["Khoảng giá", "Khoảng diện tích"], result.Unsupported);
    }

    [Fact]
    public void Gia_bang_nhau_hai_dau_van_hop_le()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(minPrice: 3_000_000, maxPrice: 3_000_000), Catalog);

        Assert.Equal(3_000_000, result.Filters.MinPrice);
        Assert.Equal(3_000_000, result.Filters.MaxPrice);
    }

    [Fact]
    public void So_nguoi_nho_hon_1_bi_bo()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(minOccupants: 0, maxPrice: 2_000_000), Catalog);

        Assert.Null(result.Filters.MinOccupants);
        Assert.Equal(["Số người"], result.Unsupported);
    }

    [Theory]
    [InlineData("price", "asc", "price", "asc")]
    [InlineData("AREA", "DESC", "area", "desc")]
    [InlineData("price", null, "price", null)]
    public void Sap_xep_hop_le_duoc_giu_va_dua_ve_chu_thuong(
        string sortBy, string? sortDirection, string expectedBy, string? expectedDirection)
    {
        var result = NaturalRoomSearch.Sanitize(Raw(sortBy: sortBy, sortDirection: sortDirection), Catalog);

        Assert.Equal(expectedBy, result.Filters.SortBy);
        Assert.Equal(expectedDirection, result.Filters.SortDirection);
        Assert.False(result.Filters.IsEmpty);
    }

    [Theory]
    [InlineData("distance", "asc")]
    [InlineData("price", "up")]
    public void Sap_xep_sai_bo_ca_truong_va_chieu(string sortBy, string sortDirection)
    {
        var result = NaturalRoomSearch.Sanitize(
            Raw(sortBy: sortBy, sortDirection: sortDirection, maxPrice: 1_000_000), Catalog);

        Assert.Null(result.Filters.SortBy);
        Assert.Null(result.Filters.SortDirection);
        Assert.Equal(["Sắp xếp"], result.Unsupported);
    }

    [Fact]
    public void Chieu_sap_xep_khong_kem_truong_sap_xep_bi_bo_im_lang()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(sortDirection: "desc"), Catalog);

        Assert.Null(result.Filters.SortDirection);
        Assert.True(result.Filters.IsEmpty);
        Assert.Empty(result.Unsupported);
    }

    [Fact]
    public void Khong_con_bo_loc_nao_thi_IsEmpty()
    {
        var result = NaturalRoomSearch.Sanitize(
            Raw(city: "Sao Hỏa", amenities: ["hồ bơi"], unsupported: ["yên tĩnh"]),
            Catalog);

        Assert.True(result.Filters.IsEmpty);
        Assert.Equal(["yên tĩnh", "Tỉnh/thành \"Sao Hỏa\"", "Tiện ích \"hồ bơi\""], result.Unsupported);
    }

    [Fact]
    public void Y_AI_bao_chua_loc_duoc_ma_trung_ten_tien_ich_hoac_tinh_thi_van_loc()
    {
        // Gemini thật (26/11) trả "có ban công" và "Hà Nội" vào unsupported dù cả hai có trong danh mục.
        var result = NaturalRoomSearch.Sanitize(
            Raw(ward: "Xã Bình Minh", unsupported: ["Hà Nội", "có máy lạnh", "gần chợ"]),
            Catalog);

        Assert.Equal(HaNoi, result.Filters.City);
        Assert.Equal("Xã Bình Minh", result.Filters.Ward);
        Assert.Equal([7L], result.Filters.AmenityIds);
        Assert.Equal(["gần chợ"], result.Unsupported);
    }

    [Fact]
    public void Y_trung_ten_tinh_khong_doi_tinh_AI_da_dien()
    {
        var result = NaturalRoomSearch.Sanitize(Raw(city: Hcm, unsupported: ["Cần Thơ"]), Catalog);

        Assert.Equal(Hcm, result.Filters.City);
        Assert.Equal(["Cần Thơ"], result.Unsupported);
    }

    [Fact]
    public void Unsupported_cua_AI_duoc_cat_khoang_trang_bo_rong_bo_trung_va_gioi_han()
    {
        var many = Enumerable.Range(1, 15).Select(i => $"ý {i}").ToList();
        many.Insert(0, "  gần chợ  ");
        many.Insert(1, "GẦN CHỢ");
        many.Insert(2, "");
        many.Insert(3, new string('a', 500));

        var result = NaturalRoomSearch.Sanitize(Raw(maxPrice: 1, unsupported: many), Catalog);

        Assert.Equal("gần chợ", result.Unsupported[0]);
        Assert.Equal(NaturalRoomSearch.MaxUnsupportedLength, result.Unsupported[1].Length);
        Assert.Equal(NaturalRoomSearch.MaxUnsupportedItems, result.Unsupported.Count);
    }
}
