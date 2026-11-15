import { api } from '@/lib/api'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import type {
  CompleteSettlementRequest,
  FinalizeSettlementRequest,
  SettlementInvoiceRequest,
} from '@/types/settlementTypes'

// Bảng thanh lý (docs/api-design.md mục 10): Chủ trọ lập, sửa, gửi, tự chốt, hoàn tất; Người thuê đồng ý hoặc
// yêu cầu sửa.

// Chỉ khi hợp đồng `DangThanhLy`, chưa có bảng, `moveOutDate` không sau hôm nay; còn hóa đơn định kỳ nháp,
// lượt báo thanh toán chờ xác nhận, hoặc kỳ không thuộc hai trường hợp của FR-93 trả `409`. Dòng sai,
// chỉ số nhỏ hơn chỉ số cũ, ảnh sai trả `422`. Trả `201` kèm chi tiết hóa đơn ở `Nhap`.
export async function createSettlementInvoice(
  contractId: number,
  request: SettlementInvoiceRequest,
): Promise<InvoiceDetail> {
  const response = await api.post<InvoiceDetail>(`/contracts/${contractId}/settlement-invoice`, request)
  return response.data
}

// Chỉ khi bảng ở `Nhap` (`409`); server tính lại toàn bộ và ghi đè ảnh bằng đúng đường dẫn gửi lên.
export async function updateSettlementInvoice(
  contractId: number,
  request: SettlementInvoiceRequest,
): Promise<InvoiceDetail> {
  const response = await api.put<InvoiceDetail>(`/contracts/${contractId}/settlement-invoice`, request)
  return response.data
}

// `Nhap` → `ChoNguoiThueXacNhan`, ghi `sentAt`; người thuê nhận thông báo.
export async function sendSettlementInvoice(contractId: number): Promise<void> {
  await api.post(`/contracts/${contractId}/settlement-invoice/send`)
}

// Phía Người thuê đứng tên: hai thao tác chỉ nhận khi bảng ở `ChoNguoiThueXacNhan`. Bảng ở `Nhap` (chờ Chủ trọ
// gửi lại) trả `404` như chưa có bảng, bảng đã khóa trả `409`.

// Bảng bị khóa: số dư dương sang `ChuaThanhToan` (hạn tính từ lúc đồng ý), âm sang `ChoHoanCoc`, bằng 0 sang
// `DaThanhToan`; Chủ trọ nhận thông báo.
export async function confirmSettlementInvoice(contractId: number): Promise<void> {
  await api.post(`/contracts/${contractId}/settlement-invoice/confirm`)
}

// `reason` bắt buộc, tối đa 500 ký tự (`400`). Bảng về `Nhap`, Chủ trọ nhận thông báo kèm lý do.
export async function requestSettlementChanges(contractId: number, reason: string): Promise<void> {
  await api.post(`/contracts/${contractId}/settlement-invoice/request-changes`, { reason })
}

// Chỉ khi `ChoNguoiThueXacNhan` và đã quá 7 ngày kể từ `sentAt` (`409`). Kết quả giống người thuê đồng ý.
export async function finalizeSettlementInvoice(contractId: number, request: FinalizeSettlementRequest): Promise<void> {
  await api.post(`/contracts/${contractId}/settlement-invoice/finalize`, request)
}

// Chỉ khi bảng đã khóa (`409`). Hợp đồng sang `DaThanhLy`, phòng về `roomNextStatus`.
export async function completeSettlement(contractId: number, request: CompleteSettlementRequest): Promise<void> {
  await api.post(`/contracts/${contractId}/settlement/complete`, request)
}
