import { describe, expect, it } from 'vitest'
import type { PaymentQr } from '@/types/paymentTypes'
import { buildVietQrPayload } from '@/utils/buildVietQrPayload'

const DEPOSIT_QR: PaymentQr = {
  bankBin: '970436',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN A',
  amount: 3000000,
  transferContent: 'SMARTRENT COC12',
}

describe('buildVietQrPayload', () => {
  it('khớp chuỗi mẫu công khai của mã chuyển khoản NAPAS247, kể cả mã kiểm tra', () => {
    // Mẫu trong README của thư viện vietqr_gen (pub.dev); mã kiểm tra 70FA đã đối chiếu lại bằng
    // một cài đặt CRC-16/CCITT-FALSE khác trước khi đưa vào test.
    const payload = buildVietQrPayload({
      bankBin: '970436',
      accountNumber: '1017595600',
      accountName: 'KHONG DUA VAO MA',
      amount: 180000,
      transferContent: 'thanh toan don hang',
    })

    expect(payload).toBe(
      '00020101021238540010A00000072701240006970436011010175956000208QRIBFTTA530370454061800005802VN62230819thanh toan don hang630470FA',
    )
  })

  it('dựng đủ các trường cho mã tiền cọc của hợp đồng', () => {
    expect(buildVietQrPayload(DEPOSIT_QR)).toBe(
      '000201' + // phiên bản dữ liệu
        '010212' + // mã có số tiền, dùng một lần
        '3854' +
        '0010A000000727' + // NAPAS
        '0124' +
        '0006970436' + // mã BIN ngân hàng
        '01100123456789' + // số tài khoản
        '0208QRIBFTTA' + // chuyển tới số tài khoản
        '5303704' + // VND
        '54073000000' + // số tiền
        '5802VN' +
        '6219' +
        '0815SMARTRENT COC12' + // nội dung chuyển khoản
        '63042DA6',
    )
  })

  it('không đưa tên chủ tài khoản vào mã', () => {
    expect(buildVietQrPayload(DEPOSIT_QR)).not.toContain('NGUYEN VAN A')
  })

  it('từ chối số tiền không phải số đồng nguyên dương', () => {
    expect(() => buildVietQrPayload({ ...DEPOSIT_QR, amount: 0 })).toThrow(RangeError)
    expect(() => buildVietQrPayload({ ...DEPOSIT_QR, amount: 1500.5 })).toThrow(RangeError)
  })

  it('từ chối trường dài quá 99 ký tự vì phần độ dài chỉ có 2 chữ số', () => {
    expect(() => buildVietQrPayload({ ...DEPOSIT_QR, transferContent: 'A'.repeat(96) })).toThrow(RangeError)
  })
})
