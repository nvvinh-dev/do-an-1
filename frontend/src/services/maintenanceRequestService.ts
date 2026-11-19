import { api } from '@/lib/api'
import type {
  MaintenanceExpectedCompletionDateRequest,
  MaintenanceRequestDetail,
  MaintenanceRequestListItem,
  MaintenanceRequestListParams,
  RejectMaintenanceRequestRequest,
  ReportMaintenanceRequestRequest,
} from '@/types/maintenanceRequestTypes'
import type { PagedResponse } from '@/types/paginationTypes'

// Sự cố (docs/api-design.md mục 18). Người thuê thấy sự cố của các hợp đồng mình đứng tên, Chủ trọ
// thấy sự cố trên khu trọ của mình; sự cố không thuộc người gọi trả `404`. Thao tác chuyển trạng thái chỉ nhận đúng trạng thái nguồn, ngược
// lại `409`.

export async function getMaintenanceRequests(
  params: MaintenanceRequestListParams,
): Promise<PagedResponse<MaintenanceRequestListItem>> {
  const response = await api.get<PagedResponse<MaintenanceRequestListItem>>('/maintenance-requests', { params })
  return response.data
}

export async function getMaintenanceRequest(id: number): Promise<MaintenanceRequestDetail> {
  const response = await api.get<MaintenanceRequestDetail>(`/maintenance-requests/${id}`)
  return response.data
}

// `404` khi hợp đồng không phải của người gọi, `409` khi hợp đồng không ở trạng thái báo được sự cố
// (FR-137), `422` khi một ảnh không phải file `AnhSuCo` của chính người gọi.
export async function reportMaintenanceRequest(
  request: ReportMaintenanceRequestRequest,
): Promise<MaintenanceRequestDetail> {
  const response = await api.post<MaintenanceRequestDetail>('/maintenance-requests', request)
  return response.data
}

// `ChoNguoiThueXacNhan` → `DaDong`; quá 168 giờ vẫn nhận, kết quả giống tự đóng.
export async function confirmMaintenanceRequest(id: number): Promise<void> {
  await api.post(`/maintenance-requests/${id}/confirm`)
}

// `ChoNguoiThueXacNhan` → `DangXuLy`; quá 168 giờ kể từ `completedAt` thì `409`.
export async function reportMaintenanceRequestNotFixed(id: number, reason: string): Promise<void> {
  await api.post(`/maintenance-requests/${id}/not-fixed`, { reason })
}

// `Moi` hoặc `DangXuLy` → `DaHuy`.
export async function cancelMaintenanceRequest(id: number): Promise<void> {
  await api.post(`/maintenance-requests/${id}/cancel`)
}

// Thao tác của Chủ trọ sở hữu khu trọ (FR-140 – FR-142).

// `Moi` → `DangXuLy`; ngày dự kiến trước hôm nay (giờ Việt Nam) thì `400`. Quá 72 giờ vẫn nhận.
export async function acceptMaintenanceRequest(
  id: number,
  request: MaintenanceExpectedCompletionDateRequest,
): Promise<void> {
  await api.post(`/maintenance-requests/${id}/accept`, request)
}

// Chỉ nhận khi `DangXuLy`, ngược lại `409`. Không gửi thông báo.
export async function updateMaintenanceExpectedCompletionDate(
  id: number,
  request: MaintenanceExpectedCompletionDateRequest,
): Promise<void> {
  await api.patch(`/maintenance-requests/${id}/expected-completion-date`, request)
}

// `Moi` hoặc `DangXuLy` → `TuChoi`.
export async function rejectMaintenanceRequest(id: number, request: RejectMaintenanceRequestRequest): Promise<void> {
  await api.post(`/maintenance-requests/${id}/reject`, request)
}

// `DangXuLy` → `ChoNguoiThueXacNhan`; mốc 168 giờ tự đóng tính lại từ lần báo này.
export async function completeMaintenanceRequest(id: number): Promise<void> {
  await api.post(`/maintenance-requests/${id}/complete`)
}
