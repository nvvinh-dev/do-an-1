import { expect, test, type APIRequestContext } from '@playwright/test'
import { ACCOUNTS, getAccessToken, getVietnamToday, SAMPLE_ROOM, submitLoginForm } from './support'

const ROOM_TITLE = `Phòng ${SAMPLE_ROOM.code} · ${SAMPLE_ROOM.propertyName}`
const SEARCH_PATH =
  `/?minPrice=${SAMPLE_ROOM.rentPrice}&maxPrice=${SAMPLE_ROOM.rentPrice}` +
  `&minArea=${SAMPLE_ROOM.area}&maxArea=${SAMPLE_ROOM.area}`

/**
 * Lần chạy trước dừng giữa chừng thì còn một yêu cầu Chờ duyệt cho phòng mẫu, và server trả `409` khi gửi
 * yêu cầu thứ hai. Rút các yêu cầu đó qua API trước để luồng chạy lặp được.
 */
async function cancelPendingRequests(request: APIRequestContext) {
  const token = await getAccessToken(request, ACCOUNTS.Tenant)
  const headers = { Authorization: `Bearer ${token}` }

  const searchResponse = await request.get(`/api/v1/rooms/search${SEARCH_PATH.slice(1)}`)
  expect(searchResponse.status(), 'Tìm phòng mẫu qua API').toBe(200)
  const search = (await searchResponse.json()) as { items: { id: number; code: string }[] }
  const room = search.items.find((item) => item.code === SAMPLE_ROOM.code)
  expect(room, `Phòng ${SAMPLE_ROOM.code} phải Trống và đang hiển thị — chạy e2e/seed.sql trước`).toBeDefined()

  const listResponse = await request.get(`/api/v1/rental-requests?status=ChoDuyet&roomId=${room!.id}`, { headers })
  expect(listResponse.status()).toBe(200)
  const pending = (await listResponse.json()) as { items: { id: number }[] }
  for (const item of pending.items) {
    const cancelResponse = await request.post(`/api/v1/rental-requests/${item.id}/cancel`, { headers })
    expect(cancelResponse.status(), `Rút yêu cầu thuê ${item.id} còn sót`).toBe(204)
  }
}

/**
 * Luồng 2 — Tìm phòng và gửi yêu cầu thuê (docs/testing-strategy.md mục 4.3, UC14–UC17). Yêu cầu gửi xong
 * được rút ngay, nên phòng mẫu vẫn Trống sau mỗi lần chạy.
 */
test('Luồng 2: khách lọc phòng, Người thuê gửi rồi rút yêu cầu thuê', async ({ page, request }) => {
  await cancelPendingRequests(request)

  await test.step('Khách lọc phòng theo giá và diện tích, mở chi tiết', async () => {
    await page.goto('/')
    await page.locator('#search-minPrice').fill(SAMPLE_ROOM.rentPrice.toLocaleString('vi-VN'))
    await page.locator('#search-maxPrice').fill(SAMPLE_ROOM.rentPrice.toLocaleString('vi-VN'))
    await page.locator('#search-minArea').fill(SAMPLE_ROOM.area.toLocaleString('vi-VN'))
    await page.locator('#search-maxArea').fill(SAMPLE_ROOM.area.toLocaleString('vi-VN'))
    await page.getByRole('button', { name: 'Tìm phòng' }).click()

    await expect(page).toHaveURL(SEARCH_PATH)
    await page.getByRole('link', { name: ROOM_TITLE }).click()

    await expect(page).toHaveURL(/\/rooms\/\d+$/)
    await expect(page.getByRole('heading', { level: 1, name: ROOM_TITLE })).toBeVisible()
  })

  const roomPath = new URL(page.url()).pathname

  await test.step('Khách bấm đăng nhập, Người thuê đăng nhập xong quay lại đúng phòng', async () => {
    await page.getByRole('link', { name: 'Đăng nhập để gửi yêu cầu' }).click()
    await expect(page).toHaveURL(`/login?redirect=${encodeURIComponent(roomPath)}`)

    await submitLoginForm(page, ACCOUNTS.Tenant)
    await expect(page).toHaveURL(roomPath)
  })

  await test.step('Người thuê gửi yêu cầu thuê', async () => {
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê' }).click()
    await page.getByLabel('Ngày dự kiến vào ở').fill(getVietnamToday())
    await page.getByLabel('Ghi chú cho Chủ trọ').fill('Kiểm thử đầu-cuối, yêu cầu sẽ được rút ngay.')
    await page.getByRole('button', { name: 'Gửi yêu cầu thuê' }).click()

    await expect(page).toHaveURL(/\/tenant\/rental-requests\/\d+$/)
    await expect(page.getByText('Đã gửi yêu cầu thuê')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: `Yêu cầu thuê phòng ${SAMPLE_ROOM.code}` })).toBeVisible()
    await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible()
  })

  await test.step('Người thuê rút yêu cầu', async () => {
    await page.getByRole('button', { name: 'Rút yêu cầu' }).click()
    const dialog = page.getByRole('alertdialog')
    await dialog.getByRole('button', { name: 'Rút yêu cầu' }).click()

    await expect(page.getByText('Đã rút yêu cầu thuê')).toBeVisible()
    await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rút yêu cầu' })).toHaveCount(0)
  })

  await test.step('Phòng mẫu vẫn Trống và còn trong kết quả tìm kiếm', async () => {
    await page.goto(SEARCH_PATH)
    await expect(page.getByRole('link', { name: ROOM_TITLE })).toBeVisible()
  })
})
