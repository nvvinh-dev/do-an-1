import type { PaymentQr } from '@/types/paymentTypes'

/** Mã định danh của NAPAS trong mã QR (GUID của dịch vụ chuyển nhanh NAPAS247). */
const NAPAS_GUID = 'A000000727'
/** Mã dịch vụ chuyển nhanh tới số tài khoản (tới số thẻ là `QRIBFTTC`, hệ thống không dùng). */
const TRANSFER_TO_ACCOUNT_SERVICE = 'QRIBFTTA'
/** Mã số 704 của đồng Việt Nam theo ISO 4217. */
const VND_CURRENCY_CODE = '704'
/** Mã QR có sẵn số tiền, dùng cho một lần thanh toán. Mã không có số tiền là `11`. */
const DYNAMIC_QR = '12'
/** Độ dài tối đa của giá trị một trường: phần độ dài chỉ có 2 chữ số. */
const MAX_FIELD_LENGTH = 99

/**
 * Dựng chuỗi dữ liệu của mã VietQR từ trường `paymentQr` do server trả (docs/api-design.md mục 9.1),
 * theo đặc tả mã QR chuyển nhanh NAPAS247 dựa trên chuẩn EMVCo Merchant-Presented Mode. Mỗi trường
 * gồm mã 2 chữ số, độ dài 2 chữ số rồi tới giá trị; cuối chuỗi là mã kiểm tra CRC.
 *
 * Số tiền và nội dung lấy nguyên từ server, không tính lại. Tên chủ tài khoản không đưa vào mã:
 * ứng dụng ngân hàng tự tra tên theo số tài khoản, `accountName` chỉ để hiện cạnh mã cho người thuê
 * đối chiếu.
 *
 * @throws RangeError khi số tiền không phải số đồng nguyên dương hoặc một trường dài quá 99 ký tự.
 */
export function buildVietQrPayload(paymentQr: PaymentQr): string {
  const { bankBin, accountNumber, amount, transferContent } = paymentQr
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError(`Số tiền của mã VietQR phải là số đồng nguyên dương: ${amount}`)
  }

  const beneficiary = field('00', bankBin) + field('01', accountNumber)
  const merchantAccount =
    field('00', NAPAS_GUID) + field('01', beneficiary) + field('02', TRANSFER_TO_ACCOUNT_SERVICE)

  const payload =
    field('00', '01') +
    field('01', DYNAMIC_QR) +
    field('38', merchantAccount) +
    field('53', VND_CURRENCY_CODE) +
    field('54', String(amount)) +
    field('58', 'VN') +
    field('62', field('08', transferContent)) +
    // Mã kiểm tra tính trên cả mã và độ dài của chính trường này.
    '6304'

  return payload + crc16CcittFalse(payload)
}

function field(id: string, value: string): string {
  if (value.length > MAX_FIELD_LENGTH) {
    throw new RangeError(`Trường ${id} của mã VietQR dài quá ${MAX_FIELD_LENGTH} ký tự`)
  }
  return id + String(value.length).padStart(2, '0') + value
}

/** CRC-16/CCITT-FALSE: đa thức 0x1021, giá trị đầu 0xFFFF; trả 4 chữ số hex viết hoa. */
function crc16CcittFalse(text: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}
