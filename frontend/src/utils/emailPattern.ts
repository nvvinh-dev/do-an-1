/**
 * Kiểm định dạng email ở frontend chỉ để trải nghiệm — server vẫn kiểm tra lại
 * (`EmailAddress()` của FluentValidation). Dùng chung cho mọi form nhập email (A1, A2...).
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
