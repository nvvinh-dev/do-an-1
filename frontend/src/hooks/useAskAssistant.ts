import { useMutation } from '@tanstack/react-query'
import { askAssistant } from '@/services/assistantService'

/**
 * Hỏi trợ lý AI. Dùng mutation chứ không dùng query: câu trả lời không lưu vào cache, chỉ nằm trong danh sách
 * câu hỏi của khung đang mở (FR-131). Không thử lại khi lỗi: `503` là AI lỗi, gọi lại ngay cũng không khác, và
 * mỗi lần gọi trừ vào hạn mức 20 lần mỗi giờ (FR-122).
 */
export function useAskAssistant() {
  return useMutation({ mutationFn: askAssistant, retry: false })
}
