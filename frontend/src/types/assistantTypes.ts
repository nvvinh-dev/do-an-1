/** Loại bản ghi câu trả lời của trợ lý nhắc tới (docs/api-design.md mục 16). */
export type AssistantReferenceType = 'Contract' | 'Invoice' | 'Room' | 'MaintenanceRequest'

export interface AssistantReference {
  type: AssistantReferenceType
  id: number
}

/** Response của `POST /assistant/questions`. */
export interface AssistantAnswer {
  answer: string
  /** Chỉ chứa bản ghi có thật thuộc quyền người hỏi; server đã lọc (FR-129). */
  references: AssistantReference[]
}
