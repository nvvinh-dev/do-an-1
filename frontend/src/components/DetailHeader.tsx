import type { ReactNode } from 'react'

interface DetailHeaderProps {
  /** Tên đối tượng: "Yêu cầu thuê phòng P101", "Hợp đồng 12". Là `h1` nên giữ ngắn, `StatusBadge` đặt ngoài. */
  title: string
  /** `StatusBadge` của bản ghi; nằm cạnh tiêu đề, không nằm trong `h1`. */
  status?: ReactNode
  /** Một dòng thông tin chính: khu trọ, người thuê, kỳ, hạn. */
  subtitle?: ReactNode
  /** Nút hành động phụ của trang (rút, hủy); nút chính nằm trong `ActionPanel`. Dùng cỡ gọn, không rộng hết hàng trên điện thoại (design-system mục 5). */
  action?: ReactNode
}

/**
 * Đầu trang chi tiết (docs/design-system.md mục 5, 6.2): tên đối tượng, trạng thái, một dòng thông tin
 * chính và nút hành động bên phải từ `md`. Liên kết quay lại là `BackLink` đặt phía trên, ngoài component
 * này, để vẫn hiện khi trang đang tải hoặc lỗi.
 */
export default function DetailHeader({ title, status, subtitle, action }: DetailHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 flex-col gap-2 md:min-w-48 md:flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* `wrap-anywhere`: mã phòng tới 50 ký tự, tên khu trọ dài, không để tràn ngang ở 360px. */}
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">{title}</h1>
          {status}
        </div>
        {subtitle && <p className="text-sm text-muted-foreground wrap-anywhere">{subtitle}</p>}
      </div>
      {action && <div className="md:max-w-[60%]">{action}</div>}
    </header>
  )
}
