/**
 * Tài khoản nhận tiền của Chủ trọ (docs/api-design.md mục 2.1, BR-26): response của
 * `GET /landlord/bank-account` (`null` khi chưa khai báo) và `PUT /landlord/bank-account`.
 * Cũng là body của `PUT`; cả ba trường bắt buộc.
 */
export interface BankAccount {
  /** Mã BIN 6 chữ số của ngân hàng theo chuẩn VietQR, tra tên ở `utils/vietQrBanks.ts`. */
  bankBin: string
  accountNumber: string
  accountName: string
}
