import { useMutation, useQueryClient } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/lib/queryClient'
import { updateProfile } from '@/services/authService'

/** S1: sửa họ tên, số điện thoại (FR-83). Response cùng kiểu `GET /auth/me` nên ghi thẳng vào cache. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user)
    },
  })
}
