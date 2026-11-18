export const DEFAULT_LOCALE = 'zh-CN'
export const LOCALE_STORAGE_KEY = 'opsmind:locale'
// Registration controls availability, resource loading and validation.
export const LOCALE_DEFINITIONS = Object.freeze([
  {
    value: 'zh-CN',
    label: '简体中文',
    shortLabel: '中文',
    dateLocale: 'zh-cn',
    backendLanguage: 'zh-CN',
    load: () => import('../../locales/zh-CN/index.js')
  },
  {
    value: 'en-US',
    label: 'English',
    dateLocale: 'en',
    backendLanguage: 'en',
    load: () => import('../../locales/en-US/index.js')
  }
])
export const SUPPORTED_LOCALES = Object.freeze(LOCALE_DEFINITIONS.map(item => item.value))
export const LANGUAGE_OPTIONS = Object.freeze(
  LOCALE_DEFINITIONS.map(({ value, label, shortLabel }) => ({ value, label, shortLabel }))
)

export function normalizeLocale(value) {
  if (typeof value !== 'string') return null
  const parts = value.trim().replaceAll('_', '-').toLowerCase().split('-')
  if (parts[0] !== 'zh') {
    return (
      SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === parts.join('-')) ||
      SUPPORTED_LOCALES.find(locale => locale.toLowerCase().split('-')[0] === parts[0]) ||
      null
    )
  }
  // Preserve script/region matching for future zh-TW registration; until then use zh-CN.
  const candidate = parts.includes('hans')
    ? 'zh-CN'
    : parts.includes('hant') || parts.some(part => ['tw', 'hk', 'mo'].includes(part))
      ? 'zh-TW'
      : 'zh-CN'
  return SUPPORTED_LOCALES.includes(candidate) ? candidate : DEFAULT_LOCALE
}

export function resolveInitialLocale(stored, languages = []) {
  return (
    normalizeLocale(stored) ||
    languages.map(value => normalizeLocale(value)).find(Boolean) ||
    DEFAULT_LOCALE
  )
}

export const DATE_LOCALES = Object.freeze(
  Object.fromEntries(LOCALE_DEFINITIONS.map(({ value, dateLocale }) => [value, dateLocale]))
)
