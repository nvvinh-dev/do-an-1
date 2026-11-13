import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useLeaseMutation } from '@/hooks/useLeaseMutation'
import { withdrawMoveOutNotice } from '@/services/contractService'
import type { ContractDetail } from '@/types/contractTypes'
import type { ContractViewer } from '@/utils/getMoveOutNoticeActions'

interface WithdrawMoveOutNoticeDialogProps {
  contract: ContractDetail
  viewer: ContractViewer
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Rút thông báo trả phòng ở T4 và L6 (FR-98): chỉ bên đã gửi, khi chưa có bảng thanh lý. Hợp đồng tiếp
 * tục hiệu lực theo điều khoản đã chốt, bên còn lại nhận thông báo. Bảng thanh lý vừa được lập thì server
 * trả `409`; hộp thoại vẫn mở, hiện `detail` và trang tải lại.
 */
export default function WithdrawMoveOutNoticeDialog({
  contract,
  viewer,
  open,
  onOpenChange,
}: WithdrawMoveOutNoticeDialogProps) {
  const mutation = useLeaseMutation(() => withdrawMoveOutNotice(contract.id))
  const otherParty = viewer === 'Tenant' ? 'Chủ trọ' : contract.tenant.fullName

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rút thông báo trả phòng"
      description={`Hợp đồng tiếp tục hiệu lực theo điều khoản đã chốt, ${otherParty} nhận thông báo. Muốn trả phòng sau này thì gửi thông báo mới.`}
      confirmLabel="Rút thông báo"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã rút thông báo trả phòng')
          },
        })
      }
    />
  )
}
