import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type {
  RentalRequestDetail,
  RentalRequestListItem,
  RentalRequestListParams,
  SubmitRentalRequestRequest,
} from '@/types/rentalRequestTypes'

// Yêu cầu thuê (docs/api-design.md mục 7). Người thuê thấy yêu cầu của mình, Chủ trọ thấy yêu
// cầu gửi tới phòng của mình; yêu cầu không thuộc người gọi trả `404`.

export async function getRentalRequests(params: RentalRequestListParams): Promise<PagedResponse<RentalRequestListItem>> {
  const response = await api.get<PagedResponse<RentalRequestListItem>>('/rental-requests', { params })
  return response.data
}

export async function getRentalRequest(id: number): Promise<RentalRequestDetail> {
  const response = await api.get<RentalRequestDetail>(`/rental-requests/${id}`)
  return response.data
}

// `404` khi phòng không còn đủ điều kiện hiển thị (BR-05), `409` khi đã có yêu cầu chờ duyệt cho
// cùng phòng (BR-27), `422` khi ngày vào ở trước hôm nay hoặc số người ngoài khoảng cho phép.
export async function submitRentalRequest(
  roomId: number,
  request: SubmitRentalRequestRequest,
): Promise<RentalRequestDetail> {
  const response = await api.post<RentalRequestDetail>(`/rooms/${roomId}/rental-requests`, request)
  return response.data
}

// Rút yêu cầu `ChoDuyet` chưa quá 168 giờ, hoặc `DaDuyet` chưa lập hợp đồng và còn hạn giữ chỗ;
// trạng thái khác trả `409`.
export async function cancelRentalRequest(id: number): Promise<void> {
  await api.post(`/rental-requests/${id}/cancel`)
}
