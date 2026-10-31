import { describe, expect, it } from 'vitest'
import { searchWards } from '@/utils/searchWards'

// Trích theo đúng thứ tự trong danh mục của backend (Data/locations.json).
const HCM_WARDS = [
  'Phường An Phú',
  'Phường Tân Phước',
  'Phường An Phú Đông',
  'Phường Tân Phú',
  'Phường Tân Sơn Nhất',
  'Phường Tân Sơn Hòa',
  'Phường Tân Sơn',
  'Phường Tân Sơn Nhì',
  'Phường Phú Thọ Hòa',
  'Phường Phú Thọ',
]

const HANOI_WARDS = [
  'Phường Ngọc Hà',
  'Phường Hồng Hà',
  'Phường Đống Đa',
  'Phường Hai Bà Trưng',
  'Phường Thanh Xuân',
  'Xã Đông Anh',
  'Xã Phù Đổng',
  'Phường Đông Ngạc',
  'Phường Hà Đông',
]

describe('searchWards', () => {
  it('gõ đúng tên phường thì phường đó đứng đầu, trước các phường có tên bắt đầu bằng tên đó', () => {
    expect(searchWards(HCM_WARDS, 'tan son')).toEqual([
      'Phường Tân Sơn',
      'Phường Tân Sơn Nhất',
      'Phường Tân Sơn Hòa',
      'Phường Tân Sơn Nhì',
    ])
    expect(searchWards(HCM_WARDS, 'phu tho')[0]).toBe('Phường Phú Thọ')
    expect(searchWards(HCM_WARDS, 'Phường Phú Thọ')[0]).toBe('Phường Phú Thọ')
  })

  it('tên bắt đầu bằng chữ gõ đứng trước tên chỉ chứa chữ gõ ở giữa từ', () => {
    // "Tân Phước", "Tân Phú" chứa "an phu" trong "tAN PHU...".
    expect(searchWards(HCM_WARDS, 'an phu')).toEqual([
      'Phường An Phú',
      'Phường An Phú Đông',
      'Phường Tân Phước',
      'Phường Tân Phú',
    ])
  })

  it('xếp theo mức: đầu tên → đầu một từ → giữa từ; cùng mức thì giữ thứ tự danh mục', () => {
    expect(searchWards(HANOI_WARDS, 'dong')).toEqual([
      'Phường Đống Đa',
      'Xã Đông Anh',
      'Phường Đông Ngạc',
      'Xã Phù Đổng',
      'Phường Hà Đông',
    ])
    expect(searchWards(HANOI_WARDS, 'ha')).toEqual([
      'Phường Hai Bà Trưng',
      'Phường Hà Đông',
      'Phường Ngọc Hà',
      'Phường Hồng Hà',
      'Phường Thanh Xuân',
    ])
  })

  it('cùng mức "đầu một từ" thì chỗ khớp sớm hơn đứng trước', () => {
    expect(searchWards(['Xã Phù Đổng', 'Phường Ngọc Hà Đông'], 'dong')).toEqual(['Xã Phù Đổng', 'Phường Ngọc Hà Đông'])
    expect(searchWards(['Phường Ngọc Hà Đông', 'Xã Phù Đổng'], 'dong')).toEqual(['Xã Phù Đổng', 'Phường Ngọc Hà Đông'])
  })

  it('chữ gõ rỗng thì trả đủ danh sách theo thứ tự gốc', () => {
    expect(searchWards(HCM_WARDS, '')).toEqual(HCM_WARDS)
    expect(searchWards(HCM_WARDS, '   ')).toEqual(HCM_WARDS)
  })

  it('không khớp phường/xã nào thì trả danh sách rỗng', () => {
    expect(searchWards(HCM_WARDS, 'xyz')).toEqual([])
  })
})
