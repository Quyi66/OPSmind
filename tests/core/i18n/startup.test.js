import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import {
  currentLocale,
  ensureLocaleMessages,
  getBackendLanguage,
  i18n,
  language,
  setLocale,
  setupI18n
} from '@/core/i18n'
import { DEFAULT_LOCALE, LOCALE_DEFINITIONS, LOCALE_STORAGE_KEY } from '@/core/i18n/locales'

let app
afterEach(async () => {
  app?.unmount()
  app = undefined
  window.removeEventListener('storage', language.handleStorage)
  vi.restoreAllMocks()
  localStorage.removeItem(LOCALE_STORAGE_KEY)
  await setLocale(DEFAULT_LOCALE, { persist: false })
})

describe('language startup fallback', () => {
  it('publishes the backend language for the shared HTTP client and same-origin requests', async () => {
    await setLocale('en-US', { persist: false })
    expect(getBackendLanguage()).toBe('en')
    expect(document.cookie).toContain('NG_TRANSLATE_LANG_KEY=en')
    await setLocale('zh-CN', { persist: false })
    expect(getBackendLanguage()).toBe('zh-CN')
    expect(document.cookie).toContain('NG_TRANSLATE_LANG_KEY=zh-CN')
  })
  it('mounts with built-in Chinese even if initialization and its fallback reject', async () => {
    const failure = new Error('fallback failed')
    vi.spyOn(language, 'initialize').mockRejectedValueOnce(failure)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    i18n.global.locale.value = 'en-US'
    document.documentElement.lang = 'en-US'
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en-US')
    app = createApp({ template: '<p>{{ $t("common.profile") }}</p>' })
    await expect(setupI18n(app)).resolves.toBeUndefined()
    const container = document.createElement('div')
    app.mount(container)
    expect(container.textContent).toBe('个人资料')
    expect(currentLocale.value).toBe('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US')
    expect(warn).toHaveBeenCalledWith(
      '[i18n] Initialization failed; using built-in Simplified Chinese.',
      failure
    )
  })
  it('never requests a lazy chunk to load the already bundled default dictionary', async () => {
    const load = vi.spyOn(LOCALE_DEFINITIONS[0], 'load').mockRejectedValue(new Error('offline'))
    await expect(ensureLocaleMessages(DEFAULT_LOCALE)).resolves.toBeUndefined()
    expect(load).not.toHaveBeenCalled()
  })
})
