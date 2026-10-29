/**
 * Đưa số tiền người dùng gõ theo thói quen "3.000.000" về dạng chỉ có chữ số. Chỉ bỏ dấu chấm khi
 * đúng dạng nhóm ba chữ số, nên "3.5" hay "3500.5" vẫn giữ nguyên để bị báo lỗi, không đoán ý.
 */
export function normalizeRoomMoney(value: string): string {
  const trimmed = value.trim()
  return /^\d{1,3}(\.\d{3})+$/.test(trimmed) ? trimmed.replace(/\./g, '') : trimmed
}

/** Diện tích gõ bằng dấu phẩy thập phân ("20,5") đổi sang dấu chấm như API nhận. */
export function normalizeRoomArea(value: string): string {
  const trimmed = value.trim()
  return /^\d+,\d{1,2}$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed
}

/** Kiểm tra đầu vào theo API mục 1, 5.2 và độ chính xác của RoomRequestValidator. */
export function validateRoomMoney(input: string, positive = false): true | string {
  const value = normalizeRoomMoney(input)
  if (value === '') return 'Vui lòng nhập số tiền.'
  if (!/^\d+$/.test(value)) return 'Nhập số đồng nguyên, không âm.'
  if (Number(value) > 999999999999) return 'Số tiền tối đa 999.999.999.999 đồng.'
  if (positive && Number(value) === 0) return 'Giá thuê phải lớn hơn 0.'
  return true
}

export function validateRoomArea(input: string): true | string {
  const value = normalizeRoomArea(input)
  if (value === '') return 'Vui lòng nhập diện tích.'
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 999999.99) {
    return 'Diện tích phải lớn hơn 0, tối đa 999.999,99 m² và có tối đa 2 số lẻ.'
  }
  return true
}

export function validateRoomOccupants(input: string): true | string {
  const value = input.trim()
  if (value === '') return 'Vui lòng nhập số người tối đa.'
  if (!/^\d+$/.test(value) || Number(value) < 1) return 'Số người tối đa phải là số nguyên từ 1 trở lên.'
  // Giới hạn của cột int trong database.
  if (Number(value) > 2147483647) return 'Số người tối đa quá lớn.'
  return true
}

export function validateServiceFeeName(value: string, names: string[], index: number): true | string {
  const name = value.trim().toLowerCase()
  if (!name) return 'Vui lòng nhập tên phí.'
  // Form gửi tên đã bỏ khoảng trắng hai đầu, nên đếm độ dài sau khi bỏ.
  if (value.trim().length > 100) return 'Tên phí tối đa 100 ký tự.'
  if (names.some((other, i) => i !== index && other.trim().toLowerCase() === name)) {
    return 'Tên phí dịch vụ không được trùng trong phòng.'
  }
  return true
}
