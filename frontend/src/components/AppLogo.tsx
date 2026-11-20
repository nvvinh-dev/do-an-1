import { House } from 'lucide-react'
import { Link } from 'react-router'

interface AppLogoProps {
  /** Trang mở khi bấm logo: trang chủ của vai trò, hoặc `/` với khách. */
  to: string
}

/** Logo: icon nhà trắng trong ô màu chính bo 9px, chữ đậm (docs/design-system.md mục 4). */
export default function AppLogo({ to }: AppLogoProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md text-lg font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true" className="grid size-[30px] place-items-center rounded-[9px] bg-primary text-primary-foreground">
        <House className="size-[18px]" strokeWidth={2.25} />
      </span>
      <span>SmartRent</span>
    </Link>
  )
}
