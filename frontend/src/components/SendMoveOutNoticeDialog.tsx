import { useId, useState } from 'react'
import { toast } from 'sonner'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useLeaseMutation } from '@/hooks/useLeaseMutation'
import { sendMoveOutNotice } from '@/services/contractService'
import type { ContractDetail, SendMoveOutNoticeRequest } from '@/types/contractTypes'
import { formatDate } from '@/utils/formatDate'
import type { ContractViewer } from '@/utils/getMoveOutNoticeActions'
import { getVietnamToday } from '@/utils/getVietnamToday'

const REASON_MAX_LENGTH = 500

interface SendMoveOutNoticeDialogProps {
  contract: ContractDetail
  viewer: ContractViewer
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Gửi thông báo trả phòng ở T4 và L6 (FR-53, FR-87; api-design mục 10): ngày trả phòng dự kiến không
 * trước hôm nay, lý do bắt buộc tối đa 500 ký tự. Gửi xong hợp đồng sang Đang thanh lý, bên còn lại
 * nhận thông báo; số ngày báo trước và việc có tính phí phạt hay không hiện ở `MoveOutNoticeCard`.
 */
export default function SendMoveOutNoticeDialog({ contract, viewer, open, onOpenChange }: SendMoveOutNoticeDialogProps) {
  const mutation = useLeaseMutation((request: SendMoveOutNoticeRequest) => sendMoveOutNotice(contract.id, request))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <SendMoveOutNoticeBody
        contract={contract}
        viewer={viewer}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã gửi thông báo trả phòng')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface SendMoveOutNoticeBodyProps {
  contract: ContractDetail
  viewer: ContractViewer
  isPending: boolean
  error: unknown
  onSubmit: (request: SendMoveOutNoticeRequest) => void
}

function SendMoveOutNoticeBody({ contract, viewer, isPending, error, onSubmit }: SendMoveOutNoticeBodyProps) {
  const [expectedMoveOutDate, setExpectedMoveOutDate] = useState('')
  const [reason, setReason] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const baseId = useId()
  const dateId = `${baseId}-date`
  const reasonId = `${baseId}-reason`

  const today = getVietnamToday()
  // Ô `date` trả `YYYY-MM-DD`, cùng dạng với `today` nên so sánh chuỗi trực tiếp được.
  const dateError =
    expectedMoveOutDate === ''
      ? 'Vui lòng chọn ngày trả phòng dự kiến.'
      : expectedMoveOutDate < today
        ? 'Ngày trả phòng dự kiến không được trước hôm nay.'
        : null
  const trimmedReason = reason.trim()
  const reasonError =
    trimmedReason === ''
      ? 'Vui lòng ghi lý do trả phòng.'
      : trimmedReason.length > REASON_MAX_LENGTH
        ? `Lý do tối đa ${REASON_MAX_LENGTH} ký tự.`
        : null

  const otherParty = viewer === 'Tenant' ? 'Chủ trọ' : contract.tenant.fullName
  // Quy tắc phí phạt của FR-87, chỉ để báo trước; có tính hay không là `penaltyAllowed` server trả sau khi gửi.
  // Phí phạt không vượt tiền cọc, nên hợp đồng không đặt cọc thì không nhắc tới.
  const penaltyRule =
    viewer === 'Landlord'
      ? 'Bạn là bên gửi nên bảng thanh lý không có phí phạt.'
      : contract.depositAmount > 0
        ? `Báo trước ít hơn 30 ngày mà trả phòng trước ngày kết thúc hợp đồng (${formatDate(contract.endDate)}) thì Chủ trọ được tính phí phạt, tối đa bằng tiền cọc.`
        : ''

  return (
    <FormDialogBody
      title="Gửi thông báo trả phòng"
      description={[
        `Hợp đồng chuyển sang Đang thanh lý, ${otherParty} nhận thông báo.`,
        penaltyRule,
        viewer === 'Tenant'
          ? 'Chủ trọ chưa lập bảng thanh lý thì bạn rút lại được.'
          : 'Chưa lập bảng thanh lý thì bạn rút lại được.',
      ]
        .filter(Boolean)
        .join(' ')}
      confirmLabel="Gửi thông báo"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return dateError === null && reasonError === null
      }}
      onSubmit={() => onSubmit({ expectedMoveOutDate, reason: trimmedReason })}
    >
      <Field data-invalid={showErrors && dateError !== null}>
        <FieldLabel htmlFor={dateId}>
          Ngày trả phòng dự kiến <span aria-hidden="true">*</span>
        </FieldLabel>
        <Input
          id={dateId}
          type="date"
          min={today}
          value={expectedMoveOutDate}
          onChange={(event) => setExpectedMoveOutDate(event.target.value)}
          disabled={isPending}
          aria-invalid={showErrors && dateError !== null}
        />
        {showErrors && dateError && <FieldError>{dateError}</FieldError>}
      </Field>

      <Field data-invalid={showErrors && reasonError !== null}>
        <FieldLabel htmlFor={reasonId}>
          Lý do <span aria-hidden="true">*</span>
        </FieldLabel>
        <Textarea
          id={reasonId}
          value={reason}
          maxLength={REASON_MAX_LENGTH}
          onChange={(event) => setReason(event.target.value)}
          disabled={isPending}
          aria-invalid={showErrors && reasonError !== null}
        />
        <FieldDescription>
          {reason.length}/{REASON_MAX_LENGTH} ký tự
        </FieldDescription>
        {showErrors && reasonError && <FieldError>{reasonError}</FieldError>}
      </Field>
    </FormDialogBody>
  )
}
