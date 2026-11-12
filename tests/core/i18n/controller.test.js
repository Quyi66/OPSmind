import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createLocaleController } from '@/core/i18n/controller'
import { LOCALE_STORAGE_KEY } from '@/core/i18n/locales'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function setup(load = vi.fn().mockResolvedValue()) {
  const locale = ref('zh-CN')
  const storage = { getItem: vi.fn(), setItem: vi.fn() }
  const apply = vi.fn()
  return {
    locale,
    storage,
    apply,
    controller: createLocaleController({ locale, storage, apply, load, languages: ['zh-CN'] })
  }
}

describe('atomic language changes', () => {
  it('keeps the effective language until resources are ready and prevents a stale load from winning', async () => {
    const english = deferred(),
      simplified = deferred()
    const state = setup(value => (value === 'en-US' ? english.promise : simplified.promise))
    const first = state.controller.setLocale('en-US')
    const second = state.controller.setLocale('zh-CN')
    expect(state.locale.value).toBe('zh-CN')
    simplified.resolve()
    expect(await second).toBe(true)
    english.resolve()
    expect(await first).toBe(false)
    expect(state.locale.value).toBe('zh-CN')
    expect(state.storage.setItem).toHaveBeenCalledExactlyOnceWith(LOCALE_STORAGE_KEY, 'zh-CN')
    expect(state.apply).toHaveBeenCalledExactlyOnceWith('zh-CN')
    expect(state.controller.pending.value).toBe(false)
  })
  it('preserves the current language and preference after a failed load, and permits retry', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce()
    const state = setup(load)
    await expect(state.controller.setLocale('en-US')).rejects.toThrow('offline')
    expect(state.locale.value).toBe('zh-CN')
    expect(state.storage.setItem).not.toHaveBeenCalled()
    await state.controller.setLocale('en-US')
    expect(state.locale.value).toBe('en-US')
  })
  it('loads persisted preference without rewriting it and synchronizes without storage loops', async () => {
    const state = setup()
    state.storage.getItem.mockReturnValue('en-US')
    await state.controller.initialize()
    expect(state.locale.value).toBe('en-US')
    await state.controller.handleStorage({
      key: LOCALE_STORAGE_KEY,
      newValue: 'zh-HK',
      storageArea: state.storage
    })
    expect(state.locale.value).toBe('zh-CN')
    expect(state.storage.setItem).not.toHaveBeenCalled()
    await state.controller.handleStorage({ key: 'unrelated', newValue: 'en-US' })
    expect(state.locale.value).toBe('zh-CN')
  })
  it('continues when local storage is unavailable and rejects unsupported languages', async () => {
    const state = setup()
    state.storage.setItem.mockImplementation(() => {
      throw new Error('denied')
    })
    await state.controller.setLocale('zh-CN')
    expect(state.locale.value).toBe('zh-CN')
    await expect(state.controller.setLocale('fr')).rejects.toThrow(RangeError)
  })
})
