import { api } from '@/lib/api'
import type { AssistantAnswer } from '@/types/assistantTypes'

// Trợ lý AI tra cứu (docs/api-design.md mục 16). Câu hỏi rỗng hoặc quá 500 ký tự thì `400`; mỗi tài khoản
// hỏi tối đa 20 lần mỗi giờ, vượt thì `429`; AI lỗi, hết hạn mức, quá 10 giây hoặc chưa cấu hình thì `503`
// và giao diện ẩn nút trợ lý (FR-121). Mỗi câu hỏi độc lập, server không lưu (FR-131).
export async function askAssistant(question: string): Promise<AssistantAnswer> {
  const response = await api.post<AssistantAnswer>('/assistant/questions', { question })
  return response.data
}
