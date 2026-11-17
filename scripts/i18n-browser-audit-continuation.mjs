// Local drafts, report reads, and existing run results reached through active menus.
export const CONTINUATION_CASES = Object.freeze([
  ['windows-log-results', '/patches/logs'],
  ['asset-batch-credentials', '/acm/automation'],
  ['asset-device-dialogs', '/acm/info'],
  ['asset-group-tag-dialogs', '/acm/data'],
  ['inspection-host-filters', '/cac/results'],
  ['platform-user-dialogs', '/uam/user'],
  ['file-library-content', '/gfs/fileLibrary'],
  ['script-library-content', '/gfs/scriptLibrary'],
  ['tool-file-multiple-preview', '/jao/jobs'],
  ['run-record-type-results', '/run-records/logs']
])

const bodyRows = '.el-table__body tbody tr'
const visibleDialog = '.el-dialog:visible'

export async function auditContinuationCase({
  name,
  page,
  content,
  m,
  button,
  dialog,
  close,
  settle,
  captureSurface,
  captureExecutionResult,
  result
}) {
  const dialogWith = selector => page.locator(visibleDialog).filter({ has: page.locator(selector) })
  const uncovered = (result.notCovered = [])
  const captureDialog = async (label, root = dialog()) => {
    await root.waitFor()
    await captureSurface(root, label, visibleDialog)
  }
  const captureFile = async (scope, label) => {
    const root = page.locator(scope)
    const viewer = root.locator('.file-content-viewer')
    await viewer.waitFor()
    await captureSurface(root, label, scope)
    if (
      await viewer.locator('.no-preview:visible,.image-error:visible,.word-error:visible').count()
    )
      throw new Error('File content viewer returned an unavailable preview')

    const code = viewer.locator('.code-viewer:visible')
    if (await code.count()) {
      const available = await code.locator('.cm-content').evaluate(
        (node, [unavailable, errorPrefix]) => {
          const value = node.textContent.trim()
          return Boolean(value) && value !== unavailable && !value.startsWith(errorPrefix)
        },
        [
          m.automation.file.contentUnavailable,
          m.automation.file.loadContentFailed.split('{message}')[0]
        ]
      )
      if (!available) throw new Error('File content viewer returned empty or failed content')
    }
    await close(root)
  }
  const selectOption = async (field, label) => {
    await field.locator('.el-select__wrapper').click()
    await page.getByRole('option', { name: label, exact: true }).click()
    await settle()
  }
  const rowAction = label => button(content.locator('.el-table__body:visible'), label)
  const runStatuses = content.locator('.el-table__body .run-log-status-tag--clickable')
  const filterField = label =>
    content
      .locator('.ops-filter-bar .el-form-item')
      .filter({ has: page.getByText(label, { exact: true }) })

  if (name === 'windows-log-results') {
    result.dataCoverage = []
    try {
      await selectOption(filterField(m.automation.records.timeRange), m.patches.logs.lastYear)
      for (const [type, tool] of [
        ['scan', 'Fteqeo'],
        ['install', 'EAsxlK'],
        ['rollback', 'HiuT3F']
      ]) {
        await selectOption(filterField(m.patches.logs.operationType), m.execution.tools[tool])
        const labels = (await runStatuses.allTextContents()).map(label => label.trim())
        const records = []
        result.dataCoverage.push({ type, rows: labels.length, records })
        if (labels.length) {
          const distinct = labels.findIndex(label => label !== labels[0])
          for (const index of distinct > 0 ? [0, distinct] : [0]) {
            await runStatuses.nth(index).click()
            const tabs = await captureExecutionResult(`windows-${type}-${index}`)
            records.push({ status: labels[index], tabs })
          }
        } else {
          await captureSurface(content, `windows-${type}-empty-list`)
          uncovered.push(`Windows ${type} result: no record in the selected period`)
        }
      }
    } finally {
      await button(content, m.common.reset).click()
    }
  } else if (name === 'asset-batch-credentials') {
    await button(content, m.asset.batchEnroll).click()
    const root = dialogWith('.device-manage-tabs')
    await captureDialog('password-enrollment', root)
    const aap = root.getByText(m.asset.aapInstanceGroup, { exact: true })
    result.aap = await aap.isVisible()
    if (!result.aap)
      uncovered.push('AAP instance groups: current engine uses the standard node selector')
    await root.locator('#tab-ssh').click()
    await captureDialog('ssh-enrollment', root)
    await close(root)
  } else if (name === 'asset-device-dialogs') {
    const edits = rowAction(m.common.edit)
    if (!(await edits.count())) throw new Error('No editable device in the current list')
    await edits.first().click()
    const editor = dialogWith('.asset-edit')
    await captureDialog('edit-device', editor)
    result.deviceFields = await editor.locator('.el-form-item').count()
    if (!result.deviceFields) uncovered.push('Device fields: editor returned no model fields')
    await close(editor)

    const checkbox = content
      .locator('.el-table__body:visible .el-checkbox:not(.is-disabled)')
      .first()
    const selected = await checkbox.locator('input').isChecked()
    if (!selected) await checkbox.click()
    try {
      for (const [label, state] of [
        [m.asset.reviewSelection, 'selected-devices'],
        [m.asset.addTag, 'add-device-tag'],
        [m.asset.addGroup, 'add-device-to-group']
      ]) {
        await button(content, label).first().click()
        const root = state === 'selected-devices' ? page.locator('.el-drawer:visible') : dialog()
        await root.waitFor()
        await captureSurface(
          root,
          state,
          state === 'selected-devices' ? '.el-drawer:visible' : visibleDialog
        )
        await close(root)
      }
    } finally {
      if (!selected && (await checkbox.locator('input').isChecked())) await checkbox.click()
    }
  } else if (name === 'asset-group-tag-dialogs') {
    try {
      for (const [tab, label] of [
        ['group', m.asset.newGroup],
        ['tag', m.asset.newTag]
      ]) {
        await content.locator(`#tab-${tab}`).click()
        await settle()
        await button(content, label).click()
        await captureDialog(`new-${tab}`)
        await close(dialog())
        const edits = rowAction(m.common.edit)
        if (await edits.count()) {
          await edits.first().click()
          await captureDialog(`edit-${tab}`)
          await close(dialog())
        } else uncovered.push(`Edit ${tab}: no editable row in the current list`)
      }
    } finally {
      await content.locator('#tab-group').click()
    }
  } else if (name === 'inspection-host-filters') {
    const reports = rowAction(m.inspection.results.checkResults)
    const listRoute = await page.evaluate(() => window.__VUE_ROUTER__.currentRoute.value.fullPath)
    result.dataCoverage = []
    for (let index = 0; index < Math.min(3, await reports.count()); index++) {
      await reports.nth(index).click()
      const report = content.locator('.result-detail-page')
      await report.waitFor()
      await settle()
      const hosts = report.locator(bodyRows).locator('td:last-child .metric-link-btn')
      const hostCount = await hosts.count()
      result.dataCoverage.push({ report: index, hostRows: hostCount })
      if (hostCount) {
        const root = dialogWith('.host-detail-dialog')
        const counts = (await hosts.allTextContents()).map(Number)
        await hosts.nth(counts.indexOf(Math.max(...counts))).click()
        for (const status of ['all', 'passed', 'checkFailed', 'manual', 'skipped', 'noData']) {
          if (status !== 'all')
            await selectOption(root.locator('.host-detail-toolbar'), m.inspection.status[status])
          await captureDialog(`host-${status}`, root)
          result.dataCoverage.push({ status, rows: await root.locator(bodyRows).count() })
        }
        await selectOption(root.locator('.host-detail-toolbar'), m.inspection.status.all)
        const checks = button(root.locator('.el-table__body'), m.inspection.report.details)
        const checkCount = await checks.count()
        if (!checkCount) uncovered.push('Item details: selected host returned no checks')
        // Sample multiple independent checks from the selected host.
        for (let item = 0; item < Math.min(8, checkCount); item++) {
          await checks.nth(item).click()
          const detail = dialogWith('.check-item-detail-dialog')
          await captureDialog(`host-check-${item}`, detail)
          const output = detail.locator('.output-content pre:not(.empty)')
          result.dataCoverage.push({
            check: item,
            outputLength: (await output.count())
              ? await output.evaluate(node => node.textContent.length)
              : 0
          })
          await close(detail)
        }
        await close(root)
        return
      }
      await captureSurface(report, `empty-host-report-${index}`, '.result-detail-page')
      await page.evaluate(route => window.__VUE_ROUTER__.push(route), listRoute)
      await settle()
    }
    throw new Error('No inspection host rows in the sampled reports')
  } else if (name === 'platform-user-dialogs') {
    for (const mode of ['create', 'edit']) {
      const action =
        mode === 'create' ? button(content, m.settings.user.add) : rowAction(m.common.edit)
      if (!(await action.count())) {
        uncovered.push(`${mode} user: action unavailable for the current account/list`)
        continue
      }
      await action.first().click()
      const root = dialogWith('.el-tabs')
      await captureDialog(`${mode}-basic`, root)
      const other = root.getByRole('button', { name: m.settings.user.otherInfo, exact: true })
      if ((await other.getAttribute('aria-expanded')) !== 'true') await other.click()
      if (mode === 'edit')
        await root.getByText(m.settings.user.changePassword, { exact: true }).click()
      await captureDialog(`${mode}-expanded-basic`, root)
      for (const tab of ['roles', 'applets']) {
        await root.locator(`#tab-${tab}`).click()
        await captureDialog(`${mode}-${tab}`, root)
        result[`${mode}-${tab}`] = await root.locator('.checkbox-grid:visible .el-checkbox').count()
      }
      await close(root)
    }
  } else if (name === 'file-library-content' || name === 'script-library-content') {
    const entries = content.locator('.file-name-cell')
    const files = entries.filter({ hasNot: page.locator('.fa-folder, .fa-level-up') })
    const folders = entries.filter({ has: page.locator('.fa-folder') })
    const ancestors = content.locator('.breadcrumb .dir-link')
    let visitedFolders = 0
    const findFile = async depth => {
      if (await files.count()) return true
      if (!depth) return false
      const count = await folders.count()
      for (let index = 0; index < count && visitedFolders < 8; index++) {
        await folders.nth(index).locator('.file-name').click()
        visitedFolders++
        await settle()
        if (await findFile(depth - 1)) return true
        await ancestors.last().click()
        await settle()
      }
      return false
    }
    try {
      const available = await findFile(3)
      result.visitedFolders = visitedFolders
      if (!available) {
        await captureSurface(content, 'no-file-in-sampled-folders')
        throw new Error('No file at the library root or in the sampled folders')
      }
      await files.locator('.file-name').first().click()
      await captureFile('.file-content-dialog:visible', 'file-content')
    } finally {
      if (await ancestors.count()) await ancestors.first().click()
    }
  } else if (name === 'tool-file-multiple-preview') {
    await button(content, m.automation.job.newTool).hover()
    await page
      .locator('.el-dropdown-menu:visible')
      .getByText(m.automation.types.script, { exact: true })
      .click()
    const drawer = page.locator('.create-job-drawer:visible')
    await button(drawer, m.automation.job.selectFile).first().click()
    const root = page.locator('.file-selector-dialog:visible')
    await root.waitFor()
    await settle()
    const files = root
      .locator(bodyRows)
      .filter({ has: page.locator('.el-checkbox:not(.is-disabled)') })
    const count = Math.min(2, await files.count())
    if (!count) throw new Error('No selectable file at the current tool picker level')
    for (let index = 0; index < count; index++)
      await files.nth(index).locator('.el-checkbox').click()
    result.selectedFiles = await root.locator('.selected-tag').count()
    if (count < 2)
      uncovered.push('Multiple selection: only one selectable file on the current level')
    await captureSurface(root, 'file-selection', '.file-selector-dialog:visible')
    await files.first().locator('.file-name').click()
    await captureFile('.file-preview-dialog:visible', 'selected-file-preview')
    await close(root)
    await close(drawer)
  } else if (name === 'run-record-type-results') {
    result.dataCoverage = []
    try {
      await selectOption(filterField(m.automation.records.timeRange), m.automation.records.lastYear)
      for (const type of ['command', 'rest']) {
        await selectOption(filterField(m.automation.job.type), m.automation.types[type])
        const rows = await runStatuses.count()
        if (rows) {
          await runStatuses.first().click()
          const tabs = await captureExecutionResult(`${type}-run`)
          result.dataCoverage.push({ type, rows, tabs })
        } else {
          await captureSurface(content, `${type}-empty-list`)
          result.dataCoverage.push({ type, rows })
          uncovered.push(`${type} result: no record in the selected period`)
        }
      }
    } finally {
      await button(content, m.common.reset).click()
    }
  }
}
