// Shared by the live browser runner and its focused Node tests.
export function collectMenuRoutes(groups) {
  const routes = new Map()
  const walk = (items, group) => {
    for (const item of items || []) {
      if (item.hidden || item.disabled) continue
      if (item.children?.length) {
        walk(item.children, group)
        continue
      }
      const path = item.path
      // Only concrete, local menu destinations. Never enumerate registered-only routes.
      if (typeof path !== 'string' || !/^\/(?!\/)/.test(path) || /[:*?#]/.test(path)) continue
      if (!routes.has(path))
        routes.set(path, { path, group, label: item.label || item.name || path })
    }
  }
  for (const group of groups) {
    if (!group.hidden && !group.disabled) walk(group.children, group.code)
  }
  return [...routes.values()]
}

export function parseAuditOptions(argv) {
  const options = {
    baseURL: 'https://localhost:5573/KoreOPS/',
    widths: [1440, 1920],
    height: 1080,
    locales: ['zh-CN', 'en-US'],
    routes: ['/acm/hostHealthCheck'],
    all: false,
    prepare: false,
    tabs: false,
    tables: false,
    help: false
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--all') options.all = true
    else if (flag === '--prepare') options.prepare = true
    else if (flag === '--tabs') options.tabs = true
    else if (flag === '--tables') options.tables = true
    else if (flag === '--help') options.help = true
    else {
      const value = argv[++i]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
      if (flag === '--base-url') options.baseURL = value
      else if (flag === '--widths') options.widths = value.split(',').map(Number)
      else if (flag === '--locales') options.locales = value.split(',')
      else if (flag === '--routes') options.routes = value.split(',')
      else throw new Error(`Unknown option: ${flag}`)
    }
  }
  const url = new URL(options.baseURL)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'The audit accepts a local development URL only, without credentials/query/hash'
    )
  }
  options.baseURL = `${url.href.replace(/\/+$/, '')}/`
  if (
    !options.widths.length ||
    options.widths.some(width => !Number.isInteger(width) || width < 800 || width > 3840)
  ) {
    throw new Error('Widths must be integers between 800 and 3840')
  }
  if (
    !options.locales.length ||
    options.locales.some(locale => !['zh-CN', 'en-US'].includes(locale))
  ) {
    throw new Error('Supported audit locales: zh-CN,en-US')
  }
  if (
    !options.routes.length ||
    options.routes.some(path => !/^\/(?!\/)/.test(path) || /[:*?#]/.test(path))
  ) {
    throw new Error('Routes must be concrete local paths, without query/hash/parameters')
  }
  return options
}

export async function waitForLayoutAnimations(page, timeout = 4000) {
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          animation =>
            (animation.playState === 'running' || animation.pending) &&
            Number.isFinite(animation.effect?.getComputedTiming().endTime)
        ),
    undefined,
    { timeout, polling: 'raf' }
  )
}

// Runs inside the actual application document. No DOM mutation or network mocking.
export function inspectLayout() {
  const findings = []
  let checkedElements = 0
  const usesEllipsis = style =>
    style.textOverflow === 'ellipsis' || Number.parseInt(style.webkitLineClamp, 10) > 0
  const visible = element => {
    const rect = element.getBoundingClientRect()
    const css = getComputedStyle(element)
    if (rect.width < 2 || rect.height < 2 || css.visibility === 'hidden' || css.display === 'none')
      return false
    if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth)
      return false
    if (element.closest('[aria-hidden="true"]')) return false
    // Exclude clipped-out children in deliberately scrollable menus/tables.
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      const clip = parent.getBoundingClientRect()
      if (
        /(hidden|clip|auto|scroll)/.test(style.overflowX) &&
        (rect.right <= clip.left || rect.left >= clip.right)
      )
        return false
      if (
        /(hidden|clip|auto|scroll)/.test(style.overflowY) &&
        (rect.bottom <= clip.top || rect.top >= clip.bottom)
      )
        return false
    }
    return true
  }
  const describe = element => ({
    tag: element.tagName.toLowerCase(),
    classes: String(element.className || '').slice(0, 180),
    // Deliberately omit input values, request bodies, cookies and local storage.
    text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
    rect: (() => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height)
      }
    })()
  })
  const documentWidth = document.documentElement.scrollWidth
  if (documentWidth > innerWidth + 2)
    findings.push({ kind: 'document-overflow', extraPixels: documentWidth - innerWidth })
  const selector =
    'button,.el-tag,.el-table th .cell,.el-form-item__label,.menu-label,.nav-text,h1,h2,h3,h4,.language-switcher'
  for (const element of document.querySelectorAll(selector)) {
    if (!visible(element)) continue
    checkedElements++
    // Card buttons may clip decoration and ellipsize a nested title intentionally.
    // Check text leaves instead of combining all descendant ranges into one label.
    if (
      element.matches('button') &&
      [...element.children].some(child =>
        ['block', 'flex', 'grid'].includes(getComputedStyle(child).display)
      )
    ) {
      const outer = element.getBoundingClientRect()
      for (const leaf of element.querySelectorAll('*')) {
        if (leaf.children.length || !leaf.textContent.trim() || !visible(leaf)) continue
        checkedElements++
        const style = getComputedStyle(leaf)
        const rect = leaf.getBoundingClientRect()
        if (
          (leaf.scrollWidth > leaf.clientWidth + 2 && /(hidden|clip)/.test(style.overflowX)) ||
          (leaf.scrollHeight > leaf.clientHeight + 2 && /(hidden|clip)/.test(style.overflowY))
        ) {
          findings.push({
            kind: usesEllipsis(style) ? 'ellipsis-review' : 'clipped-content',
            element: describe(leaf)
          })
        } else if (
          rect.left < outer.left - 2 ||
          rect.right > outer.right + 2 ||
          rect.top < outer.top - 2 ||
          rect.bottom > outer.bottom + 2
        ) {
          findings.push({ kind: 'text-outside-control', element: describe(leaf) })
        }
      }
      continue
    }
    const css = getComputedStyle(element)
    const excess = element.scrollWidth - element.clientWidth
    const excessY = element.scrollHeight - element.clientHeight
    if (
      (excess > 2 && /(hidden|clip)/.test(css.overflowX)) ||
      (excessY > 2 && /(hidden|clip)/.test(css.overflowY))
    ) {
      findings.push({
        kind: usesEllipsis(css) ? 'ellipsis-review' : 'clipped-content',
        element: describe(element)
      })
    }
    if (element.matches('button,.el-tag,.el-form-item__label,.menu-label,.nav-text')) {
      const range = document.createRange()
      range.selectNodeContents(element)
      const textRect = range.getBoundingClientRect()
      const rect = element.getBoundingClientRect()
      if (
        textRect.width > 0 &&
        (textRect.right > rect.right + 2 || textRect.left < rect.left - 2) &&
        !usesEllipsis(css)
      ) {
        findings.push({ kind: 'text-outside-control', element: describe(element) })
      }
      if (
        element.matches('.el-form-item__label') &&
        textRect.height > 0 &&
        (textRect.top < rect.top - 2 || textRect.bottom > rect.bottom + 2)
      ) {
        findings.push({ kind: 'label-outside-row', element: describe(element) })
      }
      // A button/tag can fit its own box while the table cell clips the control.
      // Only compare with its own cell; partially scrolled columns are expected.
      const cell = element.closest('.cell')
      if (cell?.closest('.el-table') && !usesEllipsis(css)) {
        const clip = cell.getBoundingClientRect()
        const cellStyle = getComputedStyle(cell)
        if (
          textRect.width > 0 &&
          /(hidden|clip)/.test(cellStyle.overflowX) &&
          (textRect.left < clip.left - 2 || textRect.right > clip.right + 2)
        ) {
          findings.push({ kind: 'control-clipped-by-cell', element: describe(element) })
        }
      }
    }
    if (element.matches('.el-tag')) {
      const field = element.closest('.el-select__wrapper')
      if (field) {
        const tagRect = element.getBoundingClientRect()
        const fieldRect = field.getBoundingClientRect()
        if (tagRect.top < fieldRect.top - 2 || tagRect.bottom > fieldRect.bottom + 2) {
          findings.push({ kind: 'selection-tag-outside-field', element: describe(element) })
        }
      }
    }
  }
  const wordReviewSelector =
    document.documentElement.lang === 'en-US'
      ? '.el-table th .cell,.win-patch-restart-step__summary-text'
      : '.el-table th .cell'
  for (const cell of document.querySelectorAll(wordReviewSelector)) {
    if (!visible(cell)) continue
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
    let brokenWord = ''
    for (let node = walker.nextNode(); node && !brokenWord; node = walker.nextNode()) {
      for (const match of node.textContent.matchAll(/[A-Za-z]{4,}/g)) {
        const range = document.createRange()
        range.setStart(node, match.index)
        range.setEnd(node, match.index + match[0].length)
        if (range.getClientRects().length > 1) {
          brokenWord = match[0]
          break
        }
      }
    }
    if (brokenWord)
      findings.push({
        kind: cell.matches('.el-table th .cell') ? 'word-broken-header' : 'word-broken-copy',
        word: brokenWord,
        element: describe(cell)
      })
  }
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')
  if (measure) {
    for (const input of document.querySelectorAll('input[placeholder]:not([type="password"])')) {
      if (!visible(input) || !input.matches(':placeholder-shown')) continue
      const css = getComputedStyle(input)
      measure.font = css.font || `${css.fontSize} ${css.fontFamily}`
      const placeholder = input.getAttribute('placeholder') || ''
      const letterSpacing = Number.parseFloat(css.letterSpacing) || 0
      const textWidth =
        measure.measureText(placeholder).width +
        Math.max(0, [...placeholder].length - 1) * letterSpacing
      const available =
        input.clientWidth - Number.parseFloat(css.paddingLeft) - Number.parseFloat(css.paddingRight)
      if (textWidth > available + 4) {
        findings.push({
          kind: 'placeholder-clipped',
          element: { ...describe(input), text: placeholder },
          extraPixels: Math.ceil(textWidth - available)
        })
      }
    }
  }
  const activeTag = document.querySelector('.tags-view-item.active')
  const tagsViewport = activeTag?.closest('.el-scrollbar__wrap')
  if (activeTag && tagsViewport) {
    const tagRect = activeTag.getBoundingClientRect()
    const viewport = tagsViewport.getBoundingClientRect()
    if (tagRect.left < viewport.left - 2 || tagRect.right > viewport.right + 2) {
      findings.push({ kind: 'active-tag-outside-view', element: describe(activeTag) })
    }
  }
  // Review signals, not automatic failures: complete words and separate buttons can
  // wrap without overflowing. Keep their geometry so visual review cannot miss them.
  const tableReview = []
  const lineTops = element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const tops = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (rect.width > 1 && rect.height > 1 && !tops.some(top => Math.abs(top - rect.top) < 4))
          tops.push(rect.top)
      }
    }
    return tops
  }
  if (document.documentElement.lang === 'en-US') {
    for (const table of document.querySelectorAll('.el-table')) {
      for (const header of table.querySelectorAll('.el-table__header th')) {
        const cell = header.querySelector('.cell')
        if (!cell || !visible(cell)) continue
        const label = cell.textContent.trim().replace(/\s+/g, ' ')
        const columnClass = [...header.classList].find(name => /^el-table_.*_column_/.test(name))
        const rows = columnClass
          ? [...table.querySelectorAll(`.el-table__body td.${columnClass} .cell`)].filter(visible)
          : []
        const textLines = lineTops(cell)
        const sortIcon = cell.querySelector('.caret-wrapper')
        const sortWrapped =
          sortIcon &&
          textLines.length &&
          sortIcon.getBoundingClientRect().top > Math.max(...textLines) + 8
        const wrapped = textLines.length > 1 || Boolean(sortWrapped)
        const entry = { label, width: Math.round(header.getBoundingClientRect().width), wrapped }
        if (wrapped) findings.push({ kind: 'header-wrap-review', element: describe(cell) })
        const wrappedDate = rows.find(
          row => /\b(?:AM|PM)\b/.test(row.textContent) && lineTops(row).length > 1
        )
        if (wrappedDate)
          findings.push({ kind: 'date-wrap-review', element: describe(wrappedDate), header: label })
        if (label === 'Actions') {
          const samples = rows.map(row => {
            // The row is visible, but an overflowing action can be wholly clipped
            // out of its cell. Do not discard that action using viewport visibility.
            const buttons = [...row.querySelectorAll('button,a.el-link')].filter(button => {
              const rect = button.getBoundingClientRect()
              const style = getComputedStyle(button)
              return (
                rect.width > 1 &&
                rect.height > 1 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                !button.closest('[aria-hidden="true"]')
              )
            })
            const rects = buttons.map(button => button.getBoundingClientRect())
            const column = row.closest('td').getBoundingClientRect()
            return {
              labels: buttons.map(button => button.textContent.trim()),
              outsideColumn: rects.some(
                rect => rect.left < column.left - 2 || rect.right > column.right + 2
              ),
              lines: new Set(rects.map(rect => Math.round(rect.top / 3) * 3)).size,
              requiredWidth: rects.length
                ? Math.ceil(
                    rects.reduce((sum, rect) => sum + rect.width, 0) +
                      Math.max(0, rects.length - 1) * 12 +
                      24
                  )
                : 0
            }
          })
          entry.actions = samples
          const required = Math.max(0, ...samples.map(sample => sample.requiredWidth))
          if (samples.some(sample => sample.lines > 1))
            findings.push({ kind: 'action-wrap-review', element: describe(cell), samples })
          if (samples.some(sample => sample.outsideColumn))
            findings.push({ kind: 'action-outside-column', element: describe(cell), samples })
          if (required && entry.width - required > Math.max(32, required * 0.3))
            findings.push({
              kind: 'action-width-review',
              element: describe(cell),
              requiredWidth: required
            })
        }
        tableReview.push(entry)
      }
    }
  }
  const untranslatedTags =
    document.documentElement.lang === 'en-US'
      ? [...document.querySelectorAll('.tags-view-item')]
          .filter(tag => /[\u4e00-\u9fff]/.test(tag.textContent))
          .map(tag => ({ path: tag.dataset.path, title: tag.textContent.trim() }))
      : []
  const dataState = {
    rows: document.querySelectorAll('.el-table__body tbody tr').length,
    emptyTables: [...document.querySelectorAll('.el-table__empty-block')].filter(visible).length,
    errors: [...document.querySelectorAll('.el-message--error,.el-alert--error')]
      .filter(visible)
      .map(element => describe(element).text)
  }
  const controls = [
    ...document.querySelectorAll('.top-nav-header .nav-right > *, .el-form-item button')
  ].filter(visible)
  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i],
        b = controls[j]
      if (a.contains(b) || b.contains(a) || a.parentElement !== b.parentElement) continue
      const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect()
      if (
        Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left) > 2 &&
        Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > 2
      ) {
        findings.push({ kind: 'overlapping-controls', elements: [describe(a), describe(b)] })
      }
    }
  }
  return {
    language: document.documentElement.lang,
    activeAnimations: document
      .getAnimations()
      .filter(
        animation =>
          (animation.playState === 'running' || animation.pending) &&
          Number.isFinite(animation.effect?.getComputedTiming().endTime)
      ).length,
    viewport: { width: innerWidth, height: innerHeight },
    tableRows: document.querySelectorAll('.el-table__body tbody tr').length,
    checkedElements,
    tableReview,
    untranslatedTags,
    dataState,
    findings
  }
}

export function getAdditionalCaptures(capture) {
  const states = [...(capture.tabAudit?.states || []), ...(capture.scrollAudit?.states || [])]
  return states.flatMap(state => [state, ...getAdditionalCaptures(state)])
}

export function hasCaptureFailure(capture) {
  return (
    capture.status !== 'captured' ||
    Boolean(
      capture.error ||
      capture.tabAudit?.error ||
      capture.scrollAudit?.error ||
      capture.requestIssues?.length ||
      capture.layout?.dataState?.errors.length
    ) ||
    [...(capture.tabAudit?.states || []), ...(capture.scrollAudit?.states || [])].some(
      hasCaptureFailure
    )
  )
}

export function renderAuditReport(report) {
  const escape = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      char =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[char]
    )
  const rows = report.captures
    .map(
      capture =>
        `<tr><td>${escape(capture.path)}</td><td>${escape(capture.locale)}</td><td>${capture.width}</td><td>${escape(capture.status)}</td><td>${capture.layout?.findings.length ?? '—'}</td><td>${capture.screenshot ? `<a href="${escape(capture.screenshot)}">Screenshot</a>` : ''}${capture.error ? `<br>${escape(capture.error)}` : ''}${capture.tabAudit?.error ? `<br>Tabs: ${escape(capture.tabAudit.error)}` : ''}${capture.scrollAudit?.error ? `<br>Tables: ${escape(capture.scrollAudit.error)}` : ''}${getAdditionalCaptures(
          capture
        )
          .map(
            state =>
              `<br>${state.screenshot ? `<a href="${escape(state.screenshot)}">${escape(state.label)}</a>` : escape(state.label)} (${escape(state.status)}, ${state.layout?.findings.length ?? '—'})${state.error ? `: ${escape(state.error)}` : ''}`
          )
          .join('')}</td></tr>`
    )
    .join('\n')
  const defaultScope = `页面内纵向滚动区域只采集当前可见部分。${report.tablesRequested ? '已补充宽表格横向隐藏列截图。' : ''}${report.tabsRequested ? '已启用资产及参数页的只读标签页白名单检查。' : '未自动切换页面内部标签。'}未自动打开弹窗。`
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>本地中英文页面巡检</title><style>body{font:14px system-ui;margin:24px;color:#263445}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #d9e1ea;text-align:left}th{background:#f3f6fa}a{color:#1677d2}p{line-height:1.7}</style><h1>本地中英文页面巡检</h1>${report.error ? `<p role="alert">采集中止：${escape(report.error)}</p>` : ''}<p>时间：${escape(report.startedAt)}。结果来自真实页面和真实接口。疑点数量包含有意省略的文字，需要人工判断；没有疑点不代表视觉验收通过。${report.scopeDescription ? escape(report.scopeDescription) : defaultScope}</p><p>详情见同目录 report.json。截图可能含业务数据，仅保存在本地缓存。</p><table><thead><tr><th>菜单页面</th><th>语言</th><th>宽度</th><th>采集状态</th><th>排版疑点</th><th>查看</th></tr></thead><tbody>${rows}</tbody></table></html>`
}
