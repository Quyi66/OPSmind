<template>
  <div class="aiops-assistant-fullscreen">
    <div class="fallback" v-if="!ready">
      <div>{{ statusText }}</div>
      <button class="retry-btn" @click="retryOpen">手动打开</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const AI_ICON = new URL('@/assets/icons/aiOPS2@2x.png', import.meta.url).href
// 运行时配置（若存在 runtime-config.js）
const RUNTIME = (() => {
  try {
    return window.__OPS_RUNTIME__ || {}
  } catch {
    return {}
  }
})()
// Token 获取：URL 参数 -> runtime DIFY_TOKEN -> 环境变量（兼容）
const URL_TOKEN = (() => {
  try {
    return new URLSearchParams(location.search).get('token') || ''
  } catch {
    return ''
  }
})()
const DEFAULT_DIFY_TOKEN = 'tRnUImvfrP77TFr0'
const TOKEN =
  URL_TOKEN || RUNTIME.DIFY_TOKEN || import.meta.env.VITE_DIFY_TOKEN || DEFAULT_DIFY_TOKEN
// Embed 地址：仅本地加载（public/dify/embed.min.js），统一策略
const EMBED_SRC = `${import.meta.env.BASE_URL || '/'}dify/embed.min.js`
const ready = ref(false)
const statusText = ref('正在加载 OPS 智能助手...')
const DEFAULT_ASK = (() => {
  try {
    return new URLSearchParams(location.search).get('q') || ''
  } catch {
    return ''
  }
})()

onMounted(() => {
  try {
    if (!TOKEN) {
      statusText.value = '缺少 token：请通过 URL 传入 ?token=...，或通过运行时配置设置 DIFY_TOKEN。'
      return
    }
    // 设置浏览器标签页 favicon 为智能助手图标
    setFavicon(AI_ICON)
    // 配置全局变量
    window.difyChatbotConfig = {
      token: TOKEN,
      baseUrl: String(RUNTIME.DIFY_BASE_URL || '').replace(/\/$/, ''),
      inputs: DEFAULT_ASK ? { q: DEFAULT_ASK, question: DEFAULT_ASK } : {},
      systemVariables: {},
      userVariables: {}
    }

    // 注入样式（作用于气泡组件）
    const style = document.createElement('style')
    style.id = 'dify-chatbot-style-overrides'
    style.textContent = `
      html, body { height: 100%; }
      /* 先不隐藏按钮，待窗口打开后再隐藏，避免无法触发打开 */
      #dify-chatbot-bubble-window {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
        z-index: 2147483647 !important;
      }
    `
    document.head.appendChild(style)

    // 注入脚本
    const existing = document.getElementById(TOKEN)
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.src = EMBED_SRC
    script.id = TOKEN
    script.defer = true
    script.onload = () => {
      // 尝试打开全屏聊天窗口，并在打开后隐藏气泡按钮
      const tryOpen = () => {
        try {
          if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
            window.difyChatbot.open()
          } else {
            const btn = document.getElementById('dify-chatbot-bubble-button')
            if (btn) btn.click()
          }
          const win = document.getElementById('dify-chatbot-bubble-window')
          if (win) {
            // 隐藏气泡按钮，防止遮挡
            const btn = document.getElementById('dify-chatbot-bubble-button')
            if (btn) btn.style.display = 'none'
            // 若 URL 携带 q，尝试自动发送为首条消息
            if (DEFAULT_ASK) {
              tryAutoAsk(DEFAULT_ASK)
            }
            ready.value = true
            return true
          }
        } catch (e) {
          console.warn('dify open attempt failed:', e)
        }
        return false
      }
      let attempts = 0
      const timer = setInterval(() => {
        attempts++
        if (tryOpen() || attempts > 60) {
          clearInterval(timer)
          // 即使未检测到窗口，也不一直显示loading，避免空白页卡住
          if (!ready.value) {
            statusText.value =
              '加载失败：未检测到 Dify 窗口。请点击“手动打开”，或检查脚本加载与网络/CSP。'
          }
        }
      }, 250)
    }
    document.body.appendChild(script)
  } catch (e) {
    console.error('Failed to init OPS Assistant:', e)
    statusText.value = '初始化失败：请检查控制台错误信息。'
  }
})

onBeforeUnmount(() => {
  try {
    restoreFavicon()
    const script = document.getElementById(TOKEN)
    if (script) script.remove()
    const style = document.getElementById('dify-chatbot-style-overrides')
    if (style) style.remove()
    // 清理气泡 DOM（若存在）
    const bubble = document.getElementById('dify-chatbot-bubble')
    if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble)
  } catch {
    /* empty */
  }
})

function tryAutoAsk(message) {
  if (!message) return
  let attempts = 0
  const maxAttempts = 40 // ~10s

  const timer = setInterval(() => {
    attempts++
    try {
      // 1) 若官方对象提供发送方法，优先调用
      if (window.difyChatbot) {
        const methods = ['send', 'ask', 'input', 'sendMessage', 'push']
        for (const m of methods) {
          if (typeof window.difyChatbot[m] === 'function') {
            try {
              window.difyChatbot[m](message)
              clearInterval(timer)
              return
            } catch {
              /* empty */
            }
          }
        }
      }

      // 2) 直接在 DOM 中寻找输入框与发送按钮（若非跨域 iframe）
      const container = document.getElementById('dify-chatbot-bubble-window')
      if (container) {
        const input = container.querySelector(
          'textarea, input[type="text"], [contenteditable="true"]'
        )
        if (input) {
          try {
            if ('value' in input) {
              input.value = message
              input.dispatchEvent(new Event('input', { bubbles: true }))
              input.dispatchEvent(new Event('change', { bubbles: true }))
            } else {
              input.textContent = message
              input.dispatchEvent(new Event('input', { bubbles: true }))
            }
            let sendBtn = Array.from(container.querySelectorAll('button')).find(b => {
              const t = (b.getAttribute('aria-label') || b.textContent || '').trim()
              return /send|发送|提交|enter/i.test(t)
            })
            if (!sendBtn) {
              sendBtn = Array.from(container.querySelectorAll('button')).find(b =>
                /send|paper|arrow|提交|发送/i.test(b.className || '')
              )
            }
            if (sendBtn) {
              sendBtn.click()
              clearInterval(timer)
              return
            }
          } catch {
            /* empty */
          }
        }
        const iframe = container.querySelector('iframe')
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.postMessage(
              { source: 'opsmind', type: 'dify:send', payload: { text: message } },
              '*'
            )
          } catch {
            /* empty */
          }
        }
      }
    } catch {
      /* empty */
    }

    if (attempts >= maxAttempts) clearInterval(timer)
  }, 250)
}

function retryOpen() {
  try {
    if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
      window.difyChatbot.open()
      setTimeout(() => {
        const win = document.getElementById('dify-chatbot-bubble-window')
        if (win) {
          const btn = document.getElementById('dify-chatbot-bubble-button')
          if (btn) btn.style.display = 'none'
          ready.value = true
          return
        }
        statusText.value = '仍未打开，请检查脚本或网络。'
      }, 300)
      return
    }
    const btn = document.getElementById('dify-chatbot-bubble-button')
    if (btn) {
      btn.click()
      setTimeout(() => {
        const win = document.getElementById('dify-chatbot-bubble-window')
        if (win) {
          if (btn) btn.style.display = 'none'
          ready.value = true
        } else {
          statusText.value = '仍未打开，请检查脚本或网络。'
        }
      }, 300)
    } else {
      statusText.value = '未检测到 Dify 按钮或对象，请检查脚本路径是否正确。'
    }
  } catch (e) {
    console.error('Retry open failed:', e)
    statusText.value = '手动打开失败，查看控制台错误。'
  }
}

// --- Favicon helpers ---
let previousFaviconHref = ''
let createdFavicon = false
function setFavicon(href) {
  try {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      createdFavicon = true
      document.head.appendChild(link)
    } else {
      createdFavicon = false
      previousFaviconHref = link.getAttribute('href') || ''
    }
    link.type = 'image/png'
    link.href = href
  } catch {
    /* empty */
  }
}
function restoreFavicon() {
  try {
    const link = document.querySelector('link[rel="icon"]')
    if (!link) return
    if (createdFavicon) {
      // We created it here; remove on exit
      link.parentNode && link.parentNode.removeChild(link)
    } else if (previousFaviconHref) {
      link.href = previousFaviconHref
    }
  } catch {
    /* empty */
  }
}
</script>

<style scoped>
.aiops-assistant-fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: var(--el-bg-color);
}
.fallback {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #6b7280;
  font-size: 14px;
}
.retry-btn {
  margin-top: 12px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  background: var(--el-bg-color);
  border-radius: 6px;
  cursor: pointer;
}
</style>
