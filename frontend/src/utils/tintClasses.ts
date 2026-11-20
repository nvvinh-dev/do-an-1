/** Sắc phụ của ô icon (docs/design-system.md mục 2); mỗi mục giữ một sắc ở mọi nơi. */
export type NavTint = 'teal' | 'sky' | 'violet' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'slate'

/**
 * Nền ô và màu icon theo sắc, dùng chung cho ô icon ở menu và thẻ chỉ số. Viết đủ tên class để
 * Tailwind tìm thấy khi quét mã nguồn.
 */
export const tintClasses: Record<NavTint, string> = {
  teal: 'bg-tint-teal-soft text-tint-teal',
  sky: 'bg-tint-sky-soft text-tint-sky',
  violet: 'bg-tint-violet-soft text-tint-violet',
  indigo: 'bg-tint-indigo-soft text-tint-indigo',
  amber: 'bg-tint-amber-soft text-tint-amber',
  rose: 'bg-tint-rose-soft text-tint-rose',
  emerald: 'bg-tint-emerald-soft text-tint-emerald',
  slate: 'bg-tint-slate-soft text-tint-slate',
}
