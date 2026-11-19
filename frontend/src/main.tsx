import '@fontsource/reddit-sans/400.css'
import '@fontsource/reddit-sans/500.css'
import '@fontsource/reddit-sans/600.css'
import '@fontsource/reddit-sans/700.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import { queryClient } from '@/lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
