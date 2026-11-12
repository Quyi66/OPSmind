import { describe, expect, it } from 'vitest'
import {
  LANGUAGE_OPTIONS,
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveInitialLocale
} from '@/core/i18n/locales'
import { ensureLocaleMessages } from '@/core/i18n'

describe('supported interface languages', () => {
  it('only registers and loads the two delivery languages', async () => {
    expect(SUPPORTED_LOCALES).toEqual(['zh-CN', 'en-US'])
    expect(LANGUAGE_OPTIONS.map(option => option.value)).toEqual(SUPPORTED_LOCALES)
    await expect(ensureLocaleMessages('zh-TW')).rejects.toThrow(RangeError)
  })
  it.each([
    ['zh-CN', 'zh-CN'],
    ['zh', 'zh-CN'],
    ['ZH_tw', 'zh-CN'],
    ['zh-HK', 'zh-CN'],
    ['zh-MO', 'zh-CN'],
    ['zh-Hant', 'zh-CN'],
    ['zh-Hant-CN', 'zh-CN'],
    ['zh-Hans-HK', 'zh-CN'],
    ['en-GB', 'en-US'],
    ['en', 'en-US'],
    ['ja-JP', null],
    [null, null],
    ['', null]
  ])('normalizes %s to %s', (source, expected) => {
    expect(normalizeLocale(source)).toBe(expected)
  })
  it('prefers a valid persisted choice, then the first supported browser language', () => {
    expect(resolveInitialLocale('zh-TW', ['en-US'])).toBe('zh-CN')
    expect(resolveInitialLocale('invalid', ['ja-JP', 'zh-Hant'])).toBe('zh-CN')
    expect(resolveInitialLocale(null, ['ja-JP'])).toBe('zh-CN')
  })
})
