import { createI18n } from 'vue-i18n'
import zhCN from '@/locales/zh-CN'
import { createLocaleController } from './controller'
import { DEFAULT_LOCALE, LOCALE_DEFINITIONS } from './locales'

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: { default: [DEFAULT_LOCALE] },
  messages: { 'zh-CN': zhCN },
  missingWarn: false,
  fallbackWarn: false
})

const loaders = Object.fromEntries(
  LOCALE_DEFINITIONS.map(definition => [
    definition.value,
    () => definition.load().then(module => module.default)
  ])
)
const loading = new Map()
export function ensureLocaleMessages(locale) {
  if (!Object.hasOwn(loaders, locale))
    return Promise.reject(new RangeError(`Unsupported locale: ${locale}`))
  // The built-in fallback is already available; do not depend on another chunk request.
  if (locale === DEFAULT_LOCALE) return Promise.resolve()
  if (!loading.has(locale)) {
    loading.set(
      locale,
      loaders[locale]()
        .then(messages => {
          i18n.global.setLocaleMessage(locale, messages)
        })
        .catch(error => {
          loading.delete(locale)
          throw error
        })
    )
  }
  return loading.get(locale)
}

function getStorage() {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}
export const language = createLocaleController({
  locale: i18n.global.locale,
  load: ensureLocaleMessages,
  storage: getStorage(),
  languages: globalThis.navigator?.languages || [globalThis.navigator?.language].filter(Boolean),
  apply: locale => globalThis.document?.documentElement.setAttribute('lang', locale)
})
export const currentLocale = language.locale
export const languagePending = language.pending
export const setLocale = language.setLocale

export function t(key, params = {}, fallback) {
  // Explicit fallbacks are only for local, not-yet-migrated configuration labels.
  const locale = currentLocale.value
  if (!i18n.global.te(key, locale) && !i18n.global.te(key, DEFAULT_LOCALE)) return fallback ?? key
  return i18n.global.t(key, params)
}

export function useAppI18n() {
  return { t, locale: currentLocale, pending: languagePending, setLocale }
}

export async function setupI18n(app) {
  try {
    await language.initialize()
  } catch (error) {
    // Even failure of initialize's fallback must not prevent the app from mounting.
    console.warn('[i18n] Initialization failed; using built-in Simplified Chinese.', error)
    i18n.global.setLocaleMessage(DEFAULT_LOCALE, zhCN)
    i18n.global.locale.value = DEFAULT_LOCALE
    globalThis.document?.documentElement.setAttribute('lang', DEFAULT_LOCALE)
  }
  app.use(i18n)
  globalThis.window?.addEventListener('storage', language.handleStorage)
  if (import.meta.hot) {
    import.meta.hot.dispose(() =>
      globalThis.window?.removeEventListener('storage', language.handleStorage)
    )
  }
}
