import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthCardProps {
  /** Icon của màn, vẽ trong ô nền `primary-soft` phía trên tiêu đề. */
  icon: LucideIcon
  title: string
  /** Một dòng mô tả dưới tiêu đề. */
  description: string
  children: ReactNode
}

/**
 * Khung của một màn xác thực (A1–A4): thẻ trắng bo góc, ô icon của màn, tiêu đề, một dòng mô tả rồi tới
 * form (docs/design-system.md mục 5, 6.2). Logo đã có ở thanh trên của `PublicLayout` nên không lặp trong thẻ.
 * Đặt trong `AuthLayout`; `wrap-anywhere` vì mô tả của A4 có email người dùng, không để tràn ngang ở 360px.
 */
export default function AuthCard({ icon: Icon, title, description, children }: AuthCardProps) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <div className="flex flex-col gap-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm md:p-8">
        <header className="flex flex-col gap-3">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon className="size-5" strokeWidth={2} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">{title}</h1>
          <p className="text-sm text-muted-foreground wrap-anywhere">{description}</p>
        </header>
        {children}
      </div>
    </section>
  )
}
