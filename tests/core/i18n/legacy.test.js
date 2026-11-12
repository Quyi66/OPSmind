import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setLocale } from '@/core/i18n'

afterEach(async () => {
  await setLocale('zh-CN', { persist: false })
  await flushPromises()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('legacy dictionary compatibility', () => {
  it('retries failed modules and updates rendered legacy messages without rewriting raw text', async () => {
    let available = false
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async url => ({
        ok: !url.endsWith('/jao.json') || available,
        json: async () =>
          url.endsWith('/jao.json') ? { test: { label: '原有模板 {{count}}' } } : {}
      }))
    )
    const { translateText, initTranslations, addTranslations } = await import('@/utils/i18n')
    await initTranslations()
    const wrapper = mount({
      setup: () => ({ translateText }),
      template: '<p>{{ translateText("#{test.label}") }}</p>'
    })
    expect(wrapper.text()).toBe('label')
    expect(warn).toHaveBeenCalledWith(
      '[i18n] Unable to load legacy translations:',
      { module: 'jao', url: expect.stringContaining('i18n/zh-cn/jao.json') },
      expect.any(Error)
    )
    available = true
    const callsBeforeSwitch = fetch.mock.calls.length
    await setLocale('en-US', { persist: false })
    await flushPromises()
    expect(fetch.mock.calls.slice(callsBeforeSwitch).map(([url]) => url)).toEqual([
      expect.stringContaining('i18n/zh-cn/jao.json')
    ])
    expect(wrapper.text()).toBe('原有模板 {{count}}')
    await initTranslations()
    expect(fetch).toHaveBeenCalledTimes(callsBeforeSwitch + 1)
    expect(translateText('后端原文')).toBe('后端原文')
    await setLocale('zh-CN', { persist: false })
    addTranslations({ common: { action: { cancel: '自定义取消' } } })
    expect(translateText('#{common.action.cancel}')).toBe('自定义取消')
    await setLocale('en-US', { persist: false })
    expect(translateText('#{common.action.cancel}')).toBe('Cancel')
    expect(wrapper.text()).toBe('原有模板 {{count}}')
    addTranslations({ 'common.action.cancel': 'Custom cancel' })
    expect(translateText('#{common.action.cancel}')).toBe('Custom cancel')
    await setLocale('zh-CN', { persist: false })
    expect(translateText('#{common.action.cancel}')).toBe('自定义取消')
    wrapper.unmount()
  })
})
