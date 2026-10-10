using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Thông báo trả phòng — BP-10, FR-53, FR-87, FR-98.</summary>
public class ContractMoveOutNoticeTests
{
    private const long TenantId = 20;
    private const long LandlordId = 30;

    private static readonly DateOnly StartDate = new(2026, 10, 15);
    private static readonly DateOnly EndDate = new(2027, 10, 14);

    private static Contract NewContract(ContractStatus status = ContractStatus.DangHieuLuc) => new()
    {
        Id = 1,
        TenantUserId = TenantId,
        Status = status,
        DepositAmount = 3_000_000,
        StartDate = StartDate,
        EndDate = EndDate
    };

    /// <summary>9 giờ sáng giờ Việt Nam của một ngày.</summary>
    private static DateTimeOffset MorningOf(DateOnly date)
        => new(date.ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(7));

    /// <summary>Hợp đồng đã có thông báo trả phòng do <paramref name="senderId"/> gửi.</summary>
    private static Contract WithNotice(long senderId, DateOnly noticeDate, DateOnly expectedMoveOutDate)
    {
        var contract = NewContract();
        contract.SendMoveOutNotice(senderId, expectedMoveOutDate, "Chuyển chỗ làm", MorningOf(noticeDate));
        return contract;
    }

    [Theory]
    [InlineData(ContractStatus.DangHieuLuc, 0, true)]
    [InlineData(ContractStatus.DangHieuLuc, 100, true)]
    [InlineData(ContractStatus.DangHieuLuc, -1, false)]
    [InlineData(ContractStatus.SapHetHan, 360, true)]
    [InlineData(ContractStatus.SapHetHan, -1, false)]
    [InlineData(ContractStatus.ChoNhanCoc, 10, false)]
    [InlineData(ContractStatus.DangThanhLy, 10, false)]
    [InlineData(ContractStatus.DaThanhLy, 10, false)]
    [InlineData(ContractStatus.DaHuy, 10, false)]
    public void CanSendMoveOutNotice_DangHieuLucHoacSapHetHanDaToiNgayBatDau(
        ContractStatus status, int daysAfterStart, bool expected)
    {
        Assert.Equal(expected, NewContract(status).CanSendMoveOutNotice(StartDate.AddDays(daysAfterStart)));
    }

    [Fact]
    public void SendMoveOutNotice_GhiBenGuiNgayGuiNgayTraVaLyDo_ChuyenDangThanhLy()
    {
        var contract = NewContract();
        var now = MorningOf(new DateOnly(2027, 3, 1));

        contract.SendMoveOutNotice(TenantId, new DateOnly(2027, 3, 20), "Chuyển chỗ làm", now);

        Assert.Equal(ContractStatus.DangThanhLy, contract.Status);
        Assert.Equal(now, contract.MoveOutNoticeAt);
        Assert.Equal(TenantId, contract.MoveOutNoticeByUserId);
        Assert.Equal(new DateOnly(2027, 3, 20), contract.ExpectedMoveOutDate);
        Assert.Equal("Chuyển chỗ làm", contract.TerminationReason);
    }

    [Fact]
    public void SendMoveOutNotice_ChuaToiNgayBatDau_NemLoiVaGiuNguyen()
    {
        // Trước ngày bắt đầu thì phải dùng /cancel, không phải luồng thanh lý.
        var contract = NewContract();

        Assert.Throws<InvalidOperationException>(() => contract.SendMoveOutNotice(
            TenantId, StartDate.AddDays(20), "Đổi ý", MorningOf(StartDate.AddDays(-1))));
        Assert.Equal(ContractStatus.DangHieuLuc, contract.Status);
        Assert.Null(contract.MoveOutNoticeAt);
        Assert.Null(contract.MoveOutNoticeByUserId);
    }

    [Fact]
    public void MoveOutNoticeDays_TinhTheoNgayVietNamCuaThoiDiemGui()
    {
        var contract = NewContract();
        // 00:30 ngày 01/11 giờ Việt Nam là 17:30 ngày 31/10 giờ UTC.
        var sentAt = new DateTimeOffset(2026, 10, 31, 17, 30, 0, TimeSpan.Zero);

        contract.SendMoveOutNotice(TenantId, new DateOnly(2026, 12, 1), "Chuyển chỗ làm", sentAt);

        Assert.Equal(30, contract.MoveOutNoticeDays);
    }

    [Fact]
    public void MoveOutNoticeDays_ChuaCoThongBao_Null()
    {
        Assert.Null(NewContract().MoveOutNoticeDays);
    }

    [Theory]
    // Người thuê báo trước 29 ngày, trả trước ngày kết thúc: được phạt.
    [InlineData(TenantId, "2027-03-01", "2027-03-30", true)]
    // Báo trước đủ 30 ngày: không phạt.
    [InlineData(TenantId, "2027-03-01", "2027-03-31", false)]
    // Chủ trọ là bên gửi: không phạt người thuê.
    [InlineData(LandlordId, "2027-03-01", "2027-03-10", false)]
    // Trả đúng ngày kết thúc: không phạt dù báo gấp.
    [InlineData(TenantId, "2027-10-04", "2027-10-14", false)]
    // Hợp đồng đã quá ngày kết thúc: không phạt.
    [InlineData(TenantId, "2027-10-20", "2027-10-25", false)]
    public void IsMoveOutPenaltyAllowed_NguoiThueGuiBaoTruocDuoi30NgayVaTraTruocNgayKetThuc(
        long senderId, string noticeDate, string expectedMoveOutDate, bool expected)
    {
        var contract = WithNotice(senderId, DateOnly.Parse(noticeDate), DateOnly.Parse(expectedMoveOutDate));

        Assert.Equal(expected, contract.IsMoveOutPenaltyAllowed);
    }

    [Fact]
    public void IsMoveOutPenaltyAllowed_ChuaCoThongBao_False()
    {
        Assert.False(NewContract().IsMoveOutPenaltyAllowed);
    }

    [Fact]
    public void CanWithdrawMoveOutNotice_ChiBenDaGuiKhiChuaCoHoaDonThanhLy()
    {
        var contract = WithNotice(TenantId, new DateOnly(2027, 3, 1), new DateOnly(2027, 4, 15));

        Assert.True(contract.CanWithdrawMoveOutNotice(TenantId, hasSettlementInvoice: false));
        Assert.False(contract.CanWithdrawMoveOutNotice(LandlordId, hasSettlementInvoice: false));
        Assert.False(contract.CanWithdrawMoveOutNotice(TenantId, hasSettlementInvoice: true));
    }

    [Fact]
    public void CanWithdrawMoveOutNotice_HopDongDaThanhLy_False()
    {
        var contract = WithNotice(TenantId, new DateOnly(2027, 3, 1), new DateOnly(2027, 4, 15));
        contract.Status = ContractStatus.DaThanhLy;

        Assert.False(contract.CanWithdrawMoveOutNotice(TenantId, hasSettlementInvoice: false));
    }

    [Theory]
    [InlineData(16, ContractStatus.DangHieuLuc)]
    [InlineData(15, ContractStatus.SapHetHan)]
    [InlineData(0, ContractStatus.SapHetHan)]
    // BP-10 A4: kể cả khi đã qua ngày kết thúc.
    [InlineData(-3, ContractStatus.SapHetHan)]
    public void WithdrawMoveOutNotice_XoaThongBao_VeTrangThaiTheoSoNgayToiNgayKetThuc(
        int daysBeforeEnd, ContractStatus expectedStatus)
    {
        var today = EndDate.AddDays(-daysBeforeEnd);
        var contract = WithNotice(LandlordId, today.AddDays(-1), EndDate.AddDays(30));

        contract.WithdrawMoveOutNotice(LandlordId, hasSettlementInvoice: false, today);

        Assert.Equal(expectedStatus, contract.Status);
        Assert.Null(contract.MoveOutNoticeAt);
        Assert.Null(contract.MoveOutNoticeByUserId);
        Assert.Null(contract.ExpectedMoveOutDate);
        Assert.Null(contract.TerminationReason);
    }

    [Fact]
    public void WithdrawMoveOutNotice_KhongPhaiBenGui_NemLoiVaGiuNguyen()
    {
        var contract = WithNotice(TenantId, new DateOnly(2027, 3, 1), new DateOnly(2027, 4, 15));

        Assert.Throws<InvalidOperationException>(
            () => contract.WithdrawMoveOutNotice(LandlordId, hasSettlementInvoice: false, new DateOnly(2027, 3, 5)));
        Assert.Equal(ContractStatus.DangThanhLy, contract.Status);
        Assert.Equal(TenantId, contract.MoveOutNoticeByUserId);
    }

    /// <summary>
    /// FR-93, FR-98: ngày trả phòng dự kiến 15/12/2026. Người thuê ở tới 05/01/2027 là đã ở quá tháng dự kiến — tháng
    /// 12 bị chặn lập hóa đơn định kỳ (FR-91), bên gửi phải rút thông báo rồi gửi lại. Trả phòng trong tháng 12, kể cả
    /// ngày cuối tháng, hoặc sớm hơn dự kiến thì không. Tháng 12 năm sau cũng là quá tháng dự kiến — phải so cả năm.
    /// </summary>
    [Theory]
    [InlineData(2027, 1, 5, true)]
    [InlineData(2027, 12, 15, true)]
    [InlineData(2026, 12, 31, false)]
    [InlineData(2026, 12, 1, false)]
    [InlineData(2026, 11, 20, false)]
    public void IsMoveOutAfterExpectedMonth_SoThangVaNamVoiNgayTraPhongDuKien(
        int year, int month, int day, bool expected)
    {
        var contract = WithNotice(TenantId, new DateOnly(2026, 11, 1), new DateOnly(2026, 12, 15));

        Assert.Equal(expected, contract.IsMoveOutAfterExpectedMonth(new DateOnly(year, month, day)));
    }

    [Fact]
    public void IsMoveOutAfterExpectedMonth_ChuaCoThongBao_False()
    {
        Assert.False(NewContract().IsMoveOutAfterExpectedMonth(new DateOnly(2027, 1, 5)));
    }
}
