import { api } from '@/lib/api'
import type { LandlordApplication, SubmitLandlordApplicationRequest } from '@/types/landlordApplicationTypes'

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
