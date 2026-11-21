import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ACCOUNTS, getAccessToken, login, SAMPLE_INVOICE } from './support'

/** Ảnh PNG 1×1 làm minh chứng; server đọc định dạng từ nội dung file nên phải là PNG thật. */
const PROOF_IMAGE = {
  name: 'minh-chung-e2e.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
}

const INVOICE_LINK_NAME = `Phòng ${SAMPLE_INVOICE.roomCode}`

/** Sau khi Chủ trọ xác nhận mà hóa đơn còn nợ: Thanh toán một phần, hoặc Quá hạn khi đã qua hạn (api-design mục 9). */
const STILL_OWING_STATUSES = ['ThanhToanMotPhan', 'QuaHan']

interface InvoiceSnapshot {
  id: number
  status: string
  totalAmount: number
  paidAmount: number
  paymentReports: { id: number; status: string }[]
}

async function authHeaders(request: APIRequestContext, account: (typeof ACCOUNTS)[keyof typeof ACCOUNTS]) {
  return { Authorization: `Bearer ${await getAccessToken(request, account)}` }
}

/** Đọc hóa đơn mẫu bằng tài khoản Người thuê mẫu. */
async function getSampleInvoice(request: APIRequestContext): Promise<InvoiceSnapshot> {
  const headers = await authHeaders(request, ACCOUNTS.Tenant)

  const listResponse = await request.get('/api/v1/invoices?type=DinhKy', { headers })
  expect(listResponse.status(), 'Danh sách hóa đơn của Người thuê mẫu').toBe(200)
  const list = (await listResponse.json()) as { items: { id: number; roomCode: string }[] }
  const item = list.items.find((invoice) => invoice.roomCode === SAMPLE_INVOICE.roomCode)
  expect(item, `Hóa đơn mẫu của phòng ${SAMPLE_INVOICE.roomCode} — chạy e2e/seed.sql trước`).toBeDefined()

  const detailResponse = await request.get(`/api/v1/invoices/${item!.id}`, { headers })
  expect(detailResponse.status()).toBe(200)
  return (await detailResponse.json()) as InvoiceSnapshot
}

/**
 * Lần chạy trước dừng giữa chừng thì hóa đơn mẫu còn một lượt báo Chờ xác nhận, và Người thuê không báo thêm được.
 * Chủ trọ mẫu từ chối lượt đó qua API — từ chối không cộng tiền, hóa đơn về trạng thái trước khi báo.
 */
async function rejectLeftoverReport(request: APIRequestContext): Promise<InvoiceSnapshot> {
  const invoice = await getSampleInvoice(request)
  const pending = invoice.paymentReports.filter((report) => report.status === 'ChoXacNhan')
  if (pending.length === 0) {
    return invoice
  }

  const headers = await authHeaders(request, ACCOUNTS.Landlord)
  for (const report of pending) {
    const response = await request.post(`/api/v1/invoices/${invoice.id}/payment-reports/${report.id}/reject`, {
      headers,
      data: { reason: 'Kiểm thử đầu-cuối: dọn lượt báo còn sót từ lần chạy trước.' },
    })
    expect(response.status(), `Từ chối lượt báo ${report.id} còn sót`).toBe(204)
  }
  return getSampleInvoice(request)
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Tài khoản' }).click()
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login/)
}

/**
 * Luồng 3 — Báo thanh toán và xác nhận (docs/testing-strategy.md mục 4.3, UC27, UC28). Mỗi lần chạy thu thêm
 * 1.000 ₫ vào hóa đơn mẫu có tổng lớn, nên hóa đơn vẫn còn nợ và báo thanh toán tiếp được (FR-45).
 * Báo đã thanh toán giới hạn 10 lần mỗi giờ cho mỗi tài khoản (security-design mục 6): chạy quá số đó trong một giờ
 * thì bước báo thanh toán gặp `429`, khởi động lại API để xóa bộ đếm.
 */
test('Luồng 3: Người thuê báo đã thanh toán kèm minh chứng, Chủ trọ xác nhận', async ({ page, request }) => {
  const before = await rejectLeftoverReport(request)
  const remaining = before.totalAmount - before.paidAmount
  expect(
    remaining,
    'Hóa đơn mẫu phải còn nợ hơn một lần thu — đã hết thì tạo hóa đơn mẫu mới',
  ).toBeGreaterThan(SAMPLE_INVOICE.paymentAmount)
  const invoicePath = (role: 'tenant' | 'landlord') => `/${role}/invoices/${before.id}`

  await test.step('Người thuê mở hóa đơn mẫu từ danh sách', async () => {
    await login(page, ACCOUNTS.Tenant)
    await page.goto('/tenant/invoices')
    await page.getByRole('link', { name: INVOICE_LINK_NAME }).click()

    await expect(page).toHaveURL(invoicePath('tenant'))
    await expect(page.getByRole('heading', { level: 1, name: `Hóa đơn phòng ${SAMPLE_INVOICE.roomCode}` })).toBeVisible()
  })

  await test.step('Người thuê báo đã thanh toán 1.000 ₫ kèm ảnh minh chứng', async () => {
    await page.getByRole('button', { name: 'Báo đã thanh toán' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Báo đã thanh toán' })

    // Ô mặc định là số còn phải trả, hiện có dấu chấm khi chưa focus và đổi sang chữ số khi focus: bấm vào ô
    // trước như người dùng, để `fill` thay cả giá trị đang hiện thay vì gõ nối vào.
    const amountInput = dialog.getByLabel('Số tiền đã trả')
    await amountInput.click()
    await amountInput.fill(String(SAMPLE_INVOICE.paymentAmount))
    await expect(amountInput).toHaveValue(String(SAMPLE_INVOICE.paymentAmount))
    await dialog.locator('input[type="file"]').setInputFiles(PROOF_IMAGE)
    await expect(dialog.getByRole('img', { name: 'Ảnh minh chứng thanh toán, ảnh 1' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Gửi', exact: true }).click()

    await expect(page.getByText('Đã báo thanh toán, chờ Chủ trọ xác nhận')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Đang chờ Chủ trọ xác nhận')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Báo đã thanh toán' })).toHaveCount(0)
  })

  await test.step('Chủ trọ mở hóa đơn đang chờ xác nhận và xác nhận đã thu', async () => {
    await logout(page)
    await login(page, ACCOUNTS.Landlord)
    await page.goto('/landlord/invoices?status=ChoXacNhan')
    await page.getByRole('link', { name: INVOICE_LINK_NAME }).click()
    await expect(page).toHaveURL(invoicePath('landlord'))

    await page.getByRole('button', { name: 'Xác nhận đã thu' }).click()
    const dialog = page.getByRole('alertdialog', { name: 'Xác nhận đã thu' })
    // Số tiền thực thu mặc định bằng số Người thuê khai.
    await expect(dialog.getByLabel('Số tiền thực thu')).toHaveValue(
      SAMPLE_INVOICE.paymentAmount.toLocaleString('vi-VN'),
    )
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click()

    await expect(page.getByText('Đã xác nhận thanh toán')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('button', { name: 'Xác nhận đã thu' })).toHaveCount(0)
  })

  await test.step('Hóa đơn mẫu thu thêm đúng 1.000 ₫ và vẫn còn nợ', async () => {
    const after = await getSampleInvoice(request)
    expect(after.paidAmount).toBe(before.paidAmount + SAMPLE_INVOICE.paymentAmount)
    expect(after.totalAmount).toBe(before.totalAmount)
    expect(STILL_OWING_STATUSES).toContain(after.status)
    expect(after.paymentReports.filter((report) => report.status === 'ChoXacNhan')).toHaveLength(0)
  })
})
