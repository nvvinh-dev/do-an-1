import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountQueryKey } from '@/hooks/useBankAccount'
import { updateBankAccount } from '@/services/bankAccountService'

/** L4: khai báo hoặc sửa tài khoản nhận tiền (FR-77). Response là tài khoản vừa lưu nên ghi thẳng vào cache. */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBankAccount,
    onSuccess: (bankAccount) => {
      queryClient.setQueryData(bankAccountQueryKey, bankAccount)
    },
  })
}
