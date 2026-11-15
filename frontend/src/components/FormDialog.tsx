import { useState, type FormEvent, type ReactNode } from 'react'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Đang gọi API: khóa nút, hiện vòng xoay, không cho đóng hộp thoại. */
  isPending: boolean
  /**
   * Nội dung có ô nhập. Nằm trong `AlertDialogContent` nên bị gỡ khi đóng: state của ô nhập tự xóa,
   * mở lại là giá trị mặc định.
   */
  children: ReactNode
}

/**
 * Hộp thoại có ô nhập cho thao tác cần thêm dữ liệu (xác nhận nhận cọc, ghi nhận hoàn cọc, sửa chỉ
 * số đầu), cùng cách hoạt động với `ConfirmDialog`: trang tự đóng khi thành công; lỗi thì giữ hộp
 * thoại và dữ liệu đã nhập, hiện lỗi trên nút xác nhận. Đặt `FormDialogBody` làm con trực tiếp.
 */
export default function FormDialog({ open, onOpenChange, isPending, children }: FormDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent>{children}</AlertDialogContent>
    </AlertDialog>
  )
}

interface FormDialogBodyProps {
  title: string
  description: string
  confirmLabel: string
  isPending: boolean
  /** Lỗi của lời gọi API; chỉ hiện sau khi bấm xác nhận trong lần mở này. */
  error: unknown
  /** Lỗi kiểm tra của các ô nhập: còn lỗi thì không gọi `onSubmit`. */
  validate: () => boolean
  onSubmit: () => void
  children: ReactNode
}

export function FormDialogBody({
  title,
  description,
  confirmLabel,
  isPending,
  error,
  validate,
  onSubmit,
  children,
}: FormDialogBodyProps) {
  // Như `ConfirmDialog`: `error` lấy từ `useMutation` của trang, còn giữ lỗi của lần mở trước.
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setHasSubmitted(true)
    onSubmit()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription className="wrap-anywhere">{description}</AlertDialogDescription>
      </AlertDialogHeader>

      {children}

      <ApiErrorAlert error={hasSubmitted ? error : null} />

      <AlertDialogFooter>
        <AlertDialogCancel type="button" disabled={isPending}>
          Quay lại
        </AlertDialogCancel>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </form>
  )
}
