// Reviewed read-only tab handlers. Other pages require an explicit addition here.
export const TAB_AUDIT_SELECTORS = Object.freeze({
  '/acm/info': '.group-content__view .type-tabs-wrapper > .el-tabs > .el-tabs__header [role="tab"]',
  '/acm/data': '.group-content__view .type-tabs-wrapper > .el-tabs > .el-tabs__header [role="tab"]',
  '/acm/automation':
    '.group-content__view .type-tabs-wrapper > .el-tabs > .el-tabs__header [role="tab"]',
  '/ssc/param': '.group-content__view .ops-tabs > .el-tabs__header [role="tab"]'
})

export async function auditReadOnlyTabs(page, path, captureState) {
  const selector = TAB_AUDIT_SELECTORS[path]
  if (!selector) return { eligible: false, total: 0, states: [] }
  const tabs = page.locator(selector)
  const initial = await tabs.evaluateAll(elements =>
    elements.findIndex(element => element.getAttribute('aria-selected') === 'true')
  )
  const total = await tabs.count()
  const states = []
  if (initial < 0)
    return { eligible: true, total, states, error: 'No selected tab; skipped without clicking' }
  try {
    for (let index = 0; index < total; index++) {
      if (index === initial) continue
      const tab = tabs.nth(index)
      if ((await tab.getAttribute('aria-disabled')) === 'true') continue
      const label = (await tab.innerText()).trim()
      await tab.click()
      await page.waitForFunction(
        ({ selector, index }) =>
          document.querySelectorAll(selector)[index]?.getAttribute('aria-selected') === 'true',
        { selector, index }
      )
      states.push(await captureState({ index, label }))
    }
  } finally {
    if (!page.isClosed() && (await tabs.count()) > initial) await tabs.nth(initial).click()
  }
  return { eligible: true, total, initial, states }
}
