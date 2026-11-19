import { describe, expect, it } from 'vitest'
import { getMaintenanceAutoCloseAt, getTenantMaintenanceActions } from '@/utils/getTenantMaintenanceActions'

// Chủ trọ báo sửa xong lúc 08:00 ngày 10/11 giờ Việt Nam; tự đóng lúc 08:00 ngày 17/11.
const COMPLETED_AT = '2026-11-10T01:00:00Z'
const AUTO_CLOSE_AT = '2026-11-17T01:00:00Z'

describe('getMaintenanceAutoCloseAt', () => {
  it('cộng 168 giờ vào lần báo sửa xong gần nhất', () => {
    expect(getMaintenanceAutoCloseAt(COMPLETED_AT)?.toISOString()).toBe('2026-11-17T01:00:00.000Z')
  })

  it('chưa báo sửa xong thì không có mốc', () => {
    expect(getMaintenanceAutoCloseAt(null)).toBeNull()
  })
})

describe('getTenantMaintenanceActions', () => {
  const awaiting = { status: 'ChoNguoiThueXacNhan' as const, completedAt: COMPLETED_AT }

  it('sự cố mới và đang xử lý chỉ hủy được', () => {
    for (const status of ['Moi', 'DangXuLy'] as const) {
      expect(getTenantMaintenanceActions({ status, completedAt: null }, new Date(COMPLETED_AT))).toEqual({
        canConfirm: false,
        canReportNotFixed: false,
        canCancel: true,
        isAutoCloseOverdue: false,
      })
    }
  })

  it('chờ xác nhận trong 168 giờ thì xác nhận hoặc báo chưa đạt được, không hủy được', () => {
    expect(getTenantMaintenanceActions(awaiting, new Date('2026-11-16T01:00:00Z'))).toEqual({
      canConfirm: true,
      canReportNotFixed: true,
      canCancel: false,
      isAutoCloseOverdue: false,
    })
  })

  it('đúng mốc 168 giờ vẫn báo chưa đạt được', () => {
    expect(getTenantMaintenanceActions(awaiting, new Date(AUTO_CLOSE_AT)).canReportNotFixed).toBe(true)
  })

  it('quá 168 giờ mà chưa tự đóng thì ẩn chưa đạt, vẫn xác nhận được', () => {
    const actions = getTenantMaintenanceActions(awaiting, new Date('2026-11-17T01:00:01Z'))
    expect(actions).toEqual({
      canConfirm: true,
      canReportNotFixed: false,
      canCancel: false,
      isAutoCloseOverdue: true,
    })
  })

  it('đã đóng, từ chối, đã hủy thì chỉ xem', () => {
    for (const status of ['DaDong', 'TuChoi', 'DaHuy'] as const) {
      const actions = getTenantMaintenanceActions({ status, completedAt: COMPLETED_AT }, new Date(AUTO_CLOSE_AT))
      expect(actions).toEqual({
        canConfirm: false,
        canReportNotFixed: false,
        canCancel: false,
        isAutoCloseOverdue: false,
      })
    }
  })
})
