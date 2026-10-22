import { describe, expect, it } from 'vitest'
import { getStatusDisplay } from '@/utils/statusLabels'

describe('getStatusDisplay', () => {
  it('trả nhãn có dấu và tông đúng bảng ở design-system mục 7', () => {
    expect(getStatusDisplay('property', 'DangKhaiThac')).toEqual({ label: 'Đang khai thác', tone: 'success' })
    expect(getStatusDisplay('roomOccupancy', 'DangGiuCho')).toEqual({ label: 'Đang giữ chỗ', tone: 'pending' })
    expect(getStatusDisplay('roomVisibility', 'DaAnBoiAdmin')).toEqual({ label: 'Bị Admin ẩn', tone: 'danger' })
    expect(getStatusDisplay('rentalRequest', 'DaLapHopDong')).toEqual({ label: 'Đã lập hợp đồng', tone: 'info' })
    expect(getStatusDisplay('contract', 'SapHetHan')).toEqual({ label: 'Sắp hết hạn', tone: 'pending' })
    expect(getStatusDisplay('invoice', 'QuaHan')).toEqual({ label: 'Quá hạn', tone: 'danger' })
    expect(getStatusDisplay('paymentReport', 'TuChoiXacNhan')).toEqual({ label: 'Bị từ chối', tone: 'danger' })
    expect(getStatusDisplay('landlordApplication', 'DaThuHoi')).toEqual({ label: 'Đã thu hồi', tone: 'danger' })
    expect(getStatusDisplay('coTenantInvitation', 'DaRut')).toEqual({ label: 'Đã rút', tone: 'neutral' })
  })

  it('cùng một mã có thể mang nhãn hay tông khác nhau theo loại đối tượng', () => {
    expect(getStatusDisplay('rentalRequest', 'ChoDuyet')).toEqual({ label: 'Chờ duyệt', tone: 'pending' })
    expect(getStatusDisplay('invoice', 'ChoXacNhan')).toEqual({ label: 'Chờ xác nhận', tone: 'pending' })
    expect(getStatusDisplay('landlordApplication', 'TuChoi').tone).toBe('danger')
    expect(getStatusDisplay('roomOccupancy', 'LuuTru').tone).toBe('neutral')
  })

  it('mã lạ hiện nguyên mã với tông trung tính', () => {
    expect(getStatusDisplay('contract', 'TrangThaiMoi')).toEqual({ label: 'TrangThaiMoi', tone: 'neutral' })
  })

  it('không nhận nhầm khóa có sẵn của Object làm mã trạng thái', () => {
    expect(getStatusDisplay('invoice', 'constructor')).toEqual({ label: 'constructor', tone: 'neutral' })
  })
})
