import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type {
  ApproveLandlordApplicationRequest,
  LandlordApplication,
  LandlordApplicationDetail,
  LandlordApplicationListItem,
  LandlordApplicationListParams,
  RejectLandlordApplicationRequest,
  SubmitLandlordApplicationRequest,
} from '@/types/landlordApplicationTypes'

// Hồ sơ mới nhất của người gọi; chưa nộp lần nào thì trả 404 (docs/api-design.md mục 3).
export async function getMyLandlordApplication(): Promise<LandlordApplication> {
  const response = await api.get<LandlordApplication>('/landlord-applications/me')
  return response.data
}

export async function submitLandlordApplication(
  request: SubmitLandlordApplicationRequest,
): Promise<LandlordApplication> {
  const response = await api.post<LandlordApplication>('/landlord-applications', request)
  return response.data
}

// Các hàm dưới chỉ Admin gọi được (AD2).

export async function getLandlordApplications(
  params: LandlordApplicationListParams,
): Promise<PagedResponse<LandlordApplicationListItem>> {
  const response = await api.get<PagedResponse<LandlordApplicationListItem>>('/admin/landlord-applications', {
    params,
  })
  return response.data
}

export async function getLandlordApplication(id: number): Promise<LandlordApplicationDetail> {
  const response = await api.get<LandlordApplicationDetail>(`/admin/landlord-applications/${id}`)
  return response.data
}

// `409` khi hồ sơ không còn chờ duyệt, người nộp đã đổi số điện thoại, đã là Chủ trọ, hoặc còn
// hợp đồng hay yêu cầu thuê đang mở.
export async function approveLandlordApplication(
  id: number,
  request: ApproveLandlordApplicationRequest,
): Promise<void> {
  await api.post(`/admin/landlord-applications/${id}/approve`, request)
}

// `409` khi hồ sơ không còn chờ duyệt.
export async function rejectLandlordApplication(id: number, request: RejectLandlordApplicationRequest): Promise<void> {
  await api.post(`/admin/landlord-applications/${id}/reject`, request)
}
