interface SettlementBalance {
  /** Chiều của số dư; `null` khi số dư bằng 0, hai bên không còn khoản nào phải trả. */
  label: string | null
  /** Giá trị tuyệt đối của số dư, luôn không âm. */
  amount: number
}

/**
 * Số dư của hóa đơn thanh lý (`totalAmount`): dương là Người thuê còn phải trả, âm là Chủ trọ
 * phải hoàn lại phần cọc dư (FR-58, docs/frontend-screens.md mục 6). Trả chiều bằng chữ để màn
 * hình không chỉ hiện số có dấu âm.
 *
 * @param settled Hóa đơn đã xong (`DaThanhToan`): chữ chuyển sang việc đã làm — "Người thuê đã trả",
 * "Chủ trọ đã hoàn" — để không đọc như vẫn còn nợ.
 */
export function getSettlementBalance(totalAmount: number, settled = false): SettlementBalance {
  if (totalAmount > 0) {
    return { label: settled ? 'Người thuê đã trả' : 'Người thuê còn phải trả', amount: totalAmount }
  }
  if (totalAmount < 0) {
    return { label: settled ? 'Chủ trọ đã hoàn' : 'Chủ trọ phải hoàn', amount: -totalAmount }
  }
  return { label: null, amount: 0 }
}
