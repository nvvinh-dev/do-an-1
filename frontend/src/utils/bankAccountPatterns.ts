/**
 * Định dạng tài khoản nhận tiền mà `PUT /landlord/bank-account` nhận (docs/api-design.md mục 2.1).
 * Giữ đúng hai mẫu của `LandlordBankAccountService` ở backend; sai mẫu thì server trả `422`.
 */

/** Số tài khoản: chỉ gồm chữ số. */
export const ACCOUNT_NUMBER_PATTERN = /^[0-9]+$/

/** Tên chủ tài khoản: chữ in hoa không dấu, các chữ cách nhau một dấu cách, ví dụ `NGUYEN VAN A`. */
export const ACCOUNT_NAME_PATTERN = /^[A-Z]+( [A-Z]+)*$/
