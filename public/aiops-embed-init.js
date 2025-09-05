;(function () {
  try {
    const qs = new URLSearchParams(location.search || '')
    const rt = (function () {
      try {
        return window.__OPS_RUNTIME__ || {}
      } catch (e) {
        console.log(e)
        return {}
      }
    })()
    const DEFAULT_TOKEN = 'tRnUImvfrP77TFr0'

    // Resolve token: URL > runtime
    let token = qs.get('token') || rt.DIFY_TOKEN || ''
    if (!token) {
      try {
        const ls = window.localStorage
        token =
          ls.getItem('DIFY_TOKEN') || ls.getItem('ops:dify_token') || ls.getItem('dify:token') || ''
      } catch (e) {
        console.log(e)

      }
    }
    if (!token) token = DEFAULT_TOKEN
    // Embed script: use local only
    const embed = 'dify/embed.min.js'
    const difyBase = String(rt.DIFY_APP || rt.DIFY_ORIGIN || '').replace(/\/$/, '')
    // No initial question injection
    // Mode/page behavior
    const mode = (qs.get('mode') || 'page').toLowerCase() // 'page' | 'bubble'
    const autoFlag = qs.get('auto') === '1'
    const autoOpen = autoFlag || mode !== 'bubble'

    const statusEl = document.getElementById('status')
    if (!token) {
      if (statusEl)
        statusEl.textContent =
          '缺少 token：请通过 URL 传入 ?token=...，或通过运行时配置设置 DIFY_TOKEN。'
      return
    }

    // Pass config to Dify
    window.difyChatbotConfig = difyBase
      ? { token, baseUrl: difyBase, inputs: {}, systemVariables: {}, userVariables: {} }
      : { token, inputs: {}, systemVariables: {}, userVariables: {} }

    // If already injected (same token as element id), try to open directly
    const existing = document.getElementById(token)
    if (existing) {
      waitAndOpen()
    } else {
      // Inject embed script (local only)
      const script = document.createElement('script')
      script.src = embed
      script.id = token // align with Dify snippet expectation
      script.defer = true
      script.onload = function () {
        waitAndOpen()
      }
      script.onerror = function () {
        if (statusEl) statusEl.textContent = '脚本加载失败：请检查本地 embed 路径或网络。'
      }
      document.body.appendChild(script)
    }

    // Open logic with small retry loop
    function waitAndOpen() {
      let attempts = 0
      const maxAttempts = mode === 'bubble' ? 60 : 20
      const interval = mode === 'bubble' ? 250 : 200
      const timer = setInterval(function () {
        attempts++
        try {
          if (autoOpen) {
            if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
              window.difyChatbot.open()
            } else {
              const btn = document.getElementById('dify-chatbot-bubble-button')
              if (btn) btn.click()
            }
          }
          const win = document.getElementById('dify-chatbot-bubble-window')
          if (win) {
            if (autoOpen && mode !== 'bubble') {
              const btn2 = document.getElementById('dify-chatbot-bubble-button')
              if (btn2) btn2.style.display = 'none'
            }
            if (statusEl) statusEl.style.display = 'none'
            clearInterval(timer)
            return
          }
        } catch (e) {
          console.log(e)
        }

        if (attempts > maxAttempts) {
          clearInterval(timer)
          if (statusEl) statusEl.textContent = '加载失败：请检查脚本或 CSP 配置。'
        }
      }, interval)
    }
    // No auto-send behavior by design
    // Preconnect to Dify base when provided
    try {
      if (difyBase) {
        var pre = document.createElement('link')
        pre.rel = 'preconnect'
        pre.href = difyBase
        pre.crossOrigin = ''
        document.head.appendChild(pre)
        var dns = document.createElement('link')
        dns.rel = 'dns-prefetch'
        dns.href = difyBase
        document.head.appendChild(dns)
      }
    } catch (_e) {}
  } catch (e) {
    const status = document.getElementById('status')
    if (status) status.textContent = `初始化失败：${e && e.message ? e.message : e}`
  }
})()
