/**
 * Số định danh trên thẻ căn cước hoặc CCCD: đúng 12 chữ số (docs/api-design.md mục 3). CMND 9 số
 * đã hết giá trị từ 01/01/2025 nên không nhận.
 */
export const ID_CARD_PATTERN = /^\d{12}$/
