import { useQuery } from '@tanstack/react-query'
import { getBankAccount } from '@/services/bankAccountService'

export const bankAccountQueryKey = ['landlord', 'bank-account'] as const

/** Tài khoản nhận tiền của Chủ trọ đang đăng nhập (L4); `null` nghĩa là chưa khai báo. */
export function useBankAccount() {
  return useQuery({
    queryKey: bankAccountQueryKey,
    queryFn: getBankAccount,
  })
}
