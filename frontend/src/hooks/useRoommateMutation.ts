import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Mọi thao tác ghi ở ghép. Thành công thì làm mới mọi dữ liệu ở ghép (`roommateQueryKey`). `409` nghĩa
 * là dữ liệu đã đổi ở nơi khác (bên kia vừa rút, vừa chấp nhận, vừa xóa hồ sơ): cũng tải lại để trang
 * hiện nút theo trạng thái mới (docs/frontend-screens.md mục 1).
 *
 * Không chờ tải lại xong mới báo thành công: nhiều thao tác làm chính component đang bấm biến mất sau khi
 * tải lại (gửi lời mời, chặn thì ứng viên rời danh sách; tạo, xóa hồ sơ thì form đổi), mà callback
 * `onSuccess` truyền vào `mutate` bị bỏ qua khi component đã gỡ — mất toast và không chuyển trang.
 */
export function useRoommateMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: roommateQueryKey })
    },
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: roommateQueryKey })
      }
    },
  })
}
