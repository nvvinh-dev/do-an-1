using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Hoàn tất thanh lý — BP-10, FR-58, FR-59, FR-86, FR-96, api-design mục 10 "POST /settlement/complete": điều kiện bảng
/// đã khóa, ba kịch bản số dư, ghi nhận hoàn cọc, hợp đồng Đã thanh lý và phòng về Trống hoặc Bảo trì.
/// Hợp đồng cọc 3.000.000; người thuê báo trả phòng 9 giờ sáng 01/12/2026.
/// </summary>
public class SettlementCompletionTests
{
    private static DateTimeOffset Vn(int year, int month, int day, int hour, int minute = 0)
        => new(year, month, day, hour, minute, 0, TimeSpan.FromHours(7));

    private static readonly DateTimeOffset NoticeAt = Vn(2026, 12, 1, 9);
    private static readonly DateTimeOffset Now = Vn(2026, 12, 20, 15);

    private static Contract ContractInSettlement() => new()
    {
        Id = 4,
        TenantUserId = 20,
        DepositAmount = 3_000_000,
        StartDate = new DateOnly(2026, 7, 15),
        EndDate = new DateOnly(2027, 7, 14),
        Status = ContractStatus.DangThanhLy,
        MoveOutNoticeAt = NoticeAt,
        MoveOutNoticeByUserId = 20,
        ExpectedMoveOutDate = new DateOnly(2026, 12, 15)
    };

    private static Invoice Settlement(InvoiceStatus status, decimal total, decimal paid = 0) => new()
    {
        Id = 13,
        ContractId = 4,
        Type = InvoiceType.ThanhLy,
        TotalAmount = total,
        PaidAmount = paid,
        Status = status
    };

    // ---------------------------------------------------------------- Bảng đã khóa

    /// <summary>
    /// api-design mục 10: chỉ hoàn tất khi bảng đã khóa — người thuê đồng ý hoặc Chủ trọ tự chốt. Bảng ở Nháp hay đang
    /// chờ người thuê thì chưa. Số dư dương chưa trả đủ, kể cả đang chờ xác nhận lượt báo thanh toán, vẫn là đã khóa
    /// (FR-96).
    /// </summary>
    [Theory]
    [InlineData(InvoiceStatus.Nhap, false)]
    [InlineData(InvoiceStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(InvoiceStatus.ChuaThanhToan, true)]
    [InlineData(InvoiceStatus.ChoXacNhan, true)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, true)]
    [InlineData(InvoiceStatus.QuaHan, true)]
    [InlineData(InvoiceStatus.ChoHoanCoc, true)]
    [InlineData(InvoiceStatus.DaThanhToan, true)]
    public void IsSettlementLocked_SauKhiDongYHoacTuChot(InvoiceStatus status, bool expected)
    {
        Assert.Equal(expected, Settlement(status, 1_499_678).IsSettlementLocked);
    }

    [Fact]
    public void IsSettlementLocked_HoaDonDinhKy_False()
    {
        var invoice = Settlement(InvoiceStatus.ChuaThanhToan, 3_000_000);
        invoice.Type = InvoiceType.DinhKy;

        Assert.False(invoice.IsSettlementLocked);
    }

    // ---------------------------------------------------------------- Số dư âm: hoàn cọc

    /// <summary>
    /// FR-86 và quyết định 07/10: thời điểm hoàn cọc Chủ trọ nhập không trước lúc gửi thông báo trả phòng và không ở
    /// tương lai; sai thì service trả 422.
    /// </summary>
    [Theory]
    [InlineData(2026, 12, 1, 9, 0, true)]
    [InlineData(2026, 11, 30, 23, 59, false)]
    [InlineData(2026, 12, 16, 10, 0, true)]
    [InlineData(2026, 12, 20, 15, 0, true)]
    [InlineData(2026, 12, 20, 15, 1, false)]
    public void IsValidSettlementRefundTime_TuLucBaoTraPhongToiHienTai(
        int year, int month, int day, int hour, int minute, bool expected)
    {
        Assert.Equal(expected, ContractInSettlement().IsValidSettlementRefundTime(Vn(year, month, day, hour, minute), Now));
    }

    /// <summary>FR-58, FR-86: số dư −920.322 → hoàn 920.322 do hệ thống tính, ghi thời điểm và hình thức Chủ trọ nhập.</summary>
    [Fact]
    public void RecordSettlementRefund_GhiSoTienThoiDiemHinhThuc()
    {
        var contract = ContractInSettlement();

        contract.RecordSettlementRefund(920_322, Vn(2026, 12, 16, 10), PaymentMethod.ChuyenKhoan);

        Assert.Equal(920_322m, contract.DepositRefundedAmount);
        Assert.Equal(Vn(2026, 12, 16, 10), contract.DepositRefundedAt);
        Assert.Equal(PaymentMethod.ChuyenKhoan, contract.DepositRefundMethod);
        Assert.Null(contract.DepositRefundNote);
    }

    /// <summary>database-design mục 6.1: hóa đơn Chờ hoàn cọc sang Đã thanh toán khi Chủ trọ ghi nhận hoàn cọc.</summary>
    [Fact]
    public void CompleteDepositRefund_ChoHoanCoc_DaThanhToan()
    {
        var invoice = Settlement(InvoiceStatus.ChoHoanCoc, -920_322);

        invoice.CompleteDepositRefund(Now);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(Now, invoice.SettledAt);
    }

    [Theory]
    [InlineData(InvoiceStatus.ChuaThanhToan)]
    [InlineData(InvoiceStatus.DaThanhToan)]
    public void CompleteDepositRefund_KhongChoHoanCoc_NemLoi(InvoiceStatus status)
    {
        var invoice = Settlement(status, 1_499_678);

        Assert.Throws<InvalidOperationException>(() => invoice.CompleteDepositRefund(Now));
        Assert.Equal(status, invoice.Status);
    }

    // ---------------------------------------------------------------- Hợp đồng và phòng

    /// <summary>FR-59: hợp đồng Đang thanh lý → Đã thanh lý, ghi thời điểm hoàn tất.</summary>
    [Fact]
    public void CompleteSettlement_DaThanhLy_GhiTerminatedAt()
    {
        var contract = ContractInSettlement();

        contract.CompleteSettlement(Now);

        Assert.Equal(ContractStatus.DaThanhLy, contract.Status);
        Assert.Equal(Now, contract.TerminatedAt);
        Assert.True(contract.IsClosed);
    }

    [Theory]
    [InlineData(ContractStatus.DangThanhLy, true)]
    [InlineData(ContractStatus.DangHieuLuc, false)]
    [InlineData(ContractStatus.SapHetHan, false)]
    [InlineData(ContractStatus.DaThanhLy, false)]
    public void CanCompleteSettlement_ChiKhiDangThanhLy(ContractStatus status, bool expected)
    {
        var contract = ContractInSettlement();
        contract.Status = status;

        Assert.Equal(expected, contract.CanCompleteSettlement);
    }

    [Fact]
    public void CompleteSettlement_DaThanhLy_NemLoiVaGiuNguyen()
    {
        var contract = ContractInSettlement();
        contract.CompleteSettlement(Now);

        Assert.Throws<InvalidOperationException>(() => contract.CompleteSettlement(Now.AddDays(1)));
        Assert.Equal(Now, contract.TerminatedAt);
    }

    /// <summary>FR-59: phòng đang thuê chuyển Bảo trì hoặc Trống theo lựa chọn của Chủ trọ.</summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.Trong)]
    [InlineData(RoomOccupancyStatus.BaoTri)]
    public void ReleaseAfterSettlement_DangThue_VeTrangThaiChuTroChon(RoomOccupancyStatus next)
    {
        var room = new Room { OccupancyStatus = RoomOccupancyStatus.DangThue };

        room.ReleaseAfterSettlement(next);

        Assert.Equal(next, room.OccupancyStatus);
    }

    /// <summary>Sau thanh lý chỉ về Trống hoặc Bảo trì; phòng không ở Đang thuê là dữ liệu sai.</summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.DangThue, RoomOccupancyStatus.LuuTru)]
    [InlineData(RoomOccupancyStatus.DangThue, RoomOccupancyStatus.DangGiuCho)]
    [InlineData(RoomOccupancyStatus.Trong, RoomOccupancyStatus.BaoTri)]
    public void ReleaseAfterSettlement_SaiTrangThai_NemLoi(RoomOccupancyStatus current, RoomOccupancyStatus next)
    {
        var room = new Room { OccupancyStatus = current };

        Assert.Throws<InvalidOperationException>(() => room.ReleaseAfterSettlement(next));
        Assert.Equal(current, room.OccupancyStatus);
    }
}
