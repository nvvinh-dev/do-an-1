import { House } from 'lucide-react'
import { Link } from 'react-router'

interface AppLogoProps {
  /** Trang mở khi bấm logo: trang chủ của vai trò, hoặc `/` với khách. */
  to: string
}

export default function AppLogo({ to }: AppLogoProps) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md text-lg font-semibold">
      <House className="size-6 text-primary" aria-hidden="true" />
      <span>SmartRent</span>
    </Link>
  )
}
