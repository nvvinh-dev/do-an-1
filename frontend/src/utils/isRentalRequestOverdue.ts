/**
 * Yêu cầu thuê đã quá hạn đang chạy: hạn duyệt 168 giờ khi `ChoDuyet` (`expiresAt`), hạn giữ chỗ
 * 72 giờ khi `DaDuyet` (`holdExpiresAt`). Cùng điều kiện với `RentalRequest.IsAwaitingReview` và
 * `IsHoldingRoom` ở backend: đã qua mốc hạn, đúng mốc thì chưa tính. Tác vụ định kỳ chuyển yêu cầu
 * quá hạn sang `HetHan` chạy mỗi giờ, nên có lúc server vẫn trả `ChoDuyet` hay `DaDuyet` cho yêu
 * cầu đã quá hạn, trong khi `/cancel` đã trả `409` (architecture mục 7).
 *
 * @param rentalRequest Hai hạn do API trả (ISO 8601); trạng thái khác hai trạng thái trên thì cả hai là `null`.
 */
export function isRentalRequestOverdue(
  rentalRequest: { expiresAt: string | null; holdExpiresAt: string | null },
  now: Date,
): boolean {
  const deadline = rentalRequest.expiresAt ?? rentalRequest.holdExpiresAt
  return deadline !== null && now.getTime() > new Date(deadline).getTime()
}
