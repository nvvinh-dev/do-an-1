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
 */
export function getSettlementBalance(totalAmount: number): SettlementBalance {
  if (totalAmount > 0) {
    return { label: 'Người thuê còn phải trả', amount: totalAmount }
  }
  if (totalAmount < 0) {
    return { label: 'Chủ trọ phải hoàn', amount: -totalAmount }
  }
  return { label: null, amount: 0 }
}
