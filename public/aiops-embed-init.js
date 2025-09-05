(function () {
  try {
    // 解析查询参数
    var qs = new URLSearchParams(location.search)
    // 读取当前脚本的查询参数（便于在 SPA 内注入时传参）
    var cs = (function(){ try { return document.currentScript ? new URL(document.currentScript.src).searchParams : null } catch(_) { return null } })()
    // 读取 runtime 配置（由容器 entrypoint 渲染）
    var rt = (function(){ try { return window.__OPS_RUNTIME__ || {} } catch(_) { return {} } })()
    // 获取 token（仅来源于 URL、当前脚本参数或 runtime-config），不再写死默认值
    var token = qs.get('token') || (cs && cs.get('token')) || rt.DIFY_TOKEN || ''
    var runtimeEmbed = rt.DIFY_EMBED_URL
    // Prefer a single origin variable if provided (e.g., https://dify.example.com[:port])
    if (!runtimeEmbed && rt.DIFY_APP) {
      try {
        var originA = String(rt.DIFY_APP).replace(/\/$/, '')
        runtimeEmbed = originA + '/embed.min.js'
      } catch (_) {}
    }
    // Backward compatibility: DIFY_ORIGIN
    if (!runtimeEmbed && rt.DIFY_ORIGIN) {
      try {
        var originB = String(rt.DIFY_ORIGIN).replace(/\/$/, '')
        runtimeEmbed = originB + '/embed.min.js'
      } catch (_) {}
    }
    // Backward compatibility: compose from scheme/host/port if origin is not provided
    if (!runtimeEmbed && rt.DIFY_SCHEME && rt.DIFY_HOST) {
      runtimeEmbed = rt.DIFY_SCHEME + '://' + rt.DIFY_HOST + (rt.DIFY_PORT ? (':' + rt.DIFY_PORT) : '') + '/embed.min.js'
    }
    var embed = qs.get('embed') || (cs && cs.get('embed')) || runtimeEmbed || 'https://udify.app/embed.min.js'
    var q = qs.get('q') || (cs && cs.get('q')) || ''
    // 从页面 URL 或当前脚本的查询参数读取 mode/auto
    var mode = (qs.get('mode') || (cs && cs.get('mode')) || 'page').toLowerCase() // 'page' | 'bubble'
    var autoFlag = (qs.get('auto') === '1') || (cs && cs.get('auto') === '1')
    var compactFlag = (qs.get('compact') === '1') || (cs && cs.get('compact') === '1')
    var autoOpen = autoFlag || mode !== 'bubble'

    // 标记紧凑模式（用于在宿主页注入CSS隐藏头像等）
    if (compactFlag) {
      try { document.documentElement.setAttribute('data-compact', '1') } catch(_) {}
    }

    var statusEl = document.getElementById('status')
    if (!token) {
      if (statusEl) statusEl.textContent = '缺少 token：请通过 URL 传入 ?token=...，或通过运行时配置设置 DIFY_TOKEN。'
      return
    }

    // 配置 Dify Chatbot（可将 q 传给 Start 节点的变量）
    window.difyChatbotConfig = {
      token: token,
      inputs: q ? { q: q, question: q } : {},
      systemVariables: {},
      userVariables: {}
    }

    // 动态加载脚本
    var script = document.createElement('script')
    script.src = embed
    script.id = token // align with Dify snippet expectation
    script.defer = true
    script.onload = function () {
      var status = document.getElementById('status')
      var tryOpen = function () {
        try {
          if (autoOpen) {
            if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
              window.difyChatbot.open()
            } else {
              var btn = document.getElementById('dify-chatbot-bubble-button')
              if (btn) btn.click()
            }
          }
          var win = document.getElementById('dify-chatbot-bubble-window')
          if (win) {
            if (autoOpen && mode !== 'bubble') {
              var btn2 = document.getElementById('dify-chatbot-bubble-button')
              if (btn2) btn2.style.display = 'none'
            }
            if (status) status.classList.add('hidden')
            // 若带有 q，则尝试自动填充并发送
            if (q && autoOpen) {
              tryAutoAsk(q)
            }
            return true
          }
        } catch (e) { /* ignore */ }
        return false
      }
      var attempts = 0
      var timer = setInterval(function () {
        attempts++
        if (tryOpen() || attempts > 60) {
          clearInterval(timer)
          if (attempts > 60 && status) {
            status.textContent = '加载失败：请检查脚本或 CSP 配置。'
          }
        }
      }, 250)
    }
    script.onerror = function () {
      var status = document.getElementById('status')
      if (status) status.textContent = '脚本加载失败：请检查 embed 地址或网络。'
    }
    document.body.appendChild(script)
  } catch (e) {
    var status = document.getElementById('status')
    if (status) status.textContent = '初始化失败：' + (e && e.message ? e.message : e)
  }
})()

// 尝试将 q 作为用户输入自动发送到聊天窗口
function tryAutoAsk(message) {
  if (!message) return

  var attempts = 0
  var maxAttempts = 40 // ~10 秒

  var timer = setInterval(function () {
    attempts++
    try {
      // 1) 优先尝试官方对象可能提供的发送方法
      if (window.difyChatbot) {
        var methods = ['send', 'ask', 'input', 'sendMessage', 'push']
        for (var i = 0; i < methods.length; i++) {
          var m = methods[i]
          if (typeof window.difyChatbot[m] === 'function') {
            try {
              // 常见方法可能接受字符串或对象
              var ok = window.difyChatbot[m].length > 0
                ? window.difyChatbot[m](message)
                : window.difyChatbot[m]()
              clearInterval(timer)
              return
            } catch (_) {}
          }
        }
      }

      // 2) 直接尝试在窗口 DOM 中找到输入框并点击发送（若非跨域 iframe）
      var container = document.getElementById('dify-chatbot-bubble-window')
      if (container) {
        // 查找输入元素
        var input = container.querySelector('textarea, input[type="text"], [contenteditable="true"]')
        if (input) {
          try {
            // 设置值并派发事件
            if ('value' in input) {
              input.value = message
              var ev1 = new Event('input', { bubbles: true })
              input.dispatchEvent(ev1)
              var ev2 = new Event('change', { bubbles: true })
              input.dispatchEvent(ev2)
            } else {
              input.textContent = message
              var ev3 = new Event('input', { bubbles: true })
              input.dispatchEvent(ev3)
            }
            // 找到“发送”按钮
            var btns = Array.prototype.slice.call(container.querySelectorAll('button'))
            var sendBtn = btns.find(function (b) {
              var t = (b.getAttribute('aria-label') || b.textContent || '').trim()
              return /send|发送|提交|enter/i.test(t)
            })
            if (!sendBtn) {
              // 退一步查找带有纸飞机/箭头图标的按钮
              sendBtn = btns.find(function (b) {
                var cls = b.className || ''
                return /send|paper|arrow|提交|发送/i.test(cls)
              })
            }
            if (sendBtn) {
              sendBtn.click()
              clearInterval(timer)
              return
            }
          } catch (_) {
            // 可能因跨域或 Shadow DOM 导致失败
          }
        }

        // 3) 若为 iframe，尝试通过 postMessage 通知（取决于官方脚本是否支持）
        var iframe = container.querySelector('iframe')
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage({ source: 'opsmind', type: 'dify:send', payload: { text: message } }, '*')
            // 无法确认是否成功，只尝试发送一次
          } catch (_) {}
        }
      }
    } catch (_) {}

    if (attempts >= maxAttempts) {
      clearInterval(timer)
    }
  }, 250)
}
