import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** Ba vai trò và trang chủ tương ứng (docs/frontend-screens.md mục 1). */
export type E2eRole = 'Tenant' | 'Landlord' | 'Admin'

interface E2eAccount {
  role: E2eRole
  email: string
  passwordEnv: string
  homePath: string
}

/**
 * Tài khoản mẫu dành riêng cho kiểm thử đầu-cuối. Mật khẩu chỉ đọc từ biến môi trường, không ghi vào repo
 * (docs/testing-strategy.md mục 4.3).
 */
export const ACCOUNTS: Record<E2eRole, E2eAccount> = {
  Tenant: {
    role: 'Tenant',
    email: 'e2e-nguoithue@smartrent.test',
    passwordEnv: 'E2E_TENANT_PASSWORD',
    homePath: '/tenant',
  },
  Landlord: {
    role: 'Landlord',
    email: 'e2e-chutro@smartrent.test',
    passwordEnv: 'E2E_LANDLORD_PASSWORD',
    homePath: '/landlord',
  },
  Admin: {
    role: 'Admin',
    email: 'e2e-admin@smartrent.test',
    passwordEnv: 'E2E_ADMIN_PASSWORD',
    homePath: '/admin',
  },
}

/** Phòng mẫu do `e2e/seed.sql` tạo; giá và diện tích riêng để lọc ra đúng phòng này. */
export const SAMPLE_ROOM = {
  code: '[E2E] P01',
  propertyName: '[E2E] Nhà trọ mẫu',
  rentPrice: 1_234_000,
  area: 12.34,
}

/**
 * Hóa đơn mẫu của luồng 3 do `e2e/seed.sql` tạo: hóa đơn định kỳ tháng 11/2026 của hợp đồng Đang hiệu lực giữa
 * `e2e-nguoithue` và phòng `[E2E] P02`, tổng lớn để mỗi lần chạy chỉ thu thêm `paymentAmount` mà vẫn còn nợ.
 */
export const SAMPLE_INVOICE = {
  roomCode: '[E2E] P02',
  paymentAmount: 1_000,
}

export function getPassword(account: E2eAccount): string {
  const password = process.env[account.passwordEnv]
  if (!password) {
    throw new Error(`Chưa đặt biến môi trường ${account.passwordEnv} (mật khẩu của ${account.email}).`)
  }
  return password
}

/** Điền và gửi form Đăng nhập (A1) ở trang đang mở. */
export async function submitLoginForm(page: Page, account: E2eAccount) {
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Mật khẩu').fill(getPassword(account))
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
}

/** Đăng nhập từ `/login` và chờ tới trang chủ của vai trò. */
export async function login(page: Page, account: E2eAccount) {
  await page.goto('/login')
  await submitLoginForm(page, account)
  await expect(page).toHaveURL(account.homePath)
}

/** Ngày hôm nay theo giờ Việt Nam, dạng `YYYY-MM-DD` như ô chọn ngày. */
export function getVietnamToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
}

/** Lấy token qua API (đi qua proxy `/api` của Vite) để dọn dữ liệu trước khi chạy luồng. */
export async function getAccessToken(request: APIRequestContext, account: E2eAccount): Promise<string> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: account.email, password: getPassword(account) },
  })
  expect(response.status(), `Đăng nhập ${account.email} qua API`).toBe(200)
  const body = (await response.json()) as { accessToken: string }
  return body.accessToken
}
