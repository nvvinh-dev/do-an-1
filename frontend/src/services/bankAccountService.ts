import { api } from '@/lib/api'
import type { BankAccount } from '@/types/bankAccountTypes'

// Tài khoản nhận tiền của Chủ trọ đang đăng nhập (docs/api-design.md mục 2.1).

/** Chưa khai báo thì server trả `null` với mã 200. */
export async function getBankAccount(): Promise<BankAccount | null> {
  const response = await api.get<BankAccount | null>('/landlord/bank-account')
  return response.data
}

// Sai định dạng (mã BIN ngoài danh sách VietQR, số tài khoản có chữ, tên có dấu) trả 422.
export async function updateBankAccount(request: BankAccount): Promise<BankAccount> {
  const response = await api.put<BankAccount>('/landlord/bank-account', request)
  return response.data
}
