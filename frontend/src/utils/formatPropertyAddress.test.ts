import { describe, expect, it } from 'vitest'
import { formatPropertyAddress } from '@/utils/formatPropertyAddress'

describe('formatPropertyAddress', () => {
  it('ghép số nhà, phường/xã, tỉnh/thành', () => {
    expect(
      formatPropertyAddress({
        address: '12 đường số 5',
        ward: 'Phường Linh Xuân',
        city: 'Thành phố Hồ Chí Minh',
      }),
    ).toBe('12 đường số 5, Phường Linh Xuân, Thành phố Hồ Chí Minh')
  })

  it('bỏ phần trống, không để dấu phẩy thừa', () => {
    expect(formatPropertyAddress({ address: ' ', ward: 'Phường Ba Đình', city: 'Thành phố Hà Nội' })).toBe(
      'Phường Ba Đình, Thành phố Hà Nội',
    )
  })
})
