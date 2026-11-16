import { describe, expect, it } from 'vitest'
import { getLandlordMaintenanceActions } from '@/utils/getLandlordMaintenanceActions'

// Người thuê gửi lúc 08:00 ngày 10/11 giờ Việt Nam; quá 72 giờ từ sau 08:00 ngày 13/11.
const CREATED_AT = '2026-11-10T01:00:00Z'
const OVERDUE_AT = '2026-11-13T01:00:00Z'

describe('getLandlordMaintenanceActions', () => {
  it('sự cố mới tiếp nhận hoặc từ chối được', () => {
    expect(getLandlordMaintenanceActions({ status: 'Moi', createdAt: CREATED_AT }, new Date(CREATED_AT))).toEqual({
      canAccept: true,
      canChangeExpectedCompletionDate: false,
      canComplete: false,
      canReject: true,
      isAcceptOverdue: false,
    })
  })

  it('đang xử lý thì báo sửa xong, sửa ngày dự kiến, từ chối được', () => {
    expect(getLandlordMaintenanceActions({ status: 'DangXuLy', createdAt: CREATED_AT }, new Date(OVERDUE_AT))).toEqual({
      canAccept: false,
      canChangeExpectedCompletionDate: true,
      canComplete: true,
      canReject: true,
      isAcceptOverdue: false,
    })
  })

  it('chờ người thuê và các trạng thái kết thúc không có nút nào', () => {
    for (const status of ['ChoNguoiThueXacNhan', 'DaDong', 'TuChoi', 'DaHuy'] as const) {
      expect(getLandlordMaintenanceActions({ status, createdAt: CREATED_AT }, new Date(OVERDUE_AT))).toEqual({
        canAccept: false,
        canChangeExpectedCompletionDate: false,
        canComplete: false,
        canReject: false,
        isAcceptOverdue: false,
      })
    }
  })

  it('đúng mốc 72 giờ chưa tính là quá hạn', () => {
    expect(
      getLandlordMaintenanceActions({ status: 'Moi', createdAt: CREATED_AT }, new Date(OVERDUE_AT)).isAcceptOverdue,
    ).toBe(false)
  })

  it('qua mốc 72 giờ thì cảnh báo nhưng vẫn tiếp nhận được', () => {
    const actions = getLandlordMaintenanceActions(
      { status: 'Moi', createdAt: CREATED_AT },
      new Date(new Date(OVERDUE_AT).getTime() + 1),
    )
    expect(actions.isAcceptOverdue).toBe(true)
    expect(actions.canAccept).toBe(true)
  })
})
