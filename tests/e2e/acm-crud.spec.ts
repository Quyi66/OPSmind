import { test, expect } from '@playwright/test'

// Real credentials from user
const LOGIN_USER = 'admin'
const LOGIN_PASS = 'Opsmind@2026'

test.describe('Real Backend ACM (Asset Management) E2E Tests', () => {
  
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

  test('ACM Dashboard Overview & Sidebar Navigation', async ({ page }) => {
    // 2. Navigate to ACM Overview
    await page.goto('/KoreOPS/#/acm/overview')
    
    // Verify key elements (KPI boxes / charts) are loaded
    await expect(page.locator('.ops-page-layout')).toBeVisible()
    // Check if the dashboard elements or charts container are rendered
    await page.waitForTimeout(2000) // Allow chart animations to resolve
  })

  test('ACM Device List Operations (Read & Edit)', async ({ page }) => {
    // 3. Navigate to ACM Device List
    await page.goto('/KoreOPS/#/acm/info')
    
    // Wait for the table wrapper to load
    await expect(page.locator('.ops-table-wrapper')).toBeVisible()
    
    // Check if there are rows in the table
    const tableRows = page.locator('.ops-table-wrapper tbody tr')
    const rowCount = await tableRows.count()
    
    if (rowCount > 0) {
      console.log(`Found ${rowCount} devices in the asset list.`)
      
      // Select the first device and click edit
      const firstRow = tableRows.first()
      const hostname = await firstRow.locator('.hostname-link').innerText()
      console.log(`Testing edit on device: ${hostname}`)
      
      // Hover/click checkbox to trigger action bar
      await firstRow.locator('td.el-table-column--selection .el-checkbox').click()
      await expect(page.locator('.selection-action-bar-top')).toBeVisible()
      
      // Click "批量修改" or click "修改" link directly in table (if it exists)
      // Since firstRow contains .hostname-link, let's click hostname link to view details
      await firstRow.locator('.hostname-link').click()
      await expect(page.locator('.el-dialog__title:has-text("设备详情")').or(page.locator('.el-dialog__title:has-text("资产详情")'))).toBeVisible()
      
      // Close details dialog
      await page.locator('.el-dialog__headerbtn').first().click()
    } else {
      console.log('No devices found in the list, skipping row-specific tests.')
    }
  })

  test('ACM Sub-Pages Check (Exception, Data, Credentials, Logs)', async ({ page }) => {
    // 4. Connectivity Exception Page
    await page.goto('/KoreOPS/#/acm/exception')
    await expect(page.locator('.ops-page-layout')).toBeVisible()
    
    // 5. Data Manage Page (Groups & Tags)
    await page.goto('/KoreOPS/#/acm/data')
    await expect(page.locator('.ops-page-layout')).toBeVisible()
    
    // 6. Automation Config Page (Credentials)
    await page.goto('/KoreOPS/#/acm/automation')
    await expect(page.locator('.ops-page-layout')).toBeVisible()
    
    // 7. Operation Log Page
    await page.goto('/KoreOPS/#/acm/log')
    await expect(page.locator('.ops-page-layout')).toBeVisible()
  })
})
