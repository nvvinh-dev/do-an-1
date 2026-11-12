import { api } from '@/lib/api'
import type { MeterReading } from '@/types/contractTypes'
import type { InvoiceDetail } from '@/types/invoiceTypes'

// Hóa đơn (docs/api-design.md mục 9). Hóa đơn không thuộc người gọi, và hóa đơn người thuê chưa được thấy,
// trả `404`.

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
