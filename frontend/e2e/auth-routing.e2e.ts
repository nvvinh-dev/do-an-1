import { expect, test } from '@playwright/test'
import { ACCOUNTS, login } from './support'

/**
 * Luồng 1 — Đăng nhập và phân quyền route (docs/testing-strategy.md mục 4.3, UC02). Không ghi gì vào
 * database nên chạy lặp bao nhiêu lần cũng được.
 */
test.describe('Luồng 1: đăng nhập và phân quyền route', () => {
  test('chưa đăng nhập mở /tenant thì bị chuyển tới /login kèm redirect', async ({ page }) => {
    await page.goto('/tenant')

    await expect(page).toHaveURL('/login?redirect=%2Ftenant')
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
  })

  for (const account of Object.values(ACCOUNTS)) {
    test(`${account.role} đăng nhập về ${account.homePath}, mở route vai trò khác bị chuyển về`, async ({ page }) => {
      await login(page, account)

      const otherHomePaths = Object.values(ACCOUNTS)
        .filter((other) => other.role !== account.role)
        .map((other) => other.homePath)

      for (const path of otherHomePaths) {
        await page.goto(path)
        await expect(page, `${account.role} mở ${path}`).toHaveURL(account.homePath)
      }
    })
  }
})
