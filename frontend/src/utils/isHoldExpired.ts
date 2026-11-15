/**
 * Hợp đồng chưa hiệu lực đã quá hạn giữ chỗ 72 giờ, cùng điều kiện với `Contract.IsHoldExpired` ở
 * backend: đã qua mốc `holdExpiresAt`, đúng mốc thì chưa tính. Tác vụ định kỳ hủy hợp đồng quá hạn
 * chạy mỗi giờ, nên có lúc server vẫn trả trạng thái chưa hiệu lực cho hợp đồng đã quá hạn, trong
 * khi `/confirm`, `/request-changes` và xác nhận cọc đã trả `409` (architecture mục 7).
 *
 * @param holdExpiresAt Hạn giữ chỗ do API trả (ISO 8601); `null` khi hợp đồng không còn ở trạng thái chưa hiệu lực.
 */
export function isHoldExpired(holdExpiresAt: string | null, now: Date): boolean {
  return holdExpiresAt !== null && now.getTime() > new Date(holdExpiresAt).getTime()
}
