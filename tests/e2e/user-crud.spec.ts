import { test, expect } from '@playwright/test'

// Real credentials from user
const LOGIN_USER = 'admin'
const LOGIN_PASS = 'Opsmind@2026'

test.describe('Real Backend User Management E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Visit Login page and login
    await page.goto('/KoreOPS/#/login')
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    
    // Wait for page-side setTimeout autofocus (100ms) to fire first to avoid focus hijacking
    await page.waitForTimeout(500)

    await page.fill('#username', LOGIN_USER)
    await page.fill('#password', LOGIN_PASS)
    await page.click('button[type="submit"]')

    // Wait for redirection to homepage dashboard
    await page.waitForURL('**/KoreOPS/#/home')
    await expect(page).toHaveTitle('KoreOPS')
  })

  test('User List Page Navigation & Search', async ({ page }) => {
    // Navigate to User List
    await page.goto('/KoreOPS/#/users/users')
    await expect(page.locator('.ops-table-wrapper')).toBeVisible()

    // Test search field interaction (input and search trigger)
    await page.fill('input[placeholder="主机/IP/用户名/用户组"]', 'admin')
    await page.click('button:has-text("搜索")')
    await page.click('button:has-text("重置")')
  })

  test('User Groups Page & Operation Logs Page Navigation', async ({ page }) => {
    // Navigate to User Groups
    await page.goto('/KoreOPS/#/users/groups')
    await expect(page.locator('.ops-table-wrapper')).toBeVisible()

    // Navigate to Operation Logs
    await page.goto('/KoreOPS/#/users/logs')
    await expect(page.locator('.ops-table-wrapper')).toBeVisible()

    // Navigate to User Overview
    await page.goto('/KoreOPS/#/users/overview')
    await expect(page.locator('.ops-page-layout')).toBeVisible()
  })
})
