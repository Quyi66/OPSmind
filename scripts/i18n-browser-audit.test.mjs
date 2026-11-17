import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { auditReadOnlyTabs } from './i18n-browser-audit-tabs.mjs'
import { auditHorizontalTables } from './i18n-browser-audit-scroll.mjs'
import { findReviewedButton, parseSecondaryOptions } from './i18n-browser-audit-secondary.mjs'
import {
  collectMenuRoutes,
  getAdditionalCaptures,
  hasCaptureFailure,
  inspectLayout,
  parseAuditOptions,
  renderAuditReport
} from './i18n-browser-audit-core.mjs'

test('layout detector uses rendered geometry and distinguishes intentional clipping', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } })
    await page.setContent(`<!doctype html><html lang="en-US"><style>
      button{display:block;white-space:nowrap;margin:12px;height:30px}
      .clipped{width:60px;overflow:hidden}
      .ellipsis{width:60px;overflow:hidden;text-overflow:ellipsis}
      .offscreen{position:absolute;top:2000px;width:30px;overflow:hidden}
      .hidden{display:none}
    </style><button class="clipped">Reinspect selected hosts</button>
    <button class="ellipsis">An intentionally truncated label</button>
    <button class="offscreen">Outside the viewport</button>
    <button class="clipped hidden">Hidden button</button></html>`)
    const result = await page.evaluate(inspectLayout)
    assert.equal(result.language, 'en-US')
    assert.ok(
      result.findings.some(
        item => item.kind === 'clipped-content' && item.element.classes === 'clipped'
      )
    )
    assert.ok(
      result.findings.some(
        item => item.kind === 'ellipsis-review' && item.element.classes === 'ellipsis'
      )
    )
    assert.ok(!result.findings.some(item => /offscreen|hidden/.test(item.element?.classes || '')))

    await page.setContent(`<!doctype html><div class="top-nav-header"><div class="nav-right" style="position:relative">
      <div style="position:absolute;left:0;width:80px;height:30px">Account</div>
      <div style="position:absolute;left:40px;width:80px;height:30px">Language</div>
    </div></div>`)
    const overlap = await page.evaluate(inspectLayout)
    assert.equal(overlap.findings.filter(item => item.kind === 'overlapping-controls').length, 1)

    await page.setContent(`<!doctype html><input placeholder="Search by host IP or hostname" style="width:60px">
      <input placeholder="Visible placeholder fits" style="width:400px">
      <input placeholder="Never inspect a filled input" value="private value" style="width:30px">
      <input type="password" placeholder="Password is excluded" style="width:30px">
      <div class="el-select__wrapper" style="height:30px;position:relative">
        <span class="el-tag" style="position:absolute;top:-10px">System user</span>
      </div>
      <div class="el-scrollbar__wrap" style="width:100px;overflow:hidden">
        <span class="tags-view-item active" style="display:block;width:150px">Active page</span>
      </div>`)
    const fields = await page.evaluate(inspectLayout)
    assert.equal(fields.findings.filter(item => item.kind === 'placeholder-clipped').length, 1)
    assert.ok(fields.findings.some(item => item.kind === 'selection-tag-outside-field'))
    assert.ok(fields.findings.some(item => item.kind === 'active-tag-outside-view'))
    assert.ok(!JSON.stringify(fields).includes('private value'))

    await page.setContent(`<!doctype html><table class="el-table"><thead><tr>
      <th><div class="cell" style="width:30px;word-break:break-all">Manual</div></th>
      <th><div class="cell" style="width:80px;word-break:normal">Missing data</div></th>
    </tr></thead></table>`)
    const headers = await page.evaluate(inspectLayout)
    assert.equal(headers.findings.filter(item => item.kind === 'word-broken-header').length, 1)
    assert.equal(headers.findings.find(item => item.kind === 'word-broken-header').word, 'Manual')

    await page.setContent(`<button style="position:relative;width:200px;overflow:hidden">
      <span style="position:absolute;left:180px;width:100px;height:100px"></span>
      <div style="display:flex"><div style="width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Repository with a long title</div><span>Ready</span></div>
    </button>`)
    const card = await page.evaluate(inspectLayout)
    assert.equal(card.findings.filter(item => item.kind === 'ellipsis-review').length, 1)
    assert.equal(card.findings.filter(item => item.kind !== 'ellipsis-review').length, 0)
    await page.setContent(`<button style="width:200px;overflow:hidden"><div style="display:flex">
      <h3 style="width:70px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">Repository URL with a deliberately long name</h3>
      <span>Ready</span>
    </div></button>`)
    const clamped = await page.evaluate(inspectLayout)
    assert.ok(clamped.findings.some(item => item.kind === 'ellipsis-review'))
    assert.equal(clamped.findings.filter(item => item.kind !== 'ellipsis-review').length, 0)
    await page.setContent(`<div class="el-table"><div class="cell" style="width:70px;overflow:hidden">
      <button style="width:160px;white-space:nowrap">Pending repair</button>
    </div></div>`)
    const clippedControl = await page.evaluate(inspectLayout)
    assert.ok(clippedControl.findings.some(item => item.kind === 'control-clipped-by-cell'))
    await page.setContent(`<label class="el-form-item__label" style="display:block;width:90px;height:20px;font:14px/20px Arial">CRON expression</label>
      <label class="el-form-item__label" style="display:block;width:90px;height:40px;font:14px/20px Arial">CRON expression</label>`)
    const labels = await page.evaluate(inspectLayout)
    assert.equal(labels.findings.filter(item => item.kind === 'label-outside-row').length, 1)
  } finally {
    await browser.close()
  }
})

test('table review catches whole-word wrapping, stacked actions, spare column width and historical Chinese tags', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`<!doctype html><html lang="en-US"><style>
      .el-table{width:500px}table{table-layout:fixed;width:100%}th,td{text-align:left}
      .cell{font:14px/20px Arial}button{height:24px} .stack button{display:block}
    </style><div class="el-table"><table class="el-table__header"><tr>
      <th class="el-table_1_column_1" style="width:70px"><div class="cell">Affected versions</div></th>
      <th class="el-table_1_column_2"><div class="cell">Actions</div></th>
    </tr></table><table class="el-table__body"><tr>
      <td class="el-table_1_column_1"><div class="cell">2</div></td>
      <td class="el-table_1_column_2"><div class="cell stack"><button>Details</button><button>Affected hosts</button></div></td>
    </tr></table></div>
    <span class="tags-view-item" data-path="/acm/model" style="position:absolute;left:-300px">模型定义</span>`)
    const result = await page.evaluate(inspectLayout)
    assert.ok(result.findings.some(item => item.kind === 'header-wrap-review'))
    assert.ok(result.findings.some(item => item.kind === 'action-wrap-review'))
    assert.ok(result.findings.some(item => item.kind === 'action-width-review'))
    assert.deepEqual(result.untranslatedTags, [{ path: '/acm/model', title: '模型定义' }])
    assert.ok(!result.findings.some(item => item.kind === 'word-broken-header'))
    await page
      .locator('.el-table__body button')
      .evaluateAll(elements => elements.forEach(element => element.remove()))
    const empty = await page.evaluate(inspectLayout)
    assert.ok(!empty.findings.some(item => item.kind === 'action-width-review'))
    await page.locator('.el-table__body').evaluate(table => {
      table.innerHTML = Array.from(
        { length: 6 },
        (_, index) =>
          `<tr><td class="el-table_1_column_2"><div class="cell ${index === 5 ? 'stack' : ''}"><button>Details</button>${index === 5 ? '<button>Affected hosts</button>' : ''}</div></td></tr>`
      ).join('')
    })
    const laterRow = await page.evaluate(inspectLayout)
    assert.ok(laterRow.findings.some(item => item.kind === 'action-wrap-review'))
    await page.locator('.el-table__body').evaluate(table => {
      table.closest('.el-table').style.overflow = 'hidden'
      table.innerHTML =
        '<tr><td class="el-table_1_column_2" style="position:relative"><div class="cell" style="height:32px"><button style="position:absolute;left:600px">Delete</button></div></td></tr>'
    })
    const clippedAction = await page.evaluate(inspectLayout)
    assert.ok(clippedAction.findings.some(item => item.kind === 'action-outside-column'))
    await page.locator('html').evaluate(element => {
      element.lang = 'zh-CN'
    })
    const chinese = await page.evaluate(inspectLayout)
    assert.deepEqual(chinese.tableReview, [])
    assert.deepEqual(chinese.untranslatedTags, [])
    await page.setContent('<div class="el-message--error">Query failed</div>')
    const failure = await page.evaluate(inspectLayout)
    assert.deepEqual(failure.dataState.errors, ['Query failed'])
    assert.equal(hasCaptureFailure({ status: 'captured', layout: failure }), true)
    assert.equal(
      hasCaptureFailure({
        status: 'captured',
        requestIssues: [{ path: '/api/list', status: 503 }]
      }),
      true
    )
  } finally {
    await browser.close()
  }
})

test('menu discovery keeps actual nested leaves and excludes inactive/unregistered-only destinations', () => {
  const menu = [
    {
      code: 'assets',
      children: [
        {
          code: 'acm',
          children: [
            { path: '/acm/info', label: '设备清单' },
            { hidden: true, path: '/acm/hidden' },
            { disabled: true, children: [{ path: '/acm/disabled' }] },
            { path: '/acm/:id' },
            { path: '/acm/:pathMatch(.*)*' },
            { path: '//remote.test' },
            { path: 'https://remote.test' }
          ]
        }
      ]
    },
    { code: 'security', hidden: true, children: [{ path: '/sudo/list' }] },
    { code: 'patches', children: [{ children: [{ path: '/yum-repo/list' }] }] }
  ]
  assert.deepEqual(collectMenuRoutes(menu), [
    { path: '/acm/info', label: '设备清单', group: 'assets' },
    { path: '/yum-repo/list', label: '/yum-repo/list', group: 'patches' }
  ])
})

test('tab audit uses reviewed read-only routes, skips disabled tabs and restores the original tab on failure', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`<div class="group-content__view"><div class="type-tabs-wrapper"><div class="el-tabs"><div class="el-tabs__header">
      <button role="tab" aria-selected="true">Groups</button>
      <button role="tab" aria-selected="false">Tags</button>
      <button role="tab" aria-selected="false" aria-disabled="true">Disabled</button>
    </div></div></div></div><script>
      document.querySelectorAll('[role="tab"]').forEach(tab => tab.onclick = () => {
        document.querySelectorAll('[role="tab"]').forEach(other => other.setAttribute('aria-selected', String(other === tab)))
      })
    </script>`)
    const captures = []
    const result = await auditReadOnlyTabs(page, '/acm/data', async state => {
      captures.push(state)
      return { ...state, status: 'captured' }
    })
    assert.equal(result.total, 3)
    assert.deepEqual(captures, [{ index: 1, label: 'Tags' }])
    assert.equal(
      await page.getByRole('tab', { name: 'Groups' }).getAttribute('aria-selected'),
      'true'
    )
    await assert.rejects(
      () =>
        auditReadOnlyTabs(page, '/acm/data', () => {
          throw new Error('capture failed')
        }),
      /capture failed/
    )
    assert.equal(
      await page.getByRole('tab', { name: 'Groups' }).getAttribute('aria-selected'),
      'true'
    )
    const skipped = await auditReadOnlyTabs(page, '/sudo/list', () => {
      throw new Error('must not be called')
    })
    assert.equal(skipped.eligible, false)
  } finally {
    await browser.close()
  }
})

test('duplicated menu destinations are visited once', () => {
  const routes = collectMenuRoutes([
    { code: 'one', children: [{ path: '/jao/jobs' }, { path: '/jao/jobs' }] }
  ])
  assert.equal(routes.length, 1)
})

test('secondary audit admits only reviewed cases and uses the actual scheduler route', () => {
  const options = parseSecondaryOptions(['--cases', 'cron-new,create-script', '--widths', '1440'])
  assert.deepEqual(options.cases, [
    ['create-script', '/jao/jobs'],
    ['cron-new', '/jao/taskScheduler']
  ])
  assert.deepEqual(options.widths, [1440])
  assert.equal(parseSecondaryOptions(['--list']).list, true)
  for (const args of [
    ['--cases', 'delete'],
    ['--cases'],
    ['--routes', '/flow/list'],
    ['--base-url', 'https://example.com']
  ]) {
    assert.throws(() => parseSecondaryOptions(args))
  }
})

test('reviewed button lookup ignores decorative icon names but keeps exact text and disabled guards', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`<style>i:before{content:'\\f002'}</style>
      <button onclick="document.body.dataset.chosen='yes'"><i></i>Install (1)</button>
      <button>Install (11)</button><button disabled>Install (1)</button>`)
    const button = findReviewedButton(page, 'Install (1)')
    assert.equal(await button.count(), 1)
    await button.click()
    assert.equal(await page.locator('body').getAttribute('data-chosen'), 'yes')
    assert.throws(() => findReviewedButton(page, ''))
  } finally {
    await browser.close()
  }
})

test('table audit covers hidden columns and restores scroll positions even if capture fails', async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(`<div class="group-content__view"><div class="el-table__body-wrapper">
      <div class="el-scrollbar__wrap" style="width:100px;height:50px;overflow:auto"><div style="width:350px;height:20px">Wide table</div></div>
      <div class="el-scrollbar__wrap" style="width:300px;height:50px;overflow:auto"><div style="width:50px;height:20px">Fits</div></div>
    </div></div>`)
    const wrapper = page.locator('.el-scrollbar__wrap').first()
    await wrapper.evaluate(element => {
      element.scrollLeft = 20
    })
    const positions = []
    const result = await auditHorizontalTables(page, async state => {
      positions.push(await wrapper.evaluate(element => element.scrollLeft))
      return { ...state, status: 'captured' }
    })
    assert.equal(result.totalTables, 2)
    assert.deepEqual(positions, [0, 100, 200, 250])
    assert.equal(result.states.length, 4)
    assert.equal(await wrapper.evaluate(element => element.scrollLeft), 20)
    await assert.rejects(
      () =>
        auditHorizontalTables(page, () => {
          throw new Error('capture failed')
        }),
      /capture failed/
    )
    assert.equal(await wrapper.evaluate(element => element.scrollLeft), 20)
    await page.setContent(`<div class="drawer"><div class="el-table"><div class="el-table__body-wrapper">
      <div class="el-scrollbar__wrap" style="width:160px;height:50px;overflow:auto">
        <div style="width:600px;display:flex">
          <div class="el-table-fixed-column--left" style="position:sticky;left:0;flex:0 0 40px;height:20px">Left</div>
          <div style="flex:0 0 520px;height:20px">Content</div>
          <div class="el-table-fixed-column--right" style="position:sticky;right:0;flex:0 0 40px;height:20px">Right</div>
        </div>
      </div>
    </div></div></div>`)
    const covered = []
    const fixedResult = await auditHorizontalTables(
      page,
      async state => {
        covered.push(
          await page.locator('.el-scrollbar__wrap').evaluate(element => element.scrollLeft)
        )
        return { ...state, status: 'captured' }
      },
      '.drawer'
    )
    const geometry = await page.locator('.el-scrollbar__wrap').evaluate(element => ({
      width: element.clientWidth,
      max: element.scrollWidth - element.clientWidth
    }))
    const uncoveredWidth = geometry.width - 80
    assert.equal(covered.at(-1), geometry.max)
    assert.ok(
      covered.every((position, index) => position - (covered[index - 1] || 0) <= uncoveredWidth)
    )
    // Fractional browser geometry may round the safe step down by one pixel.
    assert.ok(
      fixedResult.states.every(
        state => state.visibleStep <= uncoveredWidth && state.visibleStep > uncoveredWidth - 2
      )
    )
    assert.equal(
      await page.locator('.el-scrollbar__wrap').evaluate(element => element.scrollLeft),
      0
    )
  } finally {
    await browser.close()
  }
})

test('defaults audit one real page and both supported languages without session preparation', () => {
  const options = parseAuditOptions([])
  assert.deepEqual(options.routes, ['/acm/hostHealthCheck'])
  assert.deepEqual(options.locales, ['zh-CN', 'en-US'])
  assert.equal(options.prepare, false)
  assert.equal(options.tabs, false)
  assert.equal(options.tables, false)
  assert.equal(options.all, false)
})

test('explicit all-menu preparation and width options are accepted', () => {
  const options = parseAuditOptions([
    '--all',
    '--prepare',
    '--widths',
    '1366,2160',
    '--base-url',
    'https://localhost:5573/KoreOPS'
  ])
  assert.equal(options.all, true)
  assert.equal(options.prepare, true)
  assert.deepEqual(options.widths, [1366, 2160])
  assert.equal(options.baseURL, 'https://localhost:5573/KoreOPS/')
})

test('reject remote URLs, credentials, arbitrary routes and invalid capture arguments', () => {
  for (const args of [
    ['--base-url', 'https://example.com/'],
    ['--base-url', 'https://user:pass@localhost:5573/'],
    ['--base-url', 'file:///tmp/test.html'],
    ['--routes', '//example.com'],
    ['--routes', '/acm/info?delete=1'],
    ['--routes', '/acm/:id'],
    ['--widths', 'NaN'],
    ['--widths', '0'],
    ['--locales', 'zh-TW'],
    ['--widths'],
    ['--unexpected', 'yes']
  ])
    assert.throws(() => parseAuditOptions(args), undefined, JSON.stringify(args))
})

test('HTML report escapes page content and distinguishes failed captures from zero findings', () => {
  const html = renderAuditReport({
    startedAt: 'now',
    scopeDescription: 'Read-only <forms>',
    captures: [
      {
        path: '/<script>',
        locale: 'en-US',
        width: 1440,
        status: 'failed',
        error: '<img src=x onerror=alert(1)>'
      },
      {
        path: '/acm/info',
        locale: 'zh-CN',
        width: 1440,
        status: 'captured',
        screenshot: 'one.png',
        layout: { findings: [] }
      }
    ]
  })
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;img src=x'))
  assert.ok(html.includes('failed</td><td>—'))
  assert.ok(html.includes('captured</td><td>0'))
  assert.ok(html.includes('Read-only &lt;forms&gt;'))
  assert.ok(!html.includes('未自动切换页面内部标签'))
  assert.ok(!html.includes('未自动打开弹窗'))
})

test('nested tab/table captures remain visible in the report and failure accounting', () => {
  const capture = {
    path: '/acm/automation',
    locale: 'en-US',
    width: 1440,
    status: 'captured',
    tabAudit: {
      states: [
        {
          label: 'Shared templates',
          status: 'captured',
          screenshot: 'tab.png',
          scrollAudit: {
            states: [
              { label: 'Shared templates / right', status: 'failed', error: 'Capture <failed>' }
            ]
          }
        }
      ]
    },
    scrollAudit: {
      states: [{ label: 'Device credentials / right', status: 'captured', screenshot: 'right.png' }]
    }
  }
  const states = getAdditionalCaptures(capture)
  assert.equal(states.length, 3)
  assert.equal(states.filter(state => state.status !== 'captured').length, 1)
  const html = renderAuditReport({ startedAt: 'now', captures: [capture] })
  assert.ok(html.includes('href="tab.png"'))
  assert.ok(html.includes('href="right.png"'))
  assert.ok(html.includes('Shared templates / right'))
  assert.ok(html.includes('Capture &lt;failed&gt;'))
  assert.ok(!html.includes('href="undefined"'))
})

test('partial captures and nested audit errors cannot be reported as a successful collection', () => {
  const complete = { status: 'captured', layout: { findings: [] }, screenshot: 'partial.png' }
  assert.equal(hasCaptureFailure(complete), false)
  const partial = { ...complete, error: 'Table <unavailable>' }
  assert.equal(hasCaptureFailure(partial), true)
  const report = renderAuditReport({ startedAt: 'now', captures: [partial] })
  assert.ok(report.includes('partial.png'))
  assert.ok(report.includes('Table &lt;unavailable&gt;'))
  assert.equal(
    hasCaptureFailure({ ...complete, tabAudit: { error: 'No selected tab', states: [] } }),
    true
  )
  assert.equal(
    hasCaptureFailure({
      ...complete,
      tabAudit: {
        states: [{ ...complete, scrollAudit: { states: [{ status: 'captured-with-loading' }] } }]
      }
    }),
    true
  )
})
