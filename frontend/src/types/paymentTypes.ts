/** Hình thức tiền của nhận cọc, hoàn cọc và hoàn tất thanh lý (docs/api-design.md mục 8, "Hình thức tiền"). */
export type PaymentMethod = 'TienMat' | 'ChuyenKhoan'

/**
 * Trường `paymentQr` của hợp đồng chờ nhận cọc và hóa đơn chưa thanh toán (docs/api-design.md mục 9.1).
 * Trình duyệt tự dựng chuỗi VietQR từ các trường này, không gửi ra dịch vụ bên ngoài.
 */
export interface PaymentQr {
  bankBin: string
  accountNumber: string
  accountName: string
  amount: number
  transferContent: string
}
