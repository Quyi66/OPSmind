// Only surfaces reached through the current account's actual menu and reviewed UI handlers.
export const MANAGEMENT_CASES = Object.freeze([
  ['asset-import', '/acm/info'],
  ['asset-batch-edit', '/acm/info'],
  ['asset-credentials', '/acm/automation'],
  ['team-members', '/uam/team'],
  ['inspection-item-hosts', '/cac/results']
])

export async function auditManagementCase({
  name,
  page,
  content,
  m,
  button,
  dialog,
  close,
  settle,
  captureSurface,
  result
}) {
  if (name === 'asset-import') {
    await button(content, m.asset.importDevices).click()
    const root = dialog()
    await root.waitFor()
    await captureSurface(root, 'import-initial', '.el-dialog:visible')
    result.notCovered = ['Selected files, upload, import execution and template downloads']
    await close(root)
  } else if (name === 'asset-batch-edit') {
    const checkbox = content.locator('.el-table__body .el-checkbox:not(.is-disabled)').first()
    await checkbox.waitFor()
    const selected = await checkbox.locator('input').isChecked()
    if (!selected) await checkbox.click()
    try {
      await button(content, m.asset.moreActions).click()
      await page
        .locator('.el-dropdown-menu:visible')
        .getByText(m.asset.batchEdit, { exact: true })
        .click()
      const root = dialog()
      await root.waitFor()
      await captureSurface(root, 'batch-edit-initial', '.el-dialog:visible')
      await root.locator('textarea').focus()
      await root.locator('textarea').blur()
      await root.locator('.el-form-item__error').waitFor()
      await captureSurface(root, 'batch-edit-validation', '.el-dialog:visible')
      await close(root)
    } finally {
      if (!selected && (await checkbox.locator('input').isChecked())) await checkbox.click()
    }
  } else if (name === 'asset-credentials') {
    await button(content.locator('.el-table__body'), m.common.edit).first().click()
    const device = page.locator('.automation-drawer:visible')
    await device.waitFor()
    await captureSurface(device, 'device-credentials', '.automation-drawer:visible')
    // New template only opens a local draft; no save or credential change.
    await button(device, m.asset.newTemplate).click()
    const template = page.locator('.ansible-drawer:visible')
    await template.waitFor()
    await captureSurface(template, 'new-shared-template', '.ansible-drawer:visible')
    await close(template)
    await close(device)
    await content.locator('#tab-ansible').click()
    await settle()
    const edits = button(content.locator('.el-table__body'), m.common.edit)
    if (await edits.count()) {
      await edits.first().click()
      await template.waitFor()
      await captureSurface(template, 'edit-shared-template', '.ansible-drawer:visible')
      await close(template)
    } else result.notCovered = ['Existing shared template: current list is empty']
    await content.locator('#tab-automation').click()
  } else if (name === 'team-members') {
    for (const mode of ['create', 'edit']) {
      await button(
        mode === 'create' ? content : content.locator('.el-table__body'),
        mode === 'create' ? m.settings.team.create : m.common.edit
      )
        .first()
        .click()
      const root = dialog()
      await root.waitFor()
      const tabs = root.getByRole('tab')
      await captureSurface(root, `${mode}-basic`, '.el-dialog:visible')
      await tabs.nth(1).click()
      await captureSurface(root, `${mode}-members`, '.el-dialog:visible')
      result.memberOptions = await root.locator('.checkbox-grid .el-checkbox').count()
      await close(root)
    }
  } else if (name === 'inspection-item-hosts') {
    const report = button(content.locator('.el-table__body'), m.inspection.results.checkResults)
    if (!(await report.count()))
      throw new Error('No completed inspection report in the current list')
    const listRoute = await page.evaluate(() => window.__VUE_ROUTER__.currentRoute.value.fullPath)
    result.dataCoverage = []
    let found = false
    for (let index = 0; index < Math.min(3, await report.count()); index++) {
      await report.nth(index).click()
      const root = content.locator('.result-detail-page')
      await root.waitFor()
      await settle()
      await root.locator('#tab-overview').click()
      await settle()
      const items = root.locator('.el-table__body tbody tr')
      const count = await items.count()
      result.dataCoverage.push({ recordIndex: index, checkItems: count })
      if (!count) {
        await captureSurface(root, `empty-report-${index}`, '.result-detail-page')
        await page.evaluate(route => window.__VUE_ROUTER__.push(route), listRoute)
        await settle()
        continue
      }
      await items.first().locator('td').first().getByRole('button').click()
      const hosts = page
        .locator('.el-dialog:visible')
        .filter({ has: page.locator('.check-item-hosts-dialog') })
      await hosts.locator('.check-item-hosts-dialog').waitFor()
      await captureSurface(hosts, 'inspection-item-hosts', '.el-dialog:visible')
      result.hostRows = await hosts.locator('.el-table__body tbody tr').count()
      const details = button(hosts.locator('.el-table__body'), m.inspection.report.details)
      if (await details.count()) {
        await details.first().click()
        const detail = page
          .locator('.el-dialog:visible')
          .filter({ has: page.locator('.check-item-detail-dialog') })
        await captureSurface(detail, 'inspection-item-detail', '.el-dialog:visible')
        await close(detail)
      } else result.notCovered = ['Host detail: selected check item returned no hosts']
      await close(hosts)
      found = true
      break
    }
    if (!found)
      throw new Error(
        'Sampled inspection reports have no check items; comparison remains uncovered'
      )
  }
}
