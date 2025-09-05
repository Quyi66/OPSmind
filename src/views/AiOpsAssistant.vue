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

import DIFY_EMBED_LOCAL from '@/assets/vendor/dify/embed.min.js?url'
const TOKEN = import.meta.env.VITE_DIFY_TOKEN || 'tRnUImvfrP77TFr0'
const EMBED_SRC = import.meta.env.VITE_DIFY_EMBED_URL || DIFY_EMBED_LOCAL || 'https://udify.app/embed.min.js'
const ready = ref(false)
const statusText = ref('正在加载 OPS 智能助手...')

onMounted(() => {
  try {
    // 配置全局变量
    window.difyChatbotConfig = {
      token: TOKEN,
      inputs: {},
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
            statusText.value = '加载失败：未检测到 Dify 窗口。请点击“手动打开”，或检查脚本加载与网络/CSP。'
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
    const script = document.getElementById(TOKEN)
    if (script) script.remove()
    const style = document.getElementById('dify-chatbot-style-overrides')
    if (style) style.remove()
    // 清理气泡 DOM（若存在）
    const bubble = document.getElementById('dify-chatbot-bubble')
    if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble)
  } catch {}
})

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
</script>

<style scoped>
.aiops-assistant-fullscreen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #fff;
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
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
}
</style>
