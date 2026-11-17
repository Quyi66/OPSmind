import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  hasCaptureFailure,
  inspectLayout,
  parseAuditOptions,
  renderAuditReport,
  waitForLayoutAnimations
} from './i18n-browser-audit-core.mjs'
import { auditHorizontalTables } from './i18n-browser-audit-scroll.mjs'
import { MANAGEMENT_CASES, auditManagementCase } from './i18n-browser-audit-management.mjs'
import { LAYOUT_CASES, auditLayoutCase } from './i18n-browser-audit-layout-cases.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SECONDARY_CASES = Object.freeze([
  ...MANAGEMENT_CASES,
  ...LAYOUT_CASES,
  ['create-script', '/jao/jobs'],
  ['create-command', '/jao/jobs'],
  ['create-rest', '/jao/jobs'],
  ['edit-tool', '/jao/jobs'],
  ['tool-history', '/jao/jobs'],
  ['tool-history-result', '/jao/jobs'],
  ['run-record-result', '/run-records/logs'],
  ['execute-parameters', '/jao/jobs'],
  ['cron-new', '/jao/taskScheduler'],
  ['cron-edit', '/jao/taskScheduler'],
  ['request-detail', '/jao/requests'],
  ['approval-detail', '/jao/approvals'],
  ['linux-install-drawer', '/patches/machineScan'],
  ['linux-rollback-config', '/patches/changeRollback'],
  ['patch-process-detail', '/patches/processLogs'],
  ['patch-failed-hosts', '/patches/processLogs'],
  ['windows-rollback-config', '/patches/windowsRollback'],
  ['middleware-hosts', '/patches/middlewareCveList'],
  ['middleware-cve-info', '/patches/middlewareCveList'],
  ['windows-install-wizard', '/patches/windowsVulnerability']
])

export function parseSecondaryOptions(argv) {
  const rest = []
  let selected
  let list = false
  let screenshots = true
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index]
    if (flag === '--cases') {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error('Missing --cases value')
      selected = value.split(',')
    } else if (flag === '--list') list = true
    else if (flag === '--no-screenshots') screenshots = false
    else if (['--all', '--routes', '--tabs', '--tables', '--prepare'].includes(flag))
      throw new Error(`Unsupported secondary option: ${flag}`)
    else rest.push(flag)
  }
  const options = parseAuditOptions(rest)
  const names = selected || SECONDARY_CASES.map(([name]) => name)
  if (names.some(name => !SECONDARY_CASES.some(([candidate]) => candidate === name)))
    throw new Error('Unknown reviewed secondary case')
  return {
    ...options,
    list,
    screenshots,
    cases: SECONDARY_CASES.filter(([name]) => names.includes(name))
  }
}

export function findReviewedButton(scope, name) {
  if (typeof name !== 'string' || !name.trim())
    throw new Error('Missing exact reviewed action label')
  const text = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return scope
    .getByRole('button', { disabled: false })
    .filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) })
}

export async function runSecondaryAudit(argv = process.argv.slice(2)) {
  const options = parseSecondaryOptions(argv)
  if (options.help) {
    console.log(
      'Read-only reviewed secondary audit: --list; --cases create-script,cron-new; --locales zh-CN,en-US; --widths 1440,1920; --no-screenshots for DOM measurements only. Prepare login with the main audit --prepare first. Never starts Vite/build or submits business actions.'
    )
    return
  }
  if (options.list) {
    console.log(JSON.stringify(options.cases, null, 2))
    return
  }
  const startedAt = new Date().toISOString()
  const run = resolve(
    root,
    '.cache/i18n-secondary-audit',
    new Date().toISOString().replace(/[:.]/g, '-')
  )
  await mkdir(run, { recursive: true })
  const messages = {}
  for (const locale of options.locales) {
    messages[locale] = {}
    for (const namespace of [
      'automation',
      'common',
      'hostUser',
      'patches',
      'asset',
      'settings',
      'inspection'
    ])
      messages[locale][namespace] = JSON.parse(
        await readFile(resolve(root, `src/locales/${locale}/${namespace}.json`), 'utf8')
      )
  }
  const scenarios = options.cases
  const results = []
  let context
  try {
    context = await chromium.launchPersistentContext(
      resolve(root, '.cache/i18n-browser-audit/chrome-profile'),
      {
        channel: 'chrome',
        headless: true,
        viewport: { width: options.widths[0], height: options.height },
        acceptDownloads: false
      }
    )
    const page = context.pages()[0] || (await context.newPage())
    page.setDefaultTimeout(12000)
    await page.goto(options.baseURL, { waitUntil: 'domcontentloaded' })
    if (new URL(page.url()).origin !== new URL(options.baseURL).origin) {
      throw new Error('Application left the configured local origin')
    }
    const switcher = page.locator('.top-nav-wrapper .language-switcher select')
    await switcher.waitFor()
    const initialLocale = await switcher.inputValue()
    const initialRoute = await page.evaluate(
      () => window.__VUE_ROUTER__.currentRoute.value.fullPath
    )
    const allowed = new Set(
      await page.evaluate(async base => {
        const { MENU_CONFIG, getMenuGroups } = await import(`${base}src/config/menu.config.js`)
        const { getGroupMenuConfig } = await import(`${base}src/config/module-nav.config.js`)
        const walk = items =>
          items.flatMap(item =>
            item.hidden || item.disabled
              ? []
              : item.children?.length
                ? walk(item.children)
                : [item.path]
          )
        return getMenuGroups().flatMap(group => walk(getGroupMenuConfig(group.code, MENU_CONFIG)))
      }, options.baseURL)
    )
    const settle = async () => {
      await page
        .locator('.loading-overlay:visible,.el-loading-mask:visible')
        .first()
        .waitFor({ state: 'hidden' })
      await page.waitForTimeout(450)
      await waitForLayoutAnimations(page)
      if (!(await switcher.isVisible())) throw new Error('Authenticated application unavailable')
    }
    const button = findReviewedButton

    const dialog = () => page.locator('.el-dialog:visible').last()
    const close = async root => {
      // A :visible:last locator can switch to the parent once its child closes.
      const element = await root.elementHandle()
      await root.locator('.el-dialog__headerbtn,.el-drawer__close-btn').first().click()
      await element.waitForElementState('hidden')
    }
    try {
      for (const [name, path] of scenarios)
        for (const locale of options.locales)
          for (const width of options.widths) {
            const result = {
              name,
              path,
              locale,
              width,
              screenshots: options.screenshots,
              status: 'failed',
              states: []
            }
            const m = messages[locale]
            let serial = 0
            const capture = async stateName => {
              await settle()
              const state = {
                name: stateName,
                status: 'captured',
                layout: await page.evaluate(inspectLayout)
              }
              if (state.layout.activeAnimations) state.status = 'captured-with-loading'
              if (options.screenshots) {
                state.screenshot = `${name}-${locale}-${width}-${serial++}.png`
                await page.screenshot({
                  path: resolve(run, state.screenshot),
                  fullPage: true,
                  animations: 'disabled'
                })
              }
              result.states.push(state)
              return state
            }
            const captureSurface = async (root, stateName, scope) => {
              await capture(stateName)
              const selectors = '.el-dialog__body,.el-drawer__body,.el-scrollbar__wrap'
              const areas = root.locator(selectors)
              for (let index = 0; index < (await areas.count()); index++) {
                const area = areas.nth(index)
                const info = await area.evaluate(element => ({
                  top: element.scrollTop,
                  height: element.clientHeight,
                  full: element.scrollHeight,
                  table: Boolean(element.closest('.el-table')),
                  overflow: getComputedStyle(element).overflowY
                }))
                if (
                  info.table ||
                  info.height < 40 ||
                  info.full <= info.height + 2 ||
                  !/auto|scroll/.test(info.overflow)
                )
                  continue
                try {
                  const max = info.full - info.height
                  for (
                    let top = Math.max(1, info.height - 24);
                    ;
                    top += Math.max(1, info.height - 24)
                  ) {
                    await area.evaluate(
                      (element, top) => {
                        element.scrollTop = top
                      },
                      Math.min(top, max)
                    )
                    await capture(`${stateName}/vertical-${index}-${Math.min(top, max)}`)
                    if (top >= max) break
                  }
                } finally {
                  await area.evaluate((element, top) => {
                    element.scrollTop = top
                  }, info.top)
                }
              }
              if (scope)
                await auditHorizontalTables(
                  page,
                  async args => capture(`${stateName}/${args.label}`),
                  scope
                )
            }
            const captureExecutionResult = async label => {
              const root = page.locator('.execute-result-dialog-wrapper:visible')
              await root.waitFor()
              await settle()
              const tabs = root.getByRole('tab')
              for (let tab = 0; tab < (await tabs.count()); tab++) {
                await tabs.nth(tab).click()
                await captureSurface(
                  root,
                  `${label}-tab-${tab}`,
                  '.execute-result-dialog-wrapper:visible'
                )
                const hosts = root.locator('.el-tree-node.is-leaf .tree-node.is-host')
                if (await hosts.count()) {
                  await hosts.first().click()
                  await captureSurface(
                    root,
                    `${label}-host`,
                    '.execute-result-dialog-wrapper:visible'
                  )
                }
              }
              await close(root)
            }
            try {
              if (!allowed.has(path))
                throw new Error(`Scenario parent is absent from the current actual menu: ${path}`)
              await page.setViewportSize({ width, height: options.height })
              await switcher.selectOption(locale)
              await page.waitForFunction(locale => document.documentElement.lang === locale, locale)
              await page.evaluate(path => window.__VUE_ROUTER__.push(path), path)
              await page.waitForFunction(
                path => window.__VUE_ROUTER__.currentRoute.value.path === path,
                path
              )
              await settle()
              const content = page.locator('.group-content__view')
              if (LAYOUT_CASES.some(([candidate]) => name === candidate)) {
                await auditLayoutCase({ name, page, content, m, button, dialog, close, settle, captureSurface, result })
              } else if (MANAGEMENT_CASES.some(([candidate]) => name === candidate)) {
                await auditManagementCase({
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
                })
              } else if (name.startsWith('create-') || name === 'edit-tool') {
                if (name === 'edit-tool')
                  await content.locator('.el-table__body').getByRole('button').first().click()
                else {
                  await button(content, m.automation.job.newTool).hover()
                  await page
                    .locator('.el-dropdown-menu:visible')
                    .getByText(m.automation.types[name.slice(7)], { exact: true })
                    .click()
                }
                const root = page.locator('.create-job-drawer:visible')
                await root.waitFor()
                await captureSurface(root, 'form', '.create-job-drawer:visible')
                if (name === 'create-script') {
                  await button(root, m.automation.job.selectFile).first().click()
                  await dialog().waitFor()
                  await captureSurface(dialog(), 'file-selector', '.file-selector-dialog:visible')
                  await close(dialog())
                  await root.getByText(m.automation.job.predefined, { exact: true }).first().click()
                  await button(
                    root.locator('.acm-device-selector').first(),
                    m.hostUser.selectDevices
                  ).click()
                  await dialog().waitFor()
                  await captureSurface(dialog(), 'device-selector')
                  const tabs = dialog().getByRole('tab')
                  for (let index = 1; index < Math.min(3, await tabs.count()); index++) {
                    await tabs.nth(index).click()
                    await captureSurface(dialog(), `device-tab-${index}`)
                  }
                  await close(dialog())
                }
                if (name === 'create-command') {
                  await button(root, m.automation.job.selectCommand).first().click()
                  await dialog().waitFor()
                  await captureSurface(
                    dialog(),
                    'command-selector',
                    '.command-selector-dialog:visible'
                  )
                  await close(dialog())
                }
                await close(root)
              } else if (name === 'run-record-result') {
                const statuses = content.locator('.el-table__body .run-log-status-tag--clickable')
                if (!(await statuses.count())) throw new Error('No historical run result available')
                const failedIndex = await statuses.evaluateAll(items =>
                  items.findIndex(item => /failed|失败/i.test(item.textContent))
                )
                const records = failedIndex > 0 ? [0, failedIndex] : [0]
                result.recordIndices = records
                if (failedIndex < 0)
                  result.notCovered = ['No failed execution in the current run list']
                for (const record of records) {
                  await statuses.nth(record).click()
                  await captureExecutionResult(`run-record-${record}`)
                }
              } else if (name === 'patch-process-detail') {
                const rows = content.locator('.el-table__body tbody tr')
                // Read a completed and a failed historical task where available.
                const indices = await rows.evaluateAll(rows => {
                  const chosen = [0]
                  const failed = rows.findIndex(row =>
                    /failed|失败/i.test(row.querySelectorAll('td')[2]?.textContent || '')
                  )
                  if (failed > 0) chosen.push(failed)
                  return chosen
                })
                result.recordIndices = indices
                for (const index of indices) {
                  await button(rows.nth(index), m.automation.records.details).click()
                  const root = page.locator('.process-log-dialog:visible')
                  await root.waitFor()
                  await settle()
                  const steps = root.locator('.patch-task-stepper__item')
                  for (let step = 0; step < (await steps.count()); step++) {
                    await steps.nth(step).click()
                    await captureSurface(
                      root,
                      `process-${index}-step-${step}`,
                      '.process-log-dialog:visible'
                    )
                  }
                  await close(root)
                }
              } else if (name === 'patch-failed-hosts') {
                const rows = content.locator('.el-table__body tbody tr')
                const indices = await rows.evaluateAll(rows =>
                  rows
                    .flatMap((row, index) =>
                      /failed|失败/i.test(row.querySelectorAll('td')[2]?.textContent || '')
                        ? [index]
                        : []
                    )
                    .slice(0, 3)
                )
                result.dataCoverage = []
                if (!indices.length) {
                  await capture('no-failed-task-in-current-list')
                  throw new Error(
                    'No failed task in the current list; failure rows remain uncovered'
                  )
                }
                for (const index of indices) {
                  await button(rows.nth(index), m.patches.linux.failedHosts).click()
                  const root = dialog()
                  await root.waitFor()
                  await captureSurface(root, `failed-hosts-${index}`, '.el-dialog:visible')
                  const rowCount = await root.locator('.el-table__body tbody tr').count()
                  result.dataCoverage.push({ recordIndex: index, rows: rowCount })
                  await close(root)
                  if (rowCount) break
                }
                if (!result.dataCoverage.some(item => item.rows))
                  result.notCovered = [
                    'Failure rows: sampled live records returned no failed hosts'
                  ]
              } else if (name === 'tool-history-result') {
                const histories = button(
                  content.locator('.el-table__body'),
                  m.automation.workbench.history
                )
                result.dataCoverage = []
                let found = false
                for (let index = 0; index < Math.min(3, await histories.count()); index++) {
                  await histories.nth(index).click()
                  const history = dialog()
                  await history.locator('.history-dialog').waitFor()
                  await history.locator('.el-select').first().click()
                  await page
                    .locator('.el-select-dropdown:visible')
                    .getByText(m.automation.workbench.last30Days, { exact: true })
                    .click()
                  await captureSurface(history, `history-${index}`, '.el-dialog:visible')
                  const statuses = history.locator('.el-table__body .run-log-status-tag--clickable')
                  const count = await statuses.count()
                  result.dataCoverage.push({ recordIndex: index, rows: count })
                  if (!count) {
                    await close(history)
                    continue
                  }
                  const failedIndex = await statuses.evaluateAll(items =>
                    items.findIndex(item => /failed|失败/i.test(item.textContent))
                  )
                  const records = failedIndex > 0 ? [0, failedIndex] : [0]
                  for (const record of records) {
                    await statuses.nth(record).click()
                    await captureExecutionResult(`execution-${index}-${record}`)
                  }
                  await close(history)
                  found = true
                  break
                }
                if (!found)
                  throw new Error(
                    'Sampled tools have no historical result; execution tabs remain uncovered'
                  )
              } else if (name === 'tool-history' || name === 'execute-parameters') {
                await button(
                  content.locator('.el-table__body'),
                  name !== 'execute-parameters'
                    ? m.automation.workbench.history
                    : m.automation.workbench.execute
                )
                  .first()
                  .click()
                await dialog().waitFor()
                await dialog()
                  .locator(name !== 'execute-parameters' ? '.history-dialog' : '.execute-dialog')
                  .waitFor()
                await captureSurface(dialog(), name, '.el-dialog:visible')
                await close(dialog())
              } else if (name.startsWith('cron-')) {
                await button(
                  content,
                  name === 'cron-new' ? m.automation.list.newTask : m.common.edit
                )
                  .first()
                  .click()
                await dialog().waitFor()
                const root = dialog()
                await captureSurface(root, name)
                if (name === 'cron-new') {
                  const title = root.locator('input').first()
                  await title.focus()
                  await title.blur()
                  await root
                    .locator('.el-form-item__error')
                    .first()
                    .waitFor({ state: 'visible', timeout: 2000 })
                  await captureSurface(root, 'required-field-error')
                }
                await button(root, m.automation.schedule.generator).click()
                await dialog().waitFor()
                const generator = dialog()
                await captureSurface(generator, 'cron-generator')
                const tabs = generator.getByRole('tab')
                for (let index = 1; index < (await tabs.count()); index++) {
                  await tabs.nth(index).click()
                  await captureSurface(generator, `cron-tab-${index}`)
                }
                await close(generator)
                await close(root)
              } else if (name === 'middleware-hosts') {
                const actions = button(
                  content.locator('.el-table__body'),
                  m.patches.linux.affectedHostsTitle
                )
                result.dataCoverage = []
                for (let index = 0; index < Math.min(3, await actions.count()); index++) {
                  await actions.nth(index).click()
                  const root = dialog()
                  await root.waitFor()
                  await captureSurface(
                    root,
                    `middleware-affected-hosts-${index}`,
                    '.el-dialog:visible'
                  )
                  const rows = await root.locator('.el-table__body tbody tr').count()
                  result.dataCoverage.push({ recordIndex: index, rows })
                  await close(root)
                  if (rows > 0) break
                }
                if (!result.dataCoverage.some(item => item.rows > 0))
                  result.notCovered = [
                    'Affected host rows: sampled live records returned no matches'
                  ]
              } else if (name === 'middleware-cve-info') {
                const versionRecord = await content
                  .locator('.el-table__body tbody tr')
                  .evaluateAll(rows =>
                    rows.findIndex(
                      row => Number(row.querySelectorAll('td')[5]?.textContent.trim()) > 0
                    )
                  )
                result.recordIndex = Math.max(0, versionRecord)
                await button(content.locator('.el-table__body'), m.automation.records.details)
                  .nth(result.recordIndex)
                  .click()
                const root = content.locator('.cve-detail')
                await root.waitFor()
                await settle()
                await root.locator('.cve-content-wrapper').waitFor()
                const tabs = root.getByRole('tab')
                for (let index = 0; index < (await tabs.count()); index++) {
                  await tabs.nth(index).click()
                  await captureSurface(root, `middleware-tab-${index}`, '.cve-detail')
                }
              } else if (name === 'windows-rollback-config') {
                const selectable = content.locator('.el-table__body .el-checkbox:not(.is-disabled)')
                if (!(await selectable.count())) {
                  await capture('no-rollback-eligible-history')
                  throw new Error(
                    'No rollback-eligible historical record; wizard configuration remains uncovered'
                  )
                }
                const checkbox = selectable.first()
                if (!(await checkbox.locator('input[type="checkbox"]').isChecked()))
                  await checkbox.click()
                await button(content, m.patches.windows.rollbackSelected).click()
                const wizard = page.locator('.win-patch-rollback-wizard:visible')
                await wizard.waitFor()
                for (let step = 0; step < 6; step++) {
                  await captureSurface(
                    wizard,
                    `windows-rollback-config-${step}`,
                    '.win-patch-rollback-wizard:visible'
                  )
                  const next = button(wizard, m.patches.linux.nextStep)
                  if (!(await next.count()) || !(await next.isVisible())) break
                  if (step === 5)
                    throw new Error('Unexpected extra Windows rollback configuration step')
                  await next.click()
                }
                await close(wizard)
              } else if (name.endsWith('-detail')) {
                await content.locator('.el-table__body').getByRole('button').first().click()
                await dialog().waitFor()
                await captureSurface(dialog(), name)
                await close(dialog())
              } else if (name === 'linux-rollback-config') {
                await button(content.locator('.el-table__body'), m.patches.linux.rollback)
                  .first()
                  .click()
                const wizard = page.locator('.install-dialog:visible')
                await wizard.waitFor()
                // The reviewed Next handler configures local steps and reads
                // capability/restart advice. Only the separate final action
                // prepares a task and starts the execution pipeline.
                for (let step = 0; step < 5; step++) {
                  const active = wizard.locator('.patch-task-stepper__item.is-active')
                  const label = (await active.innerText()).trim()
                  await captureSurface(wizard, `rollback-config-${step}`, '.install-dialog:visible')
                  const next = button(wizard, m.patches.linux.nextStep)
                  if (!(await next.count()) || !(await next.isVisible())) break
                  if (await next.isDisabled()) {
                    result.notCovered = [
                      'Following steps require an additional configuration or confirmation'
                    ]
                    break
                  }
                  if (step === 4) throw new Error('Unexpected extra rollback configuration step')
                  await next.click()
                  await page.waitForFunction(
                    previous => {
                      const current = document.querySelector(
                        '.install-dialog .patch-task-stepper__item.is-active'
                      )
                      return current?.innerText.trim() !== previous
                    },
                    label,
                    { timeout: 15000 }
                  )
                }
                await close(wizard)
              } else if (name === 'linux-install-drawer') {
                await button(content.locator('.el-table__body'), m.patches.linux.installPatches)
                  .first()
                  .click()
                const root = page.locator('.batch-install-patch-drawer:visible')
                await root.waitFor()
                await captureSurface(root, 'patch-picker', '.batch-install-patch-drawer:visible')
                const checkbox = root.locator('.el-table__body .el-checkbox').first()
                if (await checkbox.isVisible()) {
                  const deselect = button(root, m.patches.linux.cancelSelectAll)
                  if ((await deselect.count()) && (await deselect.isVisible()))
                    await deselect.click()
                  await checkbox.click()
                  await captureSurface(root, 'selected-one', '.batch-install-patch-drawer:visible')
                  await button(
                    root,
                    m.patches.linux.installChosenCount.replace('{count}', '1')
                  ).click()
                  await dialog().waitFor()
                  await captureSurface(
                    dialog(),
                    'linux-wizard-selection',
                    '.install-dialog:visible'
                  )
                  await close(dialog())
                }
                await close(root)
              } else if (name === 'windows-install-wizard') {
                await button(content.locator('.el-table__body'), m.patches.windows.viewPatches)
                  .nth(1)
                  .click()
                const root = page.locator('.win-patch-host-drawer:visible')
                await root.waitFor()
                await settle()
                await root.locator('.el-table__body .el-checkbox:not(.is-disabled)').first().click()
                await button(root, m.patches.windows.installSelected).click()
                const wizard = page.locator('.win-patch-install-wizard:visible')
                await wizard.waitFor()
                for (let step = 0; step < 6; step++) {
                  await captureSurface(
                    wizard,
                    `windows-step-${step}`,
                    '.win-patch-install-wizard:visible'
                  )
                  const next = button(wizard, m.patches.linux.nextStep)
                  if ((await next.count()) === 0 || !(await next.isVisible())) break
                  await next.click()
                }
                await close(wizard)
                await close(root)
              }
              result.status = result.states.some(hasCaptureFailure)
                ? 'captured-with-errors'
                : 'captured'
            } catch (error) {
              result.error = error.message
            } finally {
              for (let attempts = 0; attempts < 4; attempts++) {
                const dialogs = page.locator('.el-dialog:visible')
                const drawers = page.locator('.el-drawer:visible')
                if (await dialogs.count()) await close(dialogs.last()).catch(() => {})
                else if (await drawers.count()) await close(drawers.last()).catch(() => {})
                else break
              }
            }
            results.push(result)
            await writeFile(resolve(run, 'report.json'), JSON.stringify(results, null, 2))
            const planned = scenarios.length * options.locales.length * options.widths.length
            await writeFile(
              resolve(run, 'summary.json'),
              JSON.stringify(
                {
                  startedAt,
                  planned,
                  completed: results.length,
                  failed: results.filter(item => item.status !== 'captured').length
                },
                null,
                2
              )
            )
            await writeFile(
              resolve(run, 'index.html'),
              renderAuditReport({
                startedAt,
                error:
                  results.length < planned
                    ? '采集中或已中止，尚未覆盖本轮全部计划场景。'
                    : undefined,
                scopeDescription: `本轮打开已审查的二级界面，包含表单滚动和本地标签/步骤；未保存、创建执行任务或开始执行。表格纵向区域只覆盖可见行。${options.screenshots ? '包含截图。' : '仅采集真实 DOM 几何信息，未截图，不代表视觉验收。'}`,
                captures: results.map(result => ({
                  ...result,
                  path: `${result.path} · ${result.name}`,
                  tabAudit: {
                    states: result.states.map(state => ({ ...state, label: state.name }))
                  }
                }))
              })
            )
            console.log(
              JSON.stringify({
                name,
                locale,
                width,
                status: result.status,
                states: result.states.length,
                findings: result.states.reduce(
                  (sum, state) => sum + state.layout.findings.length,
                  0
                ),
                error: result.error?.split('\n')[0]
              })
            )
            if (!(await switcher.isVisible()))
              throw new Error('Session expired; stopped without capturing login fields')
          }
    } finally {
      if (await switcher.isVisible()) {
        await switcher.selectOption(initialLocale)
        await page.evaluate(path => window.__VUE_ROUTER__.replace(path), initialRoute)
      }
    }
    console.log(`REPORT: ${resolve(run, 'index.html')}`)
    if (results.some(result => result.status !== 'captured')) process.exitCode = 1
  } finally {
    await context?.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await runSecondaryAudit().catch(error => {
    console.error(`SECONDARY_AUDIT_STOPPED: ${error.message.split('\n')[0]}`)
    process.exitCode = 1
  })
}
