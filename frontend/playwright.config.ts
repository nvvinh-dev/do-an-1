import { defineConfig, devices } from '@playwright/test'

/**
 * Kiểm thử đầu-cuối (docs/testing-strategy.md mục 4.3). Chạy trên máy khi backend (`dotnet run`) và
 * frontend (`npm run dev`) đang chạy; không chạy trên CI vì cần mật khẩu tài khoản mẫu và database.
 * Các luồng ghi vào database dùng chung nên chạy tuần tự từng test một.
 */
export default defineConfig({
  testDir: './e2e',
  // Đuôi `.e2e.ts` để Vitest (`npm test`, mặc định nhận `*.spec.ts`, `*.test.ts`) không chạy nhầm các file này.
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Lần đầu mở một trang, Vite dev mới biên dịch module của trang đó nên có thể chậm hơn 5 giây mặc định.
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
