import { Ellipsis, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface MoreAction {
  key: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  /** Thao tác hủy, lưu trữ: chữ đỏ, luôn mở `ConfirmDialog` trước khi làm. */
  destructive?: boolean
}

interface MoreActionsMenuProps {
  actions: readonly MoreAction[]
  /** `page` khi nằm trong `PageHeader`: rộng hết hàng trên điện thoại như các nút cạnh nó. */
  size?: 'default' | 'page'
}

/**
 * Nút **Thao tác khác** ở đầu trang chi tiết (docs/design-system.md mục 6): gom các thao tác ít dùng hoặc
 * phá hủy vào một `dropdown-menu`, để đầu trang chỉ còn việc chính. Không có thao tác nào thì không hiện.
 */
export default function MoreActionsMenu({ actions, size = 'default' }: MoreActionsMenuProps) {
  if (actions.length === 0) {
    return null
  }

  return (
    // `modal={false}`: chọn mục là mở hộp thoại; menu modal còn khóa con trỏ trên trang khi hộp thoại đã mở.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size={size}>
          <Ellipsis />
          Thao tác khác
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            variant={action.destructive ? 'destructive' : 'default'}
            onSelect={action.onSelect}
          >
            <action.icon />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
