import { useSyncExternalStore } from 'react'

// Dưới lg (1024px), sidebar của Chủ trọ và Admin chuyển sang dạng trượt (docs/design-system.md mục 5).
const MOBILE_QUERY = '(max-width: 1023px)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches)
}
