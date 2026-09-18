import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Chuyển tiếp mọi lời gọi API sang backend khi chạy dev.
      '/api': {
        target: 'http://localhost:5179',
        changeOrigin: true,
      },
    },
  },
})
