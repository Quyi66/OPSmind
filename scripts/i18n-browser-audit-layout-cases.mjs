export const LAYOUT_CASES = Object.freeze([
  ['flow-editor-layout', '/jao/schedule'],
  ['linux-patch-table-layout', '/patches/machineScan'],
  ['package-set-layout', '/patches/packageSet'],
  ['install-request-layout', '/patches/installTasks'],
  ['windows-batch-layout', '/patches/windowsVulnerability'],
  ['wsus-layout', '/patches/windowsWsus'],
  ['patch-logs-layout', '/patches/logs'],
  ['host-user-logs-layout', '/users/logs'],
  ['patch-assignment-layout', '/uam/patch-assignment']
])

export async function auditLayoutCase({
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
  if (name === 'flow-editor-layout') {
    await button(content, m.automation.workbench.edit).first().click()
    const root = page.locator('.flow-editor-drawer:visible')
    await root.waitFor()
    await captureSurface(root, 'flow-editor', '.flow-editor-drawer:visible')
    await close(root)
  } else if (name === 'linux-patch-table-layout') {
    await button(content, m.patches.linux.installByPatch).click()
    await captureSurface(
      content.locator('.linux-patch-install-page'),
      'patch-table',
      '.linux-patch-install-page'
    )
  } else if (name === 'package-set-layout') {
    await content.locator('#tab-management').click()
    await captureSurface(content, 'package-sets', '.group-content__view')
    await button(content, m.patches.linux.newPackageSet).click()
    const root = dialog()
    await root.waitFor()
    await captureSurface(root, 'new-package-set', '.el-dialog:visible')
    await close(root)
  } else if (name === 'install-request-layout') {
    await content.locator('.el-select').first().click()
    await page
      .locator('.el-select-dropdown:visible')
      .getByText(m.patches.linux.allTasks, { exact: true })
      .click()
    await captureSurface(content, 'installation-requests', '.group-content__view')
    if (await button(content.locator('.el-table__body'), m.common.moreActions).count()) {
      await button(content.locator('.el-table__body'), m.common.moreActions).first().click()
      await captureSurface(content, 'request-more-menu', '.group-content__view')
      await page.keyboard.press('Escape')
    }
  } else if (name === 'windows-batch-layout') {
    const checkboxes = content.locator('.el-table__body .el-checkbox:not(.is-disabled)')
    const changed = []
    try {
      for (let index = 0; index < Math.min(3, await checkboxes.count()); index++) {
        if (!(await checkboxes.nth(index).locator('input').isChecked())) {
          await checkboxes.nth(index).click()
          changed.push(index)
        }
      }
      await button(content, m.patches.linux.installPatches).click()
      const root = page.locator('.win-patch-batch-install-drawer:visible')
      await root.waitFor()
      await captureSurface(root, 'windows-batch-patches', '.win-patch-batch-install-drawer:visible')
      result.patchRows = await root.locator('.el-table__body tbody tr').count()
      await close(root)
    } finally {
      for (const index of changed)
        if (await checkboxes.nth(index).locator('input').isChecked())
          await checkboxes.nth(index).click()
    }
  } else if (name === 'wsus-layout') {
    await button(content, m.patches.windows.createConfiguration).click()
    const root = dialog()
    await root.waitFor()
    await captureSurface(root, 'new-wsus', '.el-dialog:visible')
    await close(root)
  } else if (name === 'patch-assignment-layout') {
    await button(content.locator('.el-table__body'), m.settings.patchAssignment.assign)
      .first()
      .click()
    const root = page.locator('.patch-assignment-drawer:visible')
    await root.waitFor()
    await captureSurface(root, 'assignment-draft', '.patch-assignment-drawer:visible')
    await close(root)
  } else {
    await captureSurface(content, name, '.group-content__view')
    if (
      name === 'patch-logs-layout' &&
      (await button(content.locator('.el-table__body'), m.common.moreActions).count())
    ) {
      await button(content.locator('.el-table__body'), m.common.moreActions).first().click()
      await captureSurface(content, 'report-menu', '.group-content__view')
      await page.keyboard.press('Escape')
    }
  }
  await settle()
}
