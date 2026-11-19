using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Vòng đời sự cố — BP-08, FR-140 đến FR-146, tài liệu phân tích mục 8.6.</summary>
public class MaintenanceRequestLifecycleTests
{
    /// <summary>Người thuê gửi lúc 9 giờ 16/11/2026 giờ Việt Nam.</summary>
    private static readonly DateTimeOffset CreatedAt = new(2026, 11, 16, 9, 0, 0, TimeSpan.FromHours(7));

    private static MaintenanceRequest NewRequest() => MaintenanceRequest.Report(
        35, "Vòi sen bị rò nước", "Rò ở khớp nối.", MaintenanceUrgency.Gap, [], CreatedAt);

    private static MaintenanceRequest InStatus(MaintenanceRequestStatus status)
    {
        var request = NewRequest();
        request.Status = status;
        request.CompletedAt = status == MaintenanceRequestStatus.ChoNguoiThueXacNhan ? CreatedAt : null;
        return request;
    }

    [Fact]
    public void Accept_MoiSangDangXuLy_GhiNgayDuKienVaLanTiepNhanDau()
    {
        var request = NewRequest();
        var acceptedAt = CreatedAt.AddHours(2);

        request.Accept(new DateOnly(2026, 11, 20), acceptedAt);

        Assert.Equal(MaintenanceRequestStatus.DangXuLy, request.Status);
        Assert.Equal(acceptedAt, request.AcceptedAt);
        Assert.Equal(new DateOnly(2026, 11, 20), request.ExpectedCompletionDate);
    }

    [Fact]
    public void Accept_QuaBaMuoiHaiGioVanTiepNhanDuoc()
    {
        var request = NewRequest();
        var now = CreatedAt.AddHours(100);

        Assert.True(request.IsOverdueForAcceptance(now));
        Assert.True(request.CanAccept);

        request.Accept(null, now);

        Assert.Equal(MaintenanceRequestStatus.DangXuLy, request.Status);
        Assert.Null(request.ExpectedCompletionDate);
        Assert.False(request.IsOverdueForAcceptance(now));
    }

    [Fact]
    public void ChangeExpectedCompletionDate_ChiKhiDangXuLy()
    {
        var request = NewRequest();
        Assert.False(request.CanChangeExpectedCompletionDate);

        request.Accept(new DateOnly(2026, 11, 20), CreatedAt.AddHours(1));
        request.ChangeExpectedCompletionDate(new DateOnly(2026, 11, 25));

        Assert.Equal(new DateOnly(2026, 11, 25), request.ExpectedCompletionDate);
        Assert.Equal(MaintenanceRequestStatus.DangXuLy, request.Status);
    }

    [Theory]
    [InlineData(MaintenanceRequestStatus.Moi)]
    [InlineData(MaintenanceRequestStatus.DangXuLy)]
    public void Reject_TuMoiHoacDangXuLy_GhiLyDoVaBoiThuong(MaintenanceRequestStatus from)
    {
        var request = InStatus(from);
        var now = CreatedAt.AddHours(5);

        request.Reject("Vòi sen vỡ do va đập, người thuê tự chịu.", 300_000m, now);

        Assert.Equal(MaintenanceRequestStatus.TuChoi, request.Status);
        Assert.Equal("Vòi sen vỡ do va đập, người thuê tự chịu.", request.RejectionReason);
        Assert.Equal(300_000m, request.EstimatedCompensation);
        Assert.Equal(now, request.RejectedAt);
    }

    [Fact]
    public void Complete_GhiLanBaoSuaXongGanNhat()
    {
        var request = NewRequest();
        request.Accept(null, CreatedAt.AddHours(1));

        request.Complete(CreatedAt.AddDays(1));
        request.MarkNotFixed("Vẫn còn rò.", CreatedAt.AddDays(2));
        request.Complete(CreatedAt.AddDays(3));

        Assert.Equal(MaintenanceRequestStatus.ChoNguoiThueXacNhan, request.Status);
        Assert.Equal(CreatedAt.AddDays(3), request.CompletedAt);
        Assert.Equal(CreatedAt.AddDays(3).AddHours(168), request.ConfirmationDeadline);
        // Tiếp nhận lần đầu không bị ghi đè khi sự cố quay lại Đang xử lý.
        Assert.Equal(CreatedAt.AddHours(1), request.AcceptedAt);
    }

    [Fact]
    public void Confirm_TrongHan_DongKhongPhaiTuDong()
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);
        var now = CreatedAt.AddHours(168);

        request.Confirm(now);

        Assert.Equal(MaintenanceRequestStatus.DaDong, request.Status);
        Assert.Equal(now, request.ClosedAt);
        Assert.False(request.IsAutoClosed);
    }

    [Fact]
    public void Confirm_QuaHanMaTacVuChuaChay_KetQuaGiongTuDong()
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);

        request.Confirm(CreatedAt.AddHours(168).AddMinutes(1));

        Assert.Equal(MaintenanceRequestStatus.DaDong, request.Status);
        Assert.True(request.IsAutoClosed);
    }

    [Fact]
    public void MarkNotFixed_VeDangXuLy_GhiDeLyDoGanNhat()
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);
        request.NotFixedReason = "Lý do cũ.";

        request.MarkNotFixed("Vẫn còn rò ở khớp nối.", CreatedAt.AddHours(10));

        Assert.Equal(MaintenanceRequestStatus.DangXuLy, request.Status);
        Assert.Equal("Vẫn còn rò ở khớp nối.", request.NotFixedReason);
    }

    [Theory]
    [InlineData(167, true)]
    [InlineData(168, true)]    // đúng mốc 168 giờ vẫn còn trong hạn
    [InlineData(169, false)]   // quá hạn dù tác vụ định kỳ chưa kịp tự đóng
    public void CanMarkNotFixed_TrongMotTramSauMuoiTamGio(int hoursAfterCompleted, bool expected)
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);

        Assert.Equal(expected, request.CanMarkNotFixed(CreatedAt.AddHours(hoursAfterCompleted)));
    }

    [Theory]
    [InlineData(MaintenanceRequestStatus.Moi)]
    [InlineData(MaintenanceRequestStatus.DangXuLy)]
    public void Cancel_TuMoiHoacDangXuLy(MaintenanceRequestStatus from)
    {
        var request = InStatus(from);
        var now = CreatedAt.AddHours(3);

        request.Cancel(now);

        Assert.Equal(MaintenanceRequestStatus.DaHuy, request.Status);
        Assert.Equal(now, request.CancelledAt);
    }

    [Theory]
    [InlineData(168, false)]
    [InlineData(169, true)]
    public void ShouldAutoClose_QuaMotTramSauMuoiTamGioTuLanBaoSuaXong(int hoursAfterCompleted, bool expected)
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);

        Assert.Equal(expected, request.ShouldAutoClose(CreatedAt.AddHours(hoursAfterCompleted)));
    }

    [Fact]
    public void AutoClose_DaDongVaGhiLaTuDong()
    {
        var request = InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan);
        var now = CreatedAt.AddHours(170);

        request.AutoClose(now);

        Assert.Equal(MaintenanceRequestStatus.DaDong, request.Status);
        Assert.Equal(now, request.ClosedAt);
        Assert.True(request.IsAutoClosed);
    }

    [Theory]
    [InlineData(72, false)]
    [InlineData(73, true)]
    public void IsOverdueForAcceptance_QuaBaMuoiHaiGioKeTuLucGui(int hoursAfterCreated, bool expected)
    {
        Assert.Equal(expected, NewRequest().IsOverdueForAcceptance(CreatedAt.AddHours(hoursAfterCreated)));
    }

    [Theory]
    [InlineData(MaintenanceRequestStatus.DangXuLy)]
    [InlineData(MaintenanceRequestStatus.ChoNguoiThueXacNhan)]
    [InlineData(MaintenanceRequestStatus.DaDong)]
    public void IsOverdueForAcceptance_ChiXetSuCoMoi(MaintenanceRequestStatus status)
    {
        Assert.False(InStatus(status).IsOverdueForAcceptance(CreatedAt.AddDays(10)));
    }

    /// <summary>BR-05b: mọi chuyển tiếp ngoài sơ đồ đều bị chặn — service trả 409 dựa vào các điều kiện này.</summary>
    [Theory]
    [InlineData(MaintenanceRequestStatus.Moi, true, false, true, false, false, false, true)]
    [InlineData(MaintenanceRequestStatus.DangXuLy, false, true, true, true, false, false, true)]
    [InlineData(MaintenanceRequestStatus.ChoNguoiThueXacNhan, false, false, false, false, true, true, false)]
    [InlineData(MaintenanceRequestStatus.DaDong, false, false, false, false, false, false, false)]
    [InlineData(MaintenanceRequestStatus.TuChoi, false, false, false, false, false, false, false)]
    [InlineData(MaintenanceRequestStatus.DaHuy, false, false, false, false, false, false, false)]
    public void DieuKienChuyenTrangThai_DungSoDo(
        MaintenanceRequestStatus status,
        bool accept,
        bool changeDate,
        bool reject,
        bool complete,
        bool confirm,
        bool notFixed,
        bool cancel)
    {
        var request = InStatus(status);
        var now = CreatedAt.AddHours(1);

        Assert.Equal(accept, request.CanAccept);
        Assert.Equal(changeDate, request.CanChangeExpectedCompletionDate);
        Assert.Equal(reject, request.CanReject);
        Assert.Equal(complete, request.CanComplete);
        Assert.Equal(confirm, request.CanConfirm);
        Assert.Equal(notFixed, request.CanMarkNotFixed(now));
        Assert.Equal(cancel, request.CanCancel);
        Assert.Equal(status == MaintenanceRequestStatus.ChoNguoiThueXacNhan, request.ShouldAutoClose(now.AddDays(30)));
    }

    [Fact]
    public void ChuyenNgoaiSoDo_NemLoiLapTrinh()
    {
        var closed = InStatus(MaintenanceRequestStatus.DaDong);

        Assert.Throws<InvalidOperationException>(() => closed.Accept(null, CreatedAt));
        Assert.Throws<InvalidOperationException>(() => closed.Cancel(CreatedAt));
        Assert.Throws<InvalidOperationException>(() => NewRequest().Complete(CreatedAt));
        Assert.Throws<InvalidOperationException>(() => NewRequest().Confirm(CreatedAt));
        Assert.Throws<InvalidOperationException>(() =>
            InStatus(MaintenanceRequestStatus.ChoNguoiThueXacNhan).MarkNotFixed("x", CreatedAt.AddHours(200)));
    }
}
