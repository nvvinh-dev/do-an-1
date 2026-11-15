import { describe, expect, it } from 'vitest'
import { getMaxUploadBytes, validateImageFile } from '@/utils/validateImageFile'

const MB = 1024 * 1024

function image(sizeInBytes: number, type = 'image/jpeg') {
  return { name: 'phong-101.jpg', size: sizeInBytes, type }
}

describe('getMaxUploadBytes', () => {
  it('ảnh công khai tối đa 5 MB', () => {
    expect(getMaxUploadBytes('AnhKhuTro')).toBe(5 * MB)
    expect(getMaxUploadBytes('AnhPhong')).toBe(5 * MB)
  })

  it('file riêng tư tối đa 10 MB', () => {
    expect(getMaxUploadBytes('GiayToNhanThan')).toBe(10 * MB)
    expect(getMaxUploadBytes('AnhDongHo')).toBe(10 * MB)
    expect(getMaxUploadBytes('MinhChungThanhToan')).toBe(10 * MB)
    expect(getMaxUploadBytes('AnhHuHong')).toBe(10 * MB)
  })
})

describe('validateImageFile', () => {
  it('nhận ảnh đúng định dạng, trong giới hạn', () => {
    expect(validateImageFile(image(2 * MB), 'AnhPhong')).toBeNull()
    expect(validateImageFile(image(5 * MB, 'image/png'), 'AnhPhong')).toBeNull()
    expect(validateImageFile(image(9 * MB, 'image/webp'), 'AnhDongHo')).toBeNull()
  })

  it('chặn ảnh công khai quá 5 MB (6 MB bị chặn trước khi gửi)', () => {
    expect(validateImageFile(image(6 * MB), 'AnhKhuTro')).toBe(
      '"phong-101.jpg" lớn hơn 5 MB. Vui lòng chọn ảnh nhẹ hơn.',
    )
    expect(validateImageFile(image(5 * MB + 1), 'AnhPhong')).not.toBeNull()
  })

  it('cùng dung lượng 6 MB vẫn nhận với file riêng tư, chặn khi quá 10 MB', () => {
    expect(validateImageFile(image(6 * MB), 'MinhChungThanhToan')).toBeNull()
    expect(validateImageFile(image(10 * MB + 1), 'MinhChungThanhToan')).toBe(
      '"phong-101.jpg" lớn hơn 10 MB. Vui lòng chọn ảnh nhẹ hơn.',
    )
  })

  it('chặn định dạng không nhận (HEIC, GIF, PDF)', () => {
    expect(validateImageFile(image(MB, 'image/heic'), 'AnhPhong')).toBe(
      '"phong-101.jpg" không phải ảnh JPEG, PNG hoặc WebP.',
    )
    expect(validateImageFile(image(MB, 'image/gif'), 'AnhPhong')).not.toBeNull()
    expect(validateImageFile(image(MB, 'application/pdf'), 'AnhPhong')).not.toBeNull()
  })

  it('trình duyệt không khai loại file thì để server quyết định', () => {
    expect(validateImageFile(image(MB, ''), 'AnhPhong')).toBeNull()
  })
})
