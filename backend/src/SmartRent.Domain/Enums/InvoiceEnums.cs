namespace SmartRent.Domain.Enums;

/// <summary>Loại hóa đơn.</summary>
public enum InvoiceType
{
    DinhKy,
    ThanhLy,
    DieuChinh
}

/// <summary>Vòng đời hóa đơn.</summary>
public enum InvoiceStatus
{
    Nhap,
    ChuaThanhToan,
    ChoXacNhan,
    ThanhToanMotPhan,
    QuaHan,
    DaThanhToan,
    DaHuy
}

/// <summary>Loại khoản mục trong hóa đơn.</summary>
public enum InvoiceLineCategory
{
    CongNoKyTruoc,
    BoiThuongHuHong,
    PhiPhat,
    KhauTruTienCoc,
    DieuChinhKhac
}

/// <summary>Vòng đời một lượt người thuê báo đã thanh toán.</summary>
public enum PaymentReportStatus
{
    ChoXacNhan,
    DaXacNhan,
    TuChoiXacNhan
}
