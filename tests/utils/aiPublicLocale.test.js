import fs from 'node:fs'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it } from 'vitest'
import { renderAiLocaleRuntime } from '../../scripts/ai-i18n-runtime.mjs'

const runtime = fs.readFileSync('public/aiops-i18n.js', 'utf8')
const init = fs.readFileSync('public/aiops-embed-init.js', 'utf8')
const windows = []
function open({ stored = 'en-US', languages = ['zh-CN'], token = '', bubble = false } = {}) {
  const dom = new JSDOM(
    `<html ${bubble ? 'data-ai-title="bubbleTitle"' : ''}><head></head><body><div id="status"></div></body></html>`,
    { url: 'https://example.test/ops/aiops-full.html', runScripts: 'outside-only' }
  )
  const win = dom.window
  windows.push(win)
  Object.defineProperty(win.navigator, 'languages', { value: languages })
  if (stored) win.localStorage.setItem('opsmind:locale', stored)
  win.__OPS_RUNTIME__ = { DIFY_TOKEN: token, DIFY_BASE_URL: 'https://dify.example.test' }
  win.eval(runtime)
  win.eval(init)
  return win
}
function switchLocale(win, value) {
  win.dispatchEvent(
    new win.StorageEvent('storage', {
      key: 'opsmind:locale',
      newValue: value,
      storageArea: win.localStorage
    })
  )
}
afterEach(() => windows.splice(0).forEach(win => win.close()))
describe('standalone AI shell locales', () => {
  it('uses the registered dictionaries and keeps the generated artifact synchronized', () => {
    expect(runtime).toBe(renderAiLocaleRuntime())
    const win = open()
    expect(win.document.title).toBe('OPS assistant')
    expect(win.document.documentElement.lang).toBe('en-US')
    expect(win.document.getElementById('status').textContent).toContain('Missing token')
    switchLocale(win, 'zh-CN')
    expect(win.document.title).toBe('OPS智能助手')
    expect(win.document.getElementById('status').textContent).toContain('缺少 token')
    expect(win.document.querySelectorAll('script')).toHaveLength(0)
  })
  it('updates error text without reinjecting the embed, reopening it or changing its configuration', () => {
    const win = open({ token: 'raw-token' }),
      script = win.document.getElementById('raw-token')
    const config = win.difyChatbotConfig
    expect(config).toEqual({
      token: 'raw-token',
      baseUrl: 'https://dify.example.test',
      inputs: {},
      systemVariables: {},
      userVariables: {}
    })
    script.onerror()
    expect(win.document.getElementById('status').textContent).toContain('Script loading failed')
    switchLocale(win, 'zh-CN')
    expect(win.document.getElementById('status').textContent).toContain('脚本加载失败')
    expect(win.document.getElementById('raw-token')).toBe(script)
    expect(win.difyChatbotConfig).toBe(config)
    expect(win.document.querySelectorAll('script')).toHaveLength(1)
  })
  it('matches browser languages, migrates inactive traditional preferences and leaves unrelated storage alone', () => {
    const english = open({ stored: '', languages: ['ja-JP', 'en-GB'], bubble: true })
    expect(english.document.title).toBe('OPS assistant · Bubble')
    english.dispatchEvent(new english.StorageEvent('storage', { key: 'other', newValue: 'zh-CN' }))
    expect(english.opsAiI18n.locale).toBe('en-US')
    switchLocale(english, 'zh-CN')
    expect(english.document.title).toBe('OPS智能助手 · 气泡')
    switchLocale(english, 'en-US')
    expect(english.document.title).toBe('OPS assistant · Bubble')
    const chinese = open({ stored: 'zh-TW' })
    expect(chinese.opsAiI18n.locale).toBe('zh-CN')
    const backend = '后端中文 #{key} {{value}} <tag>'
    expect(english.opsAiI18n.t('initError', { message: backend })).toBe(
      `Initialization failed: ${backend}`
    )
  })
})
