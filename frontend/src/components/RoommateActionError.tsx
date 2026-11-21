import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import { getApiErrorInfo } from '@/lib/apiError'

interface RoommateActionErrorProps {
  /** Lỗi của thao tác vừa bấm; `null` hoặc `undefined` thì không hiện gì. */
  error: unknown
  className?: string
}

/**
 * Lỗi của gửi hoặc chấp nhận lời mời ở ghép. `422` là tài khoản chưa có số điện thoại (FR-116): hiện
 * `detail` kèm đường dẫn sang trang Tài khoản (S1) để thêm số rồi quay lại (docs/frontend-screens.md T8).
 */
export default function RoommateActionError({ error, className }: RoommateActionErrorProps) {
  if (error == null) {
    return null
  }

  const isMissingPhone = getApiErrorInfo(error).status === 422

  return (
    <div className={className}>
      <ApiErrorAlert error={error} />
      {isMissingPhone && (
        <p className="mt-2 text-sm">
          Thêm số điện thoại ở trang{' '}
          <Link to="/account" className="text-primary underline underline-offset-4">
            Tài khoản
          </Link>{' '}
          rồi quay lại thử lần nữa.
        </p>
      )}
    </div>
  )
}
