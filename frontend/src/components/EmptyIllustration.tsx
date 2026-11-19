import { cn } from '@/lib/utils'

export type EmptyIllustrationKind = 'house' | 'document' | 'receipt' | 'bell'

interface EmptyIllustrationProps {
  /** Hình theo loại dữ liệu đang trống: khu trọ/phòng, hợp đồng/yêu cầu, hóa đơn, thông báo. */
  kind: EmptyIllustrationKind
  className?: string
}

/**
 * Tranh minh họa nét đơn giản cho khung "chưa có dữ liệu" (docs/design-system.md mục 8), vẽ bằng SVG theo màu
 * của hệ thống nên không cần tải ảnh. Chỉ để trang trí: câu chữ trong `Empty` đã nói đủ ý.
 * Khung "không có kết quả theo bộ lọc" giữ biểu tượng nhỏ cũ, tranh này chỉ dùng khi chưa có bản ghi nào.
 */
export default function EmptyIllustration({ kind, className }: EmptyIllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 92"
      aria-hidden="true"
      focusable="false"
      className={cn('mb-2 h-auto w-28 shrink-0', className)}
    >
      <ellipse cx="60" cy="84" rx="46" ry="6" className="fill-border" />
      {kind === 'house' && (
        <>
          <rect x="26" y="40" width="68" height="42" rx="3" className="fill-card stroke-primary" strokeWidth="3" />
          <path d="M18 43 60 12l42 31" className="fill-primary stroke-primary" strokeWidth="3" strokeLinejoin="round" />
          <rect x="52" y="58" width="16" height="24" rx="2" className="fill-accent stroke-primary" strokeWidth="3" />
          <rect x="33" y="50" width="12" height="12" rx="2" className="fill-accent stroke-primary" strokeWidth="2.5" />
          <rect x="75" y="50" width="12" height="12" rx="2" className="fill-accent stroke-primary" strokeWidth="2.5" />
          <circle cx="98" cy="22" r="11" className="fill-card stroke-warning" strokeWidth="3" />
          <path d="M98 16v12M92 22h12" className="stroke-warning" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {kind === 'document' && (
        <>
          <path d="M36 12h34l18 18v48a3 3 0 0 1-3 3H36a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z" className="fill-card stroke-primary" strokeWidth="3" strokeLinejoin="round" />
          <path d="M70 12v18h18" className="fill-accent stroke-primary" strokeWidth="3" strokeLinejoin="round" />
          <path d="M42 44h30M42 54h30M42 64h18" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="66" r="11" className="fill-card stroke-warning" strokeWidth="3" />
          <path d="M92 60v12M86 66h12" className="stroke-warning" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {kind === 'receipt' && (
        <>
          <path d="M34 10h52v68l-8.7-6-8.6 6-8.7-6-8.7 6-8.6-6-8.7 6V10Z" className="fill-card stroke-primary" strokeWidth="3" strokeLinejoin="round" />
          <path d="M44 28h32M44 40h32M44 52h18" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <circle cx="90" cy="64" r="11" className="fill-card stroke-warning" strokeWidth="3" />
          <path d="M90 58v12M84 64h12" className="stroke-warning" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {kind === 'bell' && (
        <>
          <path d="M60 14c-14 0-22 10-22 24 0 14-4 20-10 26h64c-6-6-10-12-10-26 0-14-8-24-22-24Z" className="fill-card stroke-primary" strokeWidth="3" strokeLinejoin="round" />
          <path d="M52 70a8 8 0 0 0 16 0" className="fill-accent stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 8v6" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
          <circle cx="90" cy="26" r="9" className="fill-card stroke-warning" strokeWidth="3" />
          <path d="M90 21v10M85 26h10" className="stroke-warning" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
