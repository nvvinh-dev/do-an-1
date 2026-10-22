/** 5 tông màu của trạng thái (docs/design-system.md mục 7); `StatusBadge` đổi tông thành class màu. */
export type StatusTone = 'neutral' | 'success' | 'pending' | 'info' | 'danger'

interface StatusDisplay {
  label: string
  tone: StatusTone
}

const neutral = (label: string): StatusDisplay => ({ label, tone: 'neutral' })
const success = (label: string): StatusDisplay => ({ label, tone: 'success' })
const pending = (label: string): StatusDisplay => ({ label, tone: 'pending' })
const info = (label: string): StatusDisplay => ({ label, tone: 'info' })
const danger = (label: string): StatusDisplay => ({ label, tone: 'danger' })

/**
 * Nhãn tiếng Việt và tông của từng mã trạng thái, giữ đúng bảng ở docs/design-system.md mục 7.
 * Trang không tự viết lại nhãn; muốn đổi nhãn hay tông thì đổi ở đây và ở tài liệu.
 */
const STATUS_DISPLAYS = {
  property: {
    DangKhaiThac: success('Đang khai thác'),
    LuuTru: neutral('Lưu trữ'),
  },
  // Trạng thái khai thác của phòng (`occupancyStatus`).
  roomOccupancy: {
    Trong: success('Trống'),
    DangGiuCho: pending('Đang giữ chỗ'),
    DangThue: info('Đang thuê'),
    BaoTri: neutral('Bảo trì'),
    LuuTru: neutral('Lưu trữ'),
  },
  // Trạng thái hiển thị của phòng (`visibilityStatus`).
  roomVisibility: {
    DangHienThi: success('Đang hiển thị'),
    DaAnBoiChuTro: neutral('Đã ẩn'),
    DaAnBoiAdmin: danger('Bị Admin ẩn'),
  },
  rentalRequest: {
    ChoDuyet: pending('Chờ duyệt'),
    DaDuyet: success('Đã duyệt'),
    DaLapHopDong: info('Đã lập hợp đồng'),
    TuChoi: danger('Từ chối'),
    DaHuy: neutral('Đã hủy'),
    HetHan: neutral('Hết hạn'),
  },
  contract: {
    Nhap: neutral('Nháp'),
    ChoNguoiThueXacNhan: pending('Chờ người thuê xác nhận'),
    ChoNhanCoc: pending('Chờ nhận cọc'),
    DangHieuLuc: success('Đang hiệu lực'),
    SapHetHan: pending('Sắp hết hạn'),
    DangThanhLy: info('Đang thanh lý'),
    DaThanhLy: neutral('Đã thanh lý'),
    DaHuy: neutral('Đã hủy'),
  },
  invoice: {
    Nhap: neutral('Nháp'),
    ChuaThanhToan: pending('Chưa thanh toán'),
    ChoXacNhan: pending('Chờ xác nhận'),
    ThanhToanMotPhan: pending('Thanh toán một phần'),
    QuaHan: danger('Quá hạn'),
    DaThanhToan: success('Đã thanh toán'),
    DaHuy: neutral('Đã hủy'),
    DaChuyenThanhLy: info('Đã chuyển vào thanh lý'),
    ChoNguoiThueXacNhan: pending('Chờ người thuê xác nhận'),
    ChoHoanCoc: pending('Chờ hoàn cọc'),
  },
  // Lượt báo thanh toán của Người thuê.
  paymentReport: {
    ChoXacNhan: pending('Chờ xác nhận'),
    DaXacNhan: success('Đã xác nhận'),
    TuChoiXacNhan: danger('Bị từ chối'),
  },
  landlordApplication: {
    ChoDuyet: pending('Chờ duyệt'),
    DaDuyet: success('Đã duyệt'),
    TuChoi: danger('Từ chối'),
    DaThuHoi: danger('Đã thu hồi'),
  },
  // Lời mời ở ghép (Phase 2).
  coTenantInvitation: {
    ChoPhanHoi: pending('Chờ phản hồi'),
    DaChapNhan: success('Đã chấp nhận'),
    TuChoi: danger('Từ chối'),
    DaRut: neutral('Đã rút'),
  },
} as const satisfies Record<string, Record<string, StatusDisplay>>

/** Loại đối tượng có trạng thái; cùng một mã (như `DaHuy`) có thể mang nhãn khác nhau theo loại. */
export type StatusKind = keyof typeof STATUS_DISPLAYS

/**
 * Nhãn và tông của một mã trạng thái. Mã lạ (server thêm trạng thái mà frontend chưa cập nhật)
 * hiện nguyên mã với tông trung tính, để trang vẫn dùng được thay vì trống nhãn.
 */
export function getStatusDisplay(kind: StatusKind, status: string): StatusDisplay {
  const displays: Record<string, StatusDisplay> = STATUS_DISPLAYS[kind]
  return Object.hasOwn(displays, status) ? displays[status] : neutral(status)
}
