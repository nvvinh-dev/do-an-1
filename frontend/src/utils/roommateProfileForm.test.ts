import { describe, expect, it } from 'vitest'
import type { MyRoommateProfile } from '@/types/roommateTypes'
import {
  OTHER_SCHOOL,
  toRoommateProfileFormValues,
  toRoommateProfileRequest,
  validateBudget,
  validateBudgetMax,
  validateMoveInFrom,
} from '@/utils/roommateProfileForm'

const profile: MyRoommateProfile = {
  id: 7,
  gender: 'Nu',
  preferredRoommateGender: 'ChiNu',
  city: 'Thành phố Hồ Chí Minh',
  ward: null,
  budgetMin: 1_500_000,
  budgetMax: 2_500_000,
  sleepTime: 'Tu23Den1Gio',
  smokes: false,
  hasPet: true,
  cooking: 'ThinhThoang',
  noiseLevel: 'YenTinh',
  occupationType: 'SinhVien',
  schoolCode: null,
  organizationName: 'Đại học Bách khoa',
  moveInFrom: '2026-12-01',
  visibility: 'ChiKhiToiKetNoi',
  isSearching: true,
  updatedAt: '2026-11-20T08:00:00Z',
}

describe('validateBudget', () => {
  it('nhận số đồng nguyên, kể cả kiểu gõ có dấu chấm hàng nghìn', () => {
    expect(validateBudget('2000000')).toBe(true)
    expect(validateBudget('2.000.000')).toBe(true)
  })

  it('từ chối ô trống, số 0 và số lẻ', () => {
    expect(validateBudget('')).toBe('Vui lòng nhập số tiền.')
    expect(validateBudget('0')).toBe('Số tiền phải lớn hơn 0.')
    expect(validateBudget('1500000.5')).toBe('Nhập số đồng nguyên, không có phần lẻ.')
  })
})

describe('validateBudgetMax', () => {
  it('tối đa bằng tối thiểu vẫn hợp lệ (khoảng chỉ là một số)', () => {
    expect(validateBudgetMax('2.000.000', '2000000')).toBe(true)
  })

  it('tối đa nhỏ hơn tối thiểu thì báo lỗi', () => {
    expect(validateBudgetMax('1.000.000', '2.000.000')).toBe('Ngân sách tối đa phải lớn hơn hoặc bằng tối thiểu.')
  })

  it('ô tối thiểu còn sai thì không so, chỉ báo lỗi ở ô tối thiểu', () => {
    expect(validateBudgetMax('1000000', '')).toBe(true)
  })
})

describe('validateMoveInFrom', () => {
  it('hôm nay và sau hôm nay hợp lệ, trước hôm nay thì không', () => {
    expect(validateMoveInFrom('2026-11-21', '2026-11-21')).toBe(true)
    expect(validateMoveInFrom('2026-12-01', '2026-11-21')).toBe(true)
    expect(validateMoveInFrom('2026-11-20', '2026-11-21')).toBe('Thời điểm chuyển vào không được trước hôm nay.')
    expect(validateMoveInFrom('', '2026-11-21')).toBe('Vui lòng chọn thời điểm chuyển vào.')
  })
})

describe('toRoommateProfileRequest', () => {
  it('đổi ngược giá trị form của hồ sơ đang có ra đúng các tiêu chí ban đầu', () => {
    const request = toRoommateProfileRequest(toRoommateProfileFormValues(profile))
    expect(request).toEqual({
      gender: profile.gender,
      preferredRoommateGender: profile.preferredRoommateGender,
      city: profile.city,
      ward: profile.ward,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      sleepTime: profile.sleepTime,
      smokes: profile.smokes,
      hasPet: profile.hasPet,
      cooking: profile.cooking,
      noiseLevel: profile.noiseLevel,
      occupationType: profile.occupationType,
      schoolCode: null,
      organizationName: profile.organizationName,
      moveInFrom: profile.moveInFrom,
      visibility: profile.visibility,
    })
  })

  it('phường trống gửi null, ngân sách bỏ dấu chấm, tên trường bỏ khoảng trắng hai đầu', () => {
    const request = toRoommateProfileRequest({
      ...toRoommateProfileFormValues(profile),
      ward: '',
      budgetMin: '1.500.000',
      organizationName: '  Đại học Bách khoa  ',
    })
    expect(request.ward).toBeNull()
    expect(request.budgetMin).toBe(1_500_000)
    expect(request.organizationName).toBe('Đại học Bách khoa')
  })

  it('hồ sơ sinh viên chưa có mã trường mở lại ở Trường khác, giữ tên đã gõ', () => {
    const values = toRoommateProfileFormValues(profile)
    expect(values.schoolCode).toBe(OTHER_SCHOOL)
    expect(values.organizationName).toBe('Đại học Bách khoa')
  })

  it('chọn trường trong danh mục thì gửi mã, không gửi tên', () => {
    const uit = { ...profile, schoolCode: 'uit', organizationName: 'Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM' }
    const values = toRoommateProfileFormValues(uit)
    expect(values.schoolCode).toBe('uit')
    expect(values.organizationName).toBe('')

    const request = toRoommateProfileRequest({ ...values, organizationName: 'chữ còn sót' })
    expect(request.schoolCode).toBe('uit')
    expect(request.organizationName).toBeNull()
  })

  it('đi làm thì gửi tên công ty, bỏ qua mã trường đã chọn trước khi đổi loại', () => {
    const request = toRoommateProfileRequest({
      ...toRoommateProfileFormValues(profile),
      occupationType: 'DiLam',
      schoolCode: 'uit',
      organizationName: ' FPT Software ',
    })
    expect(request.schoolCode).toBeNull()
    expect(request.organizationName).toBe('FPT Software')
  })
})
