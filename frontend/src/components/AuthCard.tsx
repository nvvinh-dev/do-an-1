import type { ReactNode } from 'react'
import AppLogo from '@/components/AppLogo'

interface AuthCardProps {
  title: string
  /** Một dòng mô tả dưới tiêu đề. */
  description: string
  children: ReactNode
}

/**
 * Khung của một màn xác thực (A1–A4): thẻ trắng bo góc, logo ở đầu thẻ, tiêu đề, một dòng mô tả rồi tới
 * form (docs/design-system.md mục 5, 6.2). Đặt trong `AuthLayout`; `wrap-anywhere` vì mô tả của A4 có
 * email người dùng, không để tràn ngang ở 360px.
 */
export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm md:p-8">
        <AppLogo to="/" />
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">{title}</h1>
          <p className="text-sm text-muted-foreground wrap-anywhere">{description}</p>
        </header>
        {children}
      </div>
    </section>
  )
}
