import { api } from '@/lib/api'
import type {
  ConfirmDepositRequest,
  ContractDetail,
  ContractListItem,
  ContractListParams,
  ContractReasonRequest,
  ContractTermsRequest,
  CreateContractRequest,
  InitialMeterReadingsRequest,
  MoveOutNotice,
  RefundDepositRequest,
  SendMoveOutNoticeRequest,
} from '@/types/contractTypes'
import type { ContractInvoiceListItem } from '@/types/invoiceTypes'
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

// Lập hợp đồng nháp từ yêu cầu `DaDuyet` còn hạn giữ chỗ; trả `201` kèm chi tiết. Yêu cầu không còn
// `DaDuyet`, phòng đã có hợp đồng chiếm dụng, quá hạn giữ chỗ trả `409`; tổng số người vượt
// `maxOccupants`, ngày bắt đầu trước hôm nay, ngày kết thúc không sau ngày bắt đầu trả `422`.
export async function createContract(request: CreateContractRequest): Promise<ContractDetail> {
  const response = await api.post<ContractDetail>('/contracts', request)
  return response.data
}

// Chỉ ở `Nhap` và còn hạn giữ chỗ, ngược lại `409`; thay toàn bộ điều khoản, phí, người ở cùng.
export async function updateContract(id: number, request: ContractTermsRequest): Promise<ContractDetail> {
  const response = await api.put<ContractDetail>(`/contracts/${id}`, request)
  return response.data
}

// `Nhap` → `ChoNguoiThueXacNhan`; trạng thái khác hoặc quá hạn giữ chỗ trả `409`.
export async function sendContract(id: number): Promise<void> {
  await api.post(`/contracts/${id}/send`)
}

// `ChoNguoiThueXacNhan`, `ChoNhanCoc` → `Nhap`, xóa xác nhận của người thuê (FR-102); khác trả `409`.
export async function recallContract(id: number): Promise<void> {
  await api.post(`/contracts/${id}/recall`)
}

// Chỉ ở `ChoNhanCoc` và còn hạn giữ chỗ (`409`); `receivedAt` sau hiện tại trả `422`. Hợp đồng có hiệu
// lực, phòng sang Đang thuê (BR-21).
export async function confirmDeposit(id: number, request: ConfirmDepositRequest): Promise<void> {
  await api.post(`/contracts/${id}/deposit/confirm`, request)
}

// Chỉ hợp đồng `DaHuy` đã nhận cọc, chưa hoàn (`409`). `refundedAt` trước lúc hủy hoặc sau hiện tại,
// số hoàn ngoài 0..cọc, thiếu lý do khi hoàn thiếu trả `422` (FR-86).
export async function refundDeposit(id: number, request: RefundDepositRequest): Promise<void> {
  await api.post(`/contracts/${id}/deposit/refund`, request)
}

// Chỉ `DangHieuLuc` chưa có hóa đơn nào khác `DaHuy` (FR-90), ngược lại `409`.
export async function updateInitialMeterReadings(id: number, request: InitialMeterReadingsRequest): Promise<void> {
  await api.patch(`/contracts/${id}/initial-meter-readings`, request)
}

// Thông báo trả phòng (docs/api-design.md mục 10). Chỉ nhận ở `DangHieuLuc` đã tới `startDate` hoặc
// `SapHetHan`, ngược lại `409`; ngày trả phòng dự kiến trước hôm nay trả `422`. Hợp đồng sang
// `DangThanhLy`, bên còn lại nhận thông báo; trả `noticeDays` và `penaltyAllowed`.
export async function sendMoveOutNotice(id: number, request: SendMoveOutNoticeRequest): Promise<MoveOutNotice> {
  const response = await api.post<MoveOutNotice>(`/contracts/${id}/move-out-notice`, request)
  return response.data
}

// Chỉ bên đã gửi, khi `DangThanhLy` và chưa có hóa đơn thanh lý, ngược lại `409` (FR-98). Hợp đồng về
// `SapHetHan` nếu còn 15 ngày hoặc ít hơn tới `endDate`, ngược lại `DangHieuLuc`.
export async function withdrawMoveOutNotice(id: number): Promise<void> {
  await api.post(`/contracts/${id}/move-out-notice/withdraw`)
}

// Không phân trang, kỳ mới trước (docs/api-design.md mục 9).
export async function getContractInvoices(contractId: number): Promise<ContractInvoiceListItem[]> {
  const response = await api.get<ContractInvoiceListItem[]>(`/contracts/${contractId}/invoices`)
  return response.data
}
