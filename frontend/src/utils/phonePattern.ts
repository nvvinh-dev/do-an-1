/**
 * Số điện thoại Việt Nam: 10–11 chữ số, bắt đầu bằng 0. Kiểm ở frontend chỉ để trải nghiệm —
 * server không ràng buộc định dạng này (chỉ giới hạn độ dài). Dùng chung cho mọi form nhập số
 * điện thoại (A2, S1...).
 */
export const PHONE_PATTERN = /^0\d{9,10}$/
