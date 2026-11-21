import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type {
  MyRoommateProfile,
  RoommateBlock,
  RoommateConnection,
  RoommateInvitation,
  RoommateInvitationListParams,
  RoommateMatch,
  RoommateMatchExplanation,
  RoommateProfileRequest,
  RoommatePublicProfile,
} from '@/types/roommateTypes'

// Ở ghép (docs/api-design.md mục 15). Chỉ Người thuê gọi được. Người đang có hợp đồng Đang hiệu lực
// nhận `409` khi tạo, sửa hồ sơ, xem ứng viên, gửi hay chấp nhận lời mời (FR-107).

// Chưa có hồ sơ thì `404`.
export async function getMyRoommateProfile(): Promise<MyRoommateProfile> {
  const response = await api.get<MyRoommateProfile>('/roommate-profiles/me')
  return response.data
}

// Chưa có thì tạo (`201`), đã có thì sửa (`200`); `moveInFrom` trước hôm nay thì `400`, cặp tỉnh và
// phường không có trong danh mục thì `422`.
export async function saveMyRoommateProfile(request: RoommateProfileRequest): Promise<MyRoommateProfile> {
  const response = await api.put<MyRoommateProfile>('/roommate-profiles/me', request)
  return response.data
}

export async function setRoommateSearching(isSearching: boolean): Promise<void> {
  await api.patch('/roommate-profiles/me/searching', { isSearching })
}

// Xóa hẳn hồ sơ; lời mời đang chờ gửi đi hoặc nhận được chuyển `DaRut` (FR-117).
export async function deleteMyRoommateProfile(): Promise<void> {
  await api.delete('/roommate-profiles/me')
}

// Tối đa 20 ứng viên, điểm cao trước; chưa có hồ sơ thì `409`.
export async function getRoommateMatches(): Promise<RoommateMatch[]> {
  const response = await api.get<RoommateMatch[]>('/roommate-profiles/matches')
  return response.data
}

// Người gọi không còn xem được hồ sơ (không còn là ứng viên, không có lời mời, một bên đã chặn) thì `404`.
export async function getRoommateProfile(id: number): Promise<RoommatePublicProfile> {
  const response = await api.get<RoommatePublicProfile>(`/roommate-profiles/${id}`)
  return response.data
}

// AI lỗi hoặc hết hạn mức thì `503`, giao diện ẩn phần giải thích (FR-120).
export async function getRoommateMatchExplanation(id: number): Promise<RoommateMatchExplanation> {
  const response = await api.get<RoommateMatchExplanation>(`/roommate-profiles/${id}/match-explanation`)
  return response.data
}

// Chưa có số điện thoại thì `422`; đã có lời mời đang chờ, đã kết nối hoặc từng bị từ chối thì `409` (FR-116).
export async function sendRoommateInvitation(profileId: number): Promise<RoommateInvitation> {
  const response = await api.post<RoommateInvitation>(`/roommate-profiles/${profileId}/invitations`)
  return response.data
}

// Lời mời đang chờ giữa hai bên chuyển `DaRut`; đã chặn từ trước vẫn `204` (FR-118).
export async function blockRoommateProfile(profileId: number): Promise<void> {
  await api.post(`/roommate-profiles/${profileId}/block`)
}

export async function getRoommateInvitations(
  params: RoommateInvitationListParams,
): Promise<PagedResponse<RoommateInvitation>> {
  const response = await api.get<PagedResponse<RoommateInvitation>>('/roommate-invitations', { params })
  return response.data
}

// Ba thao tác chỉ nhận lời mời `ChoPhanHoi`, ngược lại `409`; sai vai thì `404`. Chấp nhận khi chưa có số
// điện thoại thì `422`.
export async function acceptRoommateInvitation(id: number): Promise<void> {
  await api.post(`/roommate-invitations/${id}/accept`)
}

export async function rejectRoommateInvitation(id: number): Promise<void> {
  await api.post(`/roommate-invitations/${id}/reject`)
}

export async function withdrawRoommateInvitation(id: number): Promise<void> {
  await api.post(`/roommate-invitations/${id}/withdraw`)
}

export async function getRoommateConnections(): Promise<RoommateConnection[]> {
  const response = await api.get<RoommateConnection[]>('/roommate-connections')
  return response.data
}

export async function getRoommateBlocks(): Promise<RoommateBlock[]> {
  const response = await api.get<RoommateBlock[]>('/roommate-blocks')
  return response.data
}

export async function unblockRoommate(id: number): Promise<void> {
  await api.delete(`/roommate-blocks/${id}`)
}
