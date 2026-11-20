interface NavCountBadgeProps {
  count: number
  /** Đọc cho trình đọc màn hình, ví dụ "yêu cầu thuê chờ duyệt". */
  label: string
}

/** Số việc đang chờ trên mục menu, nền màu nhấn; không hiện khi bằng 0 (docs/design-system.md mục 5). */
export default function NavCountBadge({ count, label }: NavCountBadgeProps) {
  if (count <= 0) return null

  return (
    <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-highlight px-1.5 text-xs font-bold text-highlight-foreground tabular-nums">
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {label}</span>
    </span>
  )
}
