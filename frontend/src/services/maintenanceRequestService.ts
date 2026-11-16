import { api } from '@/lib/api'
import type {
  MaintenanceRequestDetail,
  MaintenanceRequestListItem,
  MaintenanceRequestListParams,
  ReportMaintenanceRequestRequest,
} from '@/types/maintenanceRequestTypes'
import type { PagedResponse } from '@/types/paginationTypes'

// Sự cố (docs/api-design.md mục 18). Người thuê thấy sự cố của các hợp đồng mình đứng tên; sự cố
// không thuộc người gọi trả `404`. Thao tác chuyển trạng thái chỉ nhận đúng trạng thái nguồn, ngược
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
