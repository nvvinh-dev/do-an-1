import { useId, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'

interface ReasonField {
  label: string
  /** Bắt buộc có lý do mới bấm xác nhận được. */
  required?: boolean
  maxLength?: number
  placeholder?: string
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Câu nói rõ hậu quả của thao tác, vì thao tác này không hoàn tác được. */
  description: string
  confirmLabel: string
  cancelLabel?: string
  /** Hủy, từ chối, khóa: nút xác nhận màu `destructive`. */
  destructive?: boolean
  /** Có truyền thì hiện ô lý do (hủy hợp đồng, từ chối, khóa tài khoản, chưa đồng ý bảng thanh lý...). */
  reason?: ReasonField
  /** Đang gọi API: khóa nút, hiện vòng xoay, không cho đóng hộp thoại. */
  isPending?: boolean
  /**
   * Lỗi của lời gọi API vừa rồi, hiện ngay trên nút xác nhận. Chỉ hiện sau khi bấm xác nhận
   * trong lần mở này, nên lỗi còn lại của lần mở trước không hiện khi mở lại hộp thoại.
   */
  error?: unknown
  /** Gọi khi bấm xác nhận, kèm lý do đã bỏ khoảng trắng hai đầu (chuỗi rỗng nếu không có ô lý do). */
  onConfirm: (reason: string) => void
}

/**
 * Hộp thoại xác nhận cho thao tác không hoàn tác (FR-75, docs/design-system.md mục 6.2).
 * Do trang điều khiển: bấm xác nhận không tự đóng hộp thoại, vì còn phải chờ API trả lời. Trang
 * tự đóng khi thành công; khi lỗi thì hộp thoại mở nguyên, hiện lỗi và giữ lý do đã nhập.
 */
export default function ConfirmDialog({ open, onOpenChange, isPending = false, ...contentProps }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <AlertDialogContent>
        <ConfirmDialogBody isPending={isPending} {...contentProps} />
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Nội dung nằm ở component riêng để ô lý do tự xóa sau mỗi lần đóng hộp thoại: Radix gỡ nội dung
// khỏi cây khi đóng nên state ở đây cũng mất theo.
function ConfirmDialogBody({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Quay lại',
  destructive = false,
  reason,
  isPending,
  error,
  onConfirm,
}: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'> & { isPending: boolean }) {
  const [reasonText, setReasonText] = useState('')
  // `error` thường lấy từ `useMutation` của trang và còn giữ tới khi mutation chạy lại; chưa bấm
  // xác nhận trong lần mở này thì đó là lỗi cũ, không hiện.
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const reasonId = useId()

  const isReasonMissing = reason?.required === true && reasonText.trim() === ''

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>

      {reason && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={reasonId}>
            {reason.label}
            {reason.required && <span aria-hidden="true"> *</span>}
          </Label>
          <Textarea
            id={reasonId}
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            maxLength={reason.maxLength}
            placeholder={reason.placeholder}
            required={reason.required}
            disabled={isPending}
          />
        </div>
      )}

      <ApiErrorAlert error={hasConfirmed ? error : null} />

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'default'}
          disabled={isPending || isReasonMissing}
          onClick={() => {
            setHasConfirmed(true)
            onConfirm(reasonText.trim())
          }}
        >
          {isPending && <Spinner />}
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </>
  )
}
