import type { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  /** Một dòng mô tả dưới tiêu đề nhóm. */
  description?: string
  children: ReactNode
}

/**
 * Một nhóm ô nhập của form dài: thẻ trắng, tiêu đề `text-lg font-bold` kèm một dòng mô tả
 * (docs/design-system.md mục 5 "Form", 6.2). Form đặt các nhóm cách nhau `gap-6`, nút gửi nằm cuối form.
 */
export default function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  )
}
