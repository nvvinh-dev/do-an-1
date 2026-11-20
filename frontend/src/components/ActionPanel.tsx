import { useId, type ReactNode } from 'react'

interface ActionPanelProps {
  /** Việc cụ thể, ví dụ "Yêu cầu đang chờ bạn duyệt". */
  title: string
  /** Hạn, hậu quả, liên hệ; mỗi đoạn một thẻ `p`. */
  children?: ReactNode
  /** Nút hành động chính, đúng điều kiện theo trạng thái như trước. */
  actions?: ReactNode
}

/**
 * Khối "Cần bạn làm gì" ở đầu cột chính của trang chi tiết (docs/design-system.md mục 5, 6.2). Chỉ vẽ khi
 * người dùng có thao tác đang chờ; không có việc nào thì trang không vẽ khối này. Cùng nền với khối
 * Việc cần xử lý của dashboard để nhận ra ngay là việc đang chờ.
 */
export default function ActionPanel({ title, children, actions }: ActionPanelProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl border border-highlight-soft bg-highlight-soft/40 p-4 text-card-foreground md:p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wider text-highlight-soft-foreground uppercase">Cần bạn làm gì</p>
        <h2 id={headingId} className="text-lg font-bold wrap-anywhere">
          {title}
        </h2>
      </div>
      {children && <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">{children}</div>}
      {actions && <div className="flex flex-col gap-2 md:flex-row">{actions}</div>}
    </section>
  )
}
