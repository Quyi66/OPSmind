import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AiOpsAssistantPage from '@/views/aiops/AiOpsAssistantPage.vue'
import { setLocale } from '@/core/i18n'
import { toggleAiOpsPanel, disposeAiOpsPanel } from '@/utils/ai-ops-panel'

let wrapper
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  window.__OPS_RUNTIME__ = { DIFY_TOKEN: 'test-token', DIFY_BASE_URL: 'https://dify.example.test' }
  await setLocale('zh-CN', { persist: false })
})
afterEach(async () => {
  wrapper?.unmount()
  wrapper = undefined
  disposeAiOpsPanel()
  document.getElementById('dify-chatbot-bubble-window')?.remove()
  delete window.difyChatbot
  delete window.difyChatbotConfig
  delete window.__OPS_RUNTIME__
  vi.clearAllTimers()
  vi.useRealTimers()
  await setLocale('zh-CN', { persist: false })
})
describe('Vue and native AI shells', () => {
  it('updates a persistent local error without reinjecting scripts, resetting readiness or rewriting a conversation', async () => {
    wrapper = mount(AiOpsAssistantPage)
    await flushPromises()
    const vm = wrapper.vm.$.setupState,
      script = document.getElementById('test-token'),
      config = window.difyChatbotConfig
    vm.retryOpen()
    await flushPromises()
    expect(wrapper.text()).toContain('未检测到 Dify 按钮或对象')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(wrapper.text()).toContain('No Dify control was detected')
    expect(wrapper.text()).toContain('Open manually')
    expect(document.getElementById('test-token')).toBe(script)
    expect(window.difyChatbotConfig).toBe(config)
    expect(vm.ready).toBe(false)
    const conversation = document.createElement('div')
    conversation.id = 'dify-chatbot-bubble-window'
    conversation.textContent = '后端对话原文 #{raw} {{value}}'
    document.body.appendChild(conversation)
    window.difyChatbot = { open: vi.fn() }
    vm.retryOpen()
    await vi.advanceTimersByTimeAsync(300)
    expect(vm.ready).toBe(true)
    await setLocale('zh-CN', { persist: false })
    expect(window.difyChatbot.open).toHaveBeenCalledTimes(1)
    expect(document.getElementById(conversation.id)).toBe(conversation)
    expect(conversation.textContent).toBe('后端对话原文 #{raw} {{value}}')
  })
  it('updates panel accessibility labels without replacing its iframe, geometry, custom title or visibility', async () => {
    toggleAiOpsPanel({ title: '自定义中文面板名称' })
    const panel = document.getElementById('ops-dify-bubble-panel')
    const iframe = document.getElementById('ops-dify-bubble-iframe')
    const close = document.getElementById('ops-dify-bubble-close')
    const html = iframe.srcdoc,
      geometry = panel.style.cssText
    expect(close.getAttribute('aria-label')).toBe('关闭 AI OPS 面板')
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(close.getAttribute('aria-label')).toBe('Close the AI OPS panel')
    expect(iframe.title).toBe('AI OPS assistant')
    expect(iframe.srcdoc).toBe(html)
    expect(document.getElementById(iframe.id)).toBe(iframe)
    expect(panel.style.cssText).toBe(geometry)
    expect(panel.classList.contains('visible')).toBe(true)
    expect(document.getElementById('ops-dify-bubble-title').textContent).toBe('自定义中文面板名称')
    expect(iframe.contentDocument.documentElement.lang).toBe('en-US')
  })
})
