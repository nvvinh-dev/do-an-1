import { api } from '@/lib/api'
import type { ContractDetail, ContractListItem, ContractListParams, ContractReasonRequest } from '@/types/contractTypes'
import type { PagedResponse } from '@/types/paginationTypes'

// Hợp đồng (docs/api-design.md mục 8). Người thuê thấy hợp đồng mình đứng tên, kể cả ở `Nhap`
// (chỉ đọc); hợp đồng không thuộc người gọi trả `404`.

export async function getContracts(params: ContractListParams): Promise<PagedResponse<ContractListItem>> {
  const response = await api.get<PagedResponse<ContractListItem>>('/contracts', { params })
  return response.data
}

export async function getContract(id: number): Promise<ContractDetail> {
  const response = await api.get<ContractDetail>(`/contracts/${id}`)
  return response.data
}

// Chỉ nhận ở `ChoNguoiThueXacNhan` và còn hạn giữ chỗ, ngược lại `409`. Tiền cọc > 0 thì hợp đồng
// sang `ChoNhanCoc`; tiền cọc = 0 thì sang thẳng `DangHieuLuc` (BR-21).
export async function confirmContract(id: number): Promise<void> {
  await api.post(`/contracts/${id}/confirm`)
}

// Chỉ nhận ở `ChoNguoiThueXacNhan` và còn hạn giữ chỗ, ngược lại `409`; hợp đồng về `Nhap` (FR-84).
export async function requestContractChanges(id: number, request: ContractReasonRequest): Promise<void> {
  await api.post(`/contracts/${id}/request-changes`, request)
}

// Hủy trước ngày bắt đầu (FR-76): hợp đồng chưa hiệu lực, hoặc `DangHieuLuc` chưa tới `startDate`;
// đã qua `startDate` trả `409`.
export async function cancelContract(id: number, request: ContractReasonRequest): Promise<void> {
  await api.post(`/contracts/${id}/cancel`, request)
}
