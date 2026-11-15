import { api } from '@/lib/api'
import type { MeterReading } from '@/types/contractTypes'
import type {
  InvoiceDetail,
  InvoiceListItem,
  InvoiceListParams,
  PaymentReport,
  PeriodicInvoiceRequest,
  ReportPaymentRequest,
} from '@/types/invoiceTypes'
import type { PagedResponse } from '@/types/paginationTypes'

// Hóa đơn (docs/api-design.md mục 9). Hóa đơn không thuộc người gọi, và hóa đơn người thuê chưa được thấy,
// trả `404`.

// Chủ trọ thấy hóa đơn trên khu trọ của mình, Người thuê thấy hóa đơn các hợp đồng mình đứng tên (FR-103);
// kỳ mới trước. `month` sai dạng trả `400`.
export async function getInvoices(params: InvoiceListParams): Promise<PagedResponse<InvoiceListItem>> {
  const response = await api.get<PagedResponse<InvoiceListItem>>('/invoices', { params })
  return response.data
}

export async function getInvoice(id: number): Promise<InvoiceDetail> {
  const response = await api.get<InvoiceDetail>(`/invoices/${id}`)
  return response.data
}

// Chỉ số cũ mà hóa đơn kế tiếp (định kỳ hoặc thanh lý) sẽ dùng, chỉ để hiển thị; luôn có vì hợp đồng nào cũng
// có chỉ số đầu. Chỉ Chủ trọ sở hữu gọi được.
export async function getLatestContractMeterReading(contractId: number): Promise<MeterReading> {
  const response = await api.get<MeterReading>(`/contracts/${contractId}/meter-readings/latest`)
  return response.data
}

// Lập hóa đơn nháp cho kỳ kế tiếp do server xác định. Hợp đồng không còn hiệu lực hoặc chưa tới ngày bắt đầu,
// kỳ kế tiếp chưa tới (trước ngày 25), còn hóa đơn nháp, tháng trả phòng, đã có hóa đơn thanh lý trả `409`;
// chỉ số mới nhỏ hơn chỉ số cũ, dòng điều chỉnh sai, tổng âm, ảnh sai trả `422`. Trả `201` kèm chi tiết.
export async function createInvoice(contractId: number, request: PeriodicInvoiceRequest): Promise<InvoiceDetail> {
  const response = await api.post<InvoiceDetail>(`/contracts/${contractId}/invoices`, request)
  return response.data
}

// Chỉ hóa đơn định kỳ mới nhất ở `Nhap`, hoặc `ChuaThanhToan`, `QuaHan` chưa thu đồng nào (`409`). Server tính
// lại toàn bộ và ghi đè ảnh bằng đúng đường dẫn gửi lên.
export async function updateInvoice(id: number, request: PeriodicInvoiceRequest): Promise<InvoiceDetail> {
  const response = await api.put<InvoiceDetail>(`/invoices/${id}`, request)
  return response.data
}

// Chỉ hóa đơn định kỳ ở `Nhap` (`409`). Sang `ChuaThanhToan`, tổng 0 thì sang thẳng `DaThanhToan`; người thuê
// nhận thông báo.
export async function issueInvoice(id: number): Promise<void> {
  await api.post(`/invoices/${id}/issue`)
}

// Cùng điều kiện với sửa (`409`); `reason` bắt buộc, tối đa 500 ký tự.
export async function cancelInvoice(id: number, reason: string): Promise<void> {
  await api.post(`/invoices/${id}/cancel`, { reason })
}

// Người thuê đứng tên, khi hóa đơn ở `ChuaThanhToan`, `ThanhToanMotPhan`, `QuaHan` (`409`). Số tiền lớn hơn 0
// và không vượt phần còn phải trả, ảnh sai trả `422`. Hóa đơn sang `ChoXacNhan`.
export async function reportPayment(id: number, request: ReportPaymentRequest): Promise<PaymentReport> {
  const response = await api.post<PaymentReport>(`/invoices/${id}/payment-reports`, request)
  return response.data
}

// Chỉ lượt báo ở `ChoXacNhan` (`409`). `confirmedAmount` lớn hơn 0 và không vượt phần còn phải trả (`422`).
export async function confirmPayment(id: number, reportId: number, confirmedAmount: number): Promise<void> {
  await api.post(`/invoices/${id}/payment-reports/${reportId}/confirm`, { confirmedAmount })
}

// Chỉ lượt báo ở `ChoXacNhan` (`409`); `reason` bắt buộc, tối đa 500 ký tự.
export async function rejectPayment(id: number, reportId: number, reason: string): Promise<void> {
  await api.post(`/invoices/${id}/payment-reports/${reportId}/reject`, { reason })
}
