import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { auditReadOnlyTabs } from './i18n-browser-audit-tabs.mjs'
import { auditHorizontalTables } from './i18n-browser-audit-scroll.mjs'
import {
  collectMenuRoutes,
  hasCaptureFailure,
  inspectLayout,
  parseAuditOptions,
  renderAuditReport
} from './i18n-browser-audit-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cache = resolve(root, '.cache/i18n-browser-audit')
const options = parseAuditOptions(process.argv.slice(2))
if (options.help) {
  console.log(`Live local-page audit (never starts Vite or a production build)
  node scripts/i18n-browser-audit.mjs --prepare
  node scripts/i18n-browser-audit.mjs --all
  node scripts/i18n-browser-audit.mjs --routes /jao/jobs,/acm/info --widths 1440,1920
  --prepare  Open a dedicated Chrome window; manually handle certificate/login once.
  --all      Discover only the signed-in user's active menu destinations.
  --tabs     Also inspect reviewed read-only tabs on asset/parameter pages.
  --tables   Also capture horizontal table columns hidden beyond the viewport.
  --locales  zh-CN,en-US (default); no backend text translation.
  Default: system health page, both languages, 1440/1920 x 1080.
  Artifacts and dedicated Chrome profile: .cache/i18n-browser-audit/`)
  process.exit(0)
}

const run = resolve(cache, new Date().toISOString().replace(/[:.]/g, '-'))
await mkdir(run, { recursive: true })
const report = {
  startedAt: new Date().toISOString(),
  baseURL: options.baseURL,
  tabsRequested: options.tabs,
  tablesRequested: options.tables,
  menuRoutes: [],
  captures: []
}
const persist = async () => {
  await writeFile(resolve(run, 'report.json'), JSON.stringify(report, null, 2))
  await writeFile(resolve(run, 'index.html'), renderAuditReport(report))
}
let context
try {
  // Never attach to, copy, or close the user's ordinary Chrome profile.
  // Keep normal TLS validation: no ignoreHTTPSErrors or certificate bypass flags.
  context = await chromium.launchPersistentContext(resolve(cache, 'chrome-profile'), {
    channel: 'chrome',
    headless: !options.prepare,
    viewport: { width: options.widths[0], height: options.height },
    acceptDownloads: false,
    timeout: 20000
  })
  const page = context.pages()[0] || (await context.newPage())
  page.setDefaultTimeout(15000)
  const requestedURL = new URL(options.baseURL)
  const isApplicationReady = () =>
    page
      .evaluate(() =>
        Boolean(
          window.__VUE_ROUTER__?.currentRoute.value.matched.length &&
          window.__VUE_ROUTER__.currentRoute.value.path !== '/login' &&
          document.querySelector('.top-nav-wrapper .language-switcher select')
        )
      )
      .catch(() => false)
  try {
    await page.goto(options.baseURL, { waitUntil: 'domcontentloaded', timeout: 20000 })
  } catch (error) {
    if (!options.prepare || !/ERR_CERT_/.test(error.message)) throw error
    console.log(
      'WAITING_CERTIFICATE: Please handle the localhost certificate warning in the dedicated Chrome window, then sign in. No screenshot is taken of login fields.'
    )
  }
  if (options.prepare) {
    console.log(
      'WAITING_LOGIN: Waiting up to 15 minutes for the dedicated Chrome window to show the signed-in application.'
    )
    const deadline = Date.now() + 15 * 60 * 1000
    while (!(await isApplicationReady())) {
      if (Date.now() > deadline || page.isClosed())
        throw new Error(
          'Preparation stopped before an authenticated application page became available'
        )
      await delay(1000)
    }
    console.log('APPLICATION_READY: Starting real-page collection in the same browser session.')
  } else if (!(await isApplicationReady())) {
    // Initial JS/auth hydration may still be in progress after domcontentloaded.
    await page.waitForFunction(
      () => Boolean(document.querySelector('.top-nav-wrapper .language-switcher select')),
      undefined,
      { timeout: 20000 }
    )
    if (!(await isApplicationReady()))
      throw new Error('Sign-in required; run with --prepare to sign in manually')
  }
  if (new URL(page.url()).origin !== requestedURL.origin)
    throw new Error('Application navigated away from the configured local origin')

  // Import the exact dev modules used by the current UI, including permission filters.
  const groups = await page.evaluate(async base => {
    const { MENU_CONFIG, getMenuGroups, getHomeMenu } = await import(
      `${base}src/config/menu.config.js`
    )
    const { getGroupMenuConfig } = await import(`${base}src/config/module-nav.config.js`)
    const home = getHomeMenu()
    return [
      { code: 'home', children: [{ path: home.defaultRoute, label: home.name }] },
      ...getMenuGroups().map(group => ({
        code: group.code,
        children: getGroupMenuConfig(group.code, MENU_CONFIG)
      }))
    ]
  }, options.baseURL)
  report.menuRoutes = collectMenuRoutes(groups)
  const selected = options.all
    ? report.menuRoutes
    : options.routes.map(path => {
        const item = report.menuRoutes.find(route => route.path === path)
        if (!item)
          throw new Error(`Requested route is not in the current user's actual menu: ${path}`)
        return item
      })
  if (!selected.length) throw new Error('No active menu pages available to the signed-in user')
  console.log(
    `MENU_READY: ${report.menuRoutes.length} destinations; collecting ${selected.length} pages x ${options.locales.length} languages x ${options.widths.length} widths.`
  )

  const initialLocale = await page
    .locator('.top-nav-wrapper .language-switcher select')
    .inputValue()
  const initialRoute = await page.evaluate(() => window.__VUE_ROUTER__.currentRoute.value.fullPath)
  try {
    for (const item of selected) {
      for (const locale of options.locales) {
        for (const width of options.widths) {
          const capture = { path: item.path, locale, width, status: 'failed' }
          try {
            await page.setViewportSize({ width, height: options.height })
            await page.locator('.top-nav-wrapper .language-switcher select').selectOption(locale)
            await page.waitForFunction(
              language =>
                document.documentElement.lang === language &&
                document.querySelector('.top-nav-wrapper .language-switcher select')?.value ===
                  language,
              locale
            )
            await page.evaluate(async path => {
              const router = window.__VUE_ROUTER__
              if (!router.resolve(path).matched.length)
                throw new Error('Menu destination has no matching route')
              await router.push(path)
            }, item.path)
            await page.waitForFunction(
              path => window.__VUE_ROUTER__?.currentRoute.value.path === path,
              item.path
            )
            let settled = true
            await page
              .locator('.loading-overlay:visible,.el-loading-mask:visible')
              .first()
              .waitFor({ state: 'hidden', timeout: 12000 })
              .catch(() => {
                settled = false
              })
            await page
              .waitForFunction(() => document.fonts.status === 'loaded', undefined, {
                timeout: 5000
              })
              .catch(() => {
                settled = false
              })
            await page.waitForTimeout(700)
            if (!(await isApplicationReady())) throw new Error('Session expired before capture')
            // Capture rendered geometry as well as pixels; neither one alone is a visual pass.
            capture.layout = await page.evaluate(inspectLayout)
            capture.screenshot = `${item.path.slice(1).replace(/[^a-zA-Z0-9_-]/g, '_')}-${locale}-${width}.png`
            await page.screenshot({
              path: resolve(run, capture.screenshot),
              fullPage: true,
              animations: 'disabled',
              timeout: 15000
            })
            capture.status = settled ? 'captured' : 'captured-with-loading'
            const captureState = async ({
              index,
              label,
              suffix = `tab-${index}`,
              includeTables = false
            }) => {
              const state = { index, label, status: 'failed' }
              try {
                let ready = true
                await page
                  .locator('.loading-overlay:visible,.el-loading-mask:visible')
                  .first()
                  .waitFor({ state: 'hidden', timeout: 12000 })
                  .catch(() => {
                    ready = false
                  })
                await page.waitForTimeout(700)
                if (!(await isApplicationReady()))
                  throw new Error('Session expired before additional capture')
                state.layout = await page.evaluate(inspectLayout)
                state.screenshot = capture.screenshot.replace(/\.png$/, `-${suffix}.png`)
                await page.screenshot({
                  path: resolve(run, state.screenshot),
                  fullPage: true,
                  animations: 'disabled',
                  timeout: 15000
                })
                state.status = ready ? 'captured' : 'captured-with-loading'
                if (includeTables && options.tables) {
                  state.scrollAudit = await auditHorizontalTables(page, args =>
                    captureState({
                      ...args,
                      label: `${label} / ${args.label}`,
                      suffix: `${suffix}-${args.suffix}`
                    })
                  )
                }
              } catch (error) {
                state.status = 'failed'
                state.error = error.message.split('\n')[0]
              }
              return state
            }
            if (options.tables)
              capture.scrollAudit = await auditHorizontalTables(page, captureState)
            if (options.tabs)
              capture.tabAudit = await auditReadOnlyTabs(page, item.path, args =>
                captureState({ ...args, includeTables: true })
              )
          } catch (error) {
            capture.status = 'failed'
            capture.error = error.message.split('\n')[0]
          }
          report.captures.push(capture)
          await persist()
          console.log(
            JSON.stringify({
              page: item.path,
              locale,
              width,
              status: capture.status,
              findings: capture.layout?.findings.length,
              error: capture.error
            })
          )
          if (!(await isApplicationReady()))
            throw new Error(
              'Session expired or application unavailable; collection stopped without capturing login fields'
            )
        }
      }
    }
  } finally {
    if (await isApplicationReady()) {
      await page
        .locator('.top-nav-wrapper .language-switcher select')
        .selectOption(initialLocale)
        .catch(() => {})
      await page.evaluate(path => window.__VUE_ROUTER__.replace(path), initialRoute).catch(() => {})
    }
  }
  console.log(`REPORT: ${resolve(run, 'index.html')}`)
  console.log(
    'COLLECTION_COMPLETE: Closing the dedicated Chrome window; its local login profile is retained.'
  )
  if (report.captures.some(hasCaptureFailure)) process.exitCode = 1
} catch (error) {
  report.error = error.message.split('\n')[0]
  console.error(`AUDIT_STOPPED: ${report.error}`)
  if (/ERR_CERT_/.test(error.message))
    console.error(
      'Run --prepare and handle the localhost certificate warning manually, or configure a trusted local development certificate.'
    )
  process.exitCode = 1
} finally {
  await persist()
  await context?.close()
}
