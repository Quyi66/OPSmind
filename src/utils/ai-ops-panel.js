const PANEL_IDS = {
  root: 'ops-dify-bubble-root',
  panel: 'ops-dify-bubble-panel',
  header: 'ops-dify-bubble-header',
  title: 'ops-dify-bubble-title',
  close: 'ops-dify-bubble-close',
  body: 'ops-dify-bubble-body',
  iframe: 'ops-dify-bubble-iframe',
  style: 'ops-dify-bubble-style-self'
}

const PANEL_CLASSES = {
  handle: 'ops-dify-bubble-resize-handle',
  handleRight: 'ops-dify-bubble-resize-right',
  handleBottom: 'ops-dify-bubble-resize-bottom',
  handleCorner: 'ops-dify-bubble-resize-corner'
}

const DEFAULT_TITLE = 'AI OPS'
const DEFAULT_DIFY_TOKEN = 'tRnUImvfrP77TFr0'
const MIN_PANEL_WIDTH = 360
const MIN_PANEL_HEIGHT = 280
const DEFAULT_PANEL_MAX_WIDTH = 480

const interactionState = {
  mode: null,
  direction: '',
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  startWidth: 0,
  startHeight: 0
}

const cleanupTasks = []
let aiOpsPrewarmed = false

function clampValue(value, min, max) {
  if (!Number.isFinite(value)) return min
  if (max < min) return max
  return Math.min(Math.max(value, min), max)
}

function parseNumeric(value, fallback) {
  const nextValue = Number.parseFloat(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function bindEvent(target, type, handler, options) {
  target.addEventListener(type, handler, options)
  cleanupTasks.push(() => target.removeEventListener(type, handler, options))
}

function getRuntimeConfig() {
  try {
    return window.__OPS_RUNTIME__ || {}
  } catch {
    return {}
  }
}

function getAppBase() {
  try {
    return import.meta.env.BASE_URL || '/'
  } catch {
    return '/'
  }
}

function getDifyBase() {
  return String(getRuntimeConfig().DIFY_BASE_URL || '').replace(/\/$/, '')
}

function getDifyToken() {
  try {
    const urlToken = new URLSearchParams(location.search).get('token')
    if (urlToken) return urlToken
  } catch {}

  try {
    const ls = window.localStorage
    const keys = ['DIFY_TOKEN', 'ops:dify_token', 'dify:token']
    for (const key of keys) {
      const value = ls.getItem(key)
      if (value) return value
    }
  } catch {}

  try {
    const runtime = getRuntimeConfig()
    if (runtime.DIFY_TOKEN) return runtime.DIFY_TOKEN
  } catch {}

  try {
    return import.meta.env.VITE_DIFY_TOKEN || DEFAULT_DIFY_TOKEN
  } catch {
    return DEFAULT_DIFY_TOKEN
  }
}

function getTopNavHeight() {
  try {
    const header =
      document.querySelector('.top-nav-header') || document.querySelector('.top-nav-wrapper')
    return Math.max(0, Math.round(header?.getBoundingClientRect().height || header?.offsetHeight || 0))
  } catch {
    return 64
  }
}

function getDefaultWidth() {
  const preferredWidth = Math.round(window.innerWidth * 0.34)
  const maxWidth = Math.min(DEFAULT_PANEL_MAX_WIDTH, window.innerWidth)
  return clampValue(preferredWidth, Math.min(MIN_PANEL_WIDTH, maxWidth), maxWidth)
}

function getDefaultHeight(top) {
  const availableHeight = Math.max(0, window.innerHeight - top)
  return Math.max(Math.min(MIN_PANEL_HEIGHT, availableHeight), availableHeight)
}

function getPanelElements() {
  const panel = document.getElementById(PANEL_IDS.panel)
  if (!panel) return null

  return {
    panel,
    title: document.getElementById(PANEL_IDS.title),
    iframe: document.getElementById(PANEL_IDS.iframe)
  }
}

function normalizePanelGeometry({ left, top, width, height }) {
  const minTop = getTopNavHeight()

  let nextLeft = Math.max(0, left)
  let nextTop = Math.max(minTop, top)

  let maxWidth = Math.max(160, window.innerWidth - nextLeft)
  let minWidth = Math.min(MIN_PANEL_WIDTH, maxWidth)
  let nextWidth = clampValue(width, minWidth, maxWidth)

  let maxHeight = Math.max(160, window.innerHeight - nextTop)
  let minHeight = Math.min(MIN_PANEL_HEIGHT, maxHeight)
  let nextHeight = clampValue(height, minHeight, maxHeight)

  nextLeft = clampValue(nextLeft, 0, Math.max(0, window.innerWidth - nextWidth))
  nextTop = clampValue(nextTop, minTop, Math.max(minTop, window.innerHeight - nextHeight))

  maxWidth = Math.max(160, window.innerWidth - nextLeft)
  minWidth = Math.min(MIN_PANEL_WIDTH, maxWidth)
  nextWidth = clampValue(nextWidth, minWidth, maxWidth)

  maxHeight = Math.max(160, window.innerHeight - nextTop)
  minHeight = Math.min(MIN_PANEL_HEIGHT, maxHeight)
  nextHeight = clampValue(nextHeight, minHeight, maxHeight)

  return {
    left: nextLeft,
    top: nextTop,
    width: nextWidth,
    height: nextHeight
  }
}

function applyPanelGeometry(panel, geometry) {
  panel.style.left = `${geometry.left}px`
  panel.style.top = `${geometry.top}px`
  panel.style.width = `${geometry.width}px`
  panel.style.height = `${geometry.height}px`
}

function syncAiOpsPanelLayout(options = {}) {
  const { resetPosition = false, resetSize = false } = options
  const elements = getPanelElements()
  if (!elements) return

  const { panel } = elements
  const useDefaultPosition = resetPosition || panel.dataset.positionCustomized !== 'true'
  const useDefaultSize = resetSize || panel.dataset.sizeCustomized !== 'true'

  const defaultWidth = getDefaultWidth()
  const defaultTop = getTopNavHeight()
  const currentWidth = useDefaultSize ? defaultWidth : parseNumeric(panel.style.width, defaultWidth)
  const currentLeft = useDefaultPosition
    ? Math.max(0, window.innerWidth - currentWidth)
    : parseNumeric(panel.style.left, Math.max(0, window.innerWidth - currentWidth))
  const currentTop = useDefaultPosition ? defaultTop : parseNumeric(panel.style.top, defaultTop)
  const currentHeight = useDefaultSize
    ? getDefaultHeight(currentTop)
    : parseNumeric(panel.style.height, getDefaultHeight(currentTop))

  applyPanelGeometry(
    panel,
    normalizePanelGeometry({
      left: currentLeft,
      top: currentTop,
      width: currentWidth,
      height: currentHeight
    })
  )
}

function closeAiOpsPanel() {
  const panel = document.getElementById(PANEL_IDS.panel)
  if (panel) {
    panel.classList.remove('visible')
  }
}

function stopInteraction() {
  const panel = document.getElementById(PANEL_IDS.panel)
  interactionState.mode = null
  interactionState.direction = ''

  if (panel) {
    panel.classList.remove('dragging')
    panel.classList.remove('resizing')
  }

  if (typeof document !== 'undefined') {
    document.body.style.userSelect = ''
  }
}

function updatePanelOnPointerMove(event) {
  const elements = getPanelElements()
  if (!elements || !interactionState.mode) return

  const { panel } = elements
  const deltaX = event.clientX - interactionState.startX
  const deltaY = event.clientY - interactionState.startY

  if (interactionState.mode === 'drag') {
    applyPanelGeometry(
      panel,
      normalizePanelGeometry({
        left: interactionState.startLeft + deltaX,
        top: interactionState.startTop + deltaY,
        width: interactionState.startWidth,
        height: interactionState.startHeight
      })
    )
    panel.dataset.positionCustomized = 'true'
    return
  }

  if (interactionState.mode === 'resize') {
    let nextWidth = interactionState.startWidth
    let nextHeight = interactionState.startHeight

    if (interactionState.direction.includes('right')) {
      nextWidth += deltaX
    }

    if (interactionState.direction.includes('bottom')) {
      nextHeight += deltaY
    }

    applyPanelGeometry(
      panel,
      normalizePanelGeometry({
        left: interactionState.startLeft,
        top: interactionState.startTop,
        width: nextWidth,
        height: nextHeight
      })
    )
    panel.dataset.sizeCustomized = 'true'
  }
}

function buildIframeHtml() {
  const base = getAppBase()
  const token = getDifyToken()
  const difyBase = getDifyBase()
  const embedSrc = `${window.location.origin}${base}dify/embed.min.js`
  const tokenJson = JSON.stringify(token || '')
  const tokenAttr = String(token || '').replace(/"/g, '&quot;')

  return {
    signature: `${token || ''}::${difyBase || ''}`,
    html: `<!doctype html><html lang="zh-CN"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <link rel="preconnect" href="${difyBase}" crossorigin>
      <style>
        html,body{height:100%;margin:0;background: var(--el-bg-color);}
        #dify-chatbot-bubble-button{ background-color:#1C64F2 !important; }
        #dify-chatbot-bubble-window{
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
      </style>
    </head><body>
      <script>
        window.difyChatbotConfig = { token: ${tokenJson}, baseUrl: '${difyBase}', inputs: {}, systemVariables: {}, userVariables: {} }
      <\/script>
      <script src="${embedSrc}" id="${tokenAttr}" defer><\/script>
      <script>
        (function(){
          var attempts = 0;
          var max = 60;
          var timer = setInterval(function(){
            attempts++;
            try{
              if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
                window.difyChatbot.open();
              } else {
                var btn = document.getElementById('dify-chatbot-bubble-button');
                if (btn) btn.click();
              }
              var win = document.getElementById('dify-chatbot-bubble-window');
              if (win) {
                var btn2 = document.getElementById('dify-chatbot-bubble-button');
                if (btn2) btn2.style.display = 'none';
                win.style.position = 'fixed';
                win.style.inset = '0';
                win.style.width = '100vw';
                win.style.height = '100vh';
                win.style.maxWidth = 'none';
                win.style.maxHeight = 'none';
                win.style.borderRadius = '0';
                win.style.border = 'none';
                win.style.boxShadow = 'none';
                clearInterval(timer);
              }
            } catch (error) {}
            if (attempts > max) clearInterval(timer);
          }, 250);
        })();
      <\/script>
    </body></html>`
  }
}

function syncIframeContent() {
  const elements = getPanelElements()
  if (!elements?.iframe) return

  const { iframe } = elements
  const { signature, html } = buildIframeHtml()
  if (iframe.dataset.signature === signature) return

  iframe.dataset.signature = signature
  iframe.srcdoc = html
}

function createResizeHandle(direction, className) {
  const handle = document.createElement('div')
  handle.className = `${PANEL_CLASSES.handle} ${className}`
  handle.dataset.direction = direction
  handle.setAttribute('aria-hidden', 'true')
  return handle
}

function injectPanelStyle() {
  if (document.getElementById(PANEL_IDS.style)) return

  const style = document.createElement('style')
  style.id = PANEL_IDS.style
  style.textContent = `
    #${PANEL_IDS.panel} {
      position: fixed;
      left: 0;
      top: 0;
      width: min(34vw, 30rem);
      height: 50vh;
      display: none;
      flex-direction: column;
      box-sizing: border-box;
      background: var(--el-bg-color);
      border: 1px solid var(--el-border-color-lighter, #e5e7eb);
      border-radius: 12px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
      overflow: hidden;
      pointer-events: auto;
      z-index: 2147483647;
    }
    #${PANEL_IDS.panel}.visible {
      display: flex;
    }
    #${PANEL_IDS.panel}.dragging,
    #${PANEL_IDS.panel}.dragging * {
      cursor: grabbing !important;
    }
    #${PANEL_IDS.panel}.resizing,
    #${PANEL_IDS.panel}.resizing * {
      user-select: none;
    }
    #${PANEL_IDS.header} {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex: 0 0 auto;
      padding: 12px 14px;
      background: var(--el-fill-color-light, #f8fafc);
      border-bottom: 1px solid var(--el-border-color-lighter, #e5e7eb);
      cursor: grab;
      touch-action: none;
    }
    #${PANEL_IDS.title} {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary, #1f2937);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #${PANEL_IDS.close} {
      width: 40px;
      height: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border: none;
      border-radius: 10px;
      background: transparent;
      color: var(--el-text-color-regular, #4b5563);
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }
    #${PANEL_IDS.close}:hover {
      background: var(--el-fill-color, #f3f4f6);
      color: var(--el-text-color-primary, #111827);
    }
    #${PANEL_IDS.body} {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      background: var(--el-bg-color);
    }
    #${PANEL_IDS.iframe} {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: var(--el-bg-color);
    }
    .${PANEL_CLASSES.handle} {
      position: absolute;
      z-index: 3;
      touch-action: none;
    }
    .${PANEL_CLASSES.handleRight} {
      top: 52px;
      right: 0;
      bottom: 14px;
      width: 10px;
      cursor: ew-resize;
    }
    .${PANEL_CLASSES.handleBottom} {
      left: 14px;
      right: 14px;
      bottom: 0;
      height: 10px;
      cursor: ns-resize;
    }
    .${PANEL_CLASSES.handleCorner} {
      right: 0;
      bottom: 0;
      width: 18px;
      height: 18px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 35%, rgba(148, 163, 184, 0.85) 36%, rgba(148, 163, 184, 0.85) 50%, transparent 51%);
    }
  `
  document.head.appendChild(style)
}

function buildPanelShell(titleText) {
  const root = document.createElement('div')
  root.id = PANEL_IDS.root

  const panel = document.createElement('div')
  panel.id = PANEL_IDS.panel

  const header = document.createElement('div')
  header.id = PANEL_IDS.header

  const title = document.createElement('div')
  title.id = PANEL_IDS.title
  title.textContent = titleText || DEFAULT_TITLE

  const closeButton = document.createElement('button')
  closeButton.id = PANEL_IDS.close
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', '关闭 AI OPS 面板')
  closeButton.textContent = '×'

  const body = document.createElement('div')
  body.id = PANEL_IDS.body

  const iframe = document.createElement('iframe')
  iframe.id = PANEL_IDS.iframe
  iframe.setAttribute('allow', 'fullscreen;microphone')

  header.appendChild(title)
  header.appendChild(closeButton)
  body.appendChild(iframe)

  panel.appendChild(header)
  panel.appendChild(body)
  panel.appendChild(createResizeHandle('right', PANEL_CLASSES.handleRight))
  panel.appendChild(createResizeHandle('bottom', PANEL_CLASSES.handleBottom))
  panel.appendChild(createResizeHandle('bottom-right', PANEL_CLASSES.handleCorner))
  root.appendChild(panel)

  return {
    root,
    panel,
    header,
    title,
    closeButton,
    iframe,
    resizeHandles: panel.querySelectorAll(`.${PANEL_CLASSES.handle}`)
  }
}

function mountAiOpsPanelEvents(elements) {
  const { panel, header, closeButton, resizeHandles } = elements

  const handleHeaderPointerDown = event => {
    if (event.button !== 0) return
    if (event.target instanceof Element && event.target.closest(`#${PANEL_IDS.close}`)) return

    event.preventDefault()
    const rect = panel.getBoundingClientRect()

    interactionState.mode = 'drag'
    interactionState.direction = ''
    interactionState.startX = event.clientX
    interactionState.startY = event.clientY
    interactionState.startLeft = rect.left
    interactionState.startTop = rect.top
    interactionState.startWidth = rect.width
    interactionState.startHeight = rect.height

    panel.classList.add('dragging')
    document.body.style.userSelect = 'none'
    header.setPointerCapture?.(event.pointerId)
  }

  const handleClosePointerDown = event => {
    event.stopPropagation()
  }

  const handleCloseClick = event => {
    event.preventDefault()
    event.stopPropagation()
    closeAiOpsPanel()
  }

  const handleResizePointerDown = event => {
    if (event.button !== 0) return

    const handle = event.currentTarget
    if (!(handle instanceof HTMLElement)) return

    event.preventDefault()
    event.stopPropagation()

    const rect = panel.getBoundingClientRect()
    interactionState.mode = 'resize'
    interactionState.direction = handle.dataset.direction || ''
    interactionState.startX = event.clientX
    interactionState.startY = event.clientY
    interactionState.startLeft = rect.left
    interactionState.startTop = rect.top
    interactionState.startWidth = rect.width
    interactionState.startHeight = rect.height

    panel.classList.add('resizing')
    document.body.style.userSelect = 'none'
    handle.setPointerCapture?.(event.pointerId)
  }

  bindEvent(header, 'pointerdown', handleHeaderPointerDown)
  bindEvent(closeButton, 'pointerdown', handleClosePointerDown)
  bindEvent(closeButton, 'click', handleCloseClick)
  resizeHandles.forEach(handle => bindEvent(handle, 'pointerdown', handleResizePointerDown))
  bindEvent(window, 'pointermove', updatePanelOnPointerMove)
  bindEvent(window, 'pointerup', stopInteraction)
  bindEvent(window, 'pointercancel', stopInteraction)
  bindEvent(window, 'resize', () => syncAiOpsPanelLayout())
  bindEvent(window, 'orientationchange', () => syncAiOpsPanelLayout())
  bindEvent(window, 'keydown', event => {
    if (event.key === 'Escape') {
      stopInteraction()
      closeAiOpsPanel()
    }
  })
}

function ensureAiOpsPanel(options = {}) {
  if (typeof document === 'undefined') return null

  injectPanelStyle()

  const existing = getPanelElements()
  if (existing) {
    if (existing.title) {
      existing.title.textContent = options.title || DEFAULT_TITLE
    }
    syncIframeContent()
    syncAiOpsPanelLayout()
    return existing
  }

  const elements = buildPanelShell(options.title || DEFAULT_TITLE)
  document.body.appendChild(elements.root)
  mountAiOpsPanelEvents(elements)
  syncIframeContent()
  syncAiOpsPanelLayout({ resetPosition: true, resetSize: true })
  return elements
}

export function toggleAiOpsPanel(options = {}) {
  const elements = ensureAiOpsPanel(options)
  if (!elements?.panel) return

  stopInteraction()
  syncAiOpsPanelLayout()

  if (elements.panel.classList.contains('visible')) {
    closeAiOpsPanel()
  } else {
    elements.panel.classList.add('visible')
  }
}

export function prewarmAiOpsPanel() {
  if (aiOpsPrewarmed || typeof document === 'undefined') return
  aiOpsPrewarmed = true

  try {
    const base = getAppBase()
    const embedHref = `${base}dify/embed.min.js`
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = embedHref
    link.as = 'script'
    document.head.appendChild(link)

    const difyBase = getDifyBase()
    if (difyBase) {
      const preconnect = document.createElement('link')
      preconnect.rel = 'preconnect'
      preconnect.href = difyBase
      preconnect.crossOrigin = ''
      document.head.appendChild(preconnect)

      const dns = document.createElement('link')
      dns.rel = 'dns-prefetch'
      dns.href = difyBase
      document.head.appendChild(dns)
    }
  } catch {}
}

export function disposeAiOpsPanel() {
  stopInteraction()

  while (cleanupTasks.length > 0) {
    const cleanup = cleanupTasks.pop()
    try {
      cleanup?.()
    } catch {}
  }

  document.getElementById(PANEL_IDS.root)?.remove()
  document.getElementById(PANEL_IDS.style)?.remove()
  aiOpsPrewarmed = false
}
