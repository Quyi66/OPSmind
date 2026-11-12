import { readonly, ref } from 'vue'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  resolveInitialLocale
} from './locales'

// Keep loading separate from committing the locale. An older request must never win a race.
export function createLocaleController({
  locale,
  load,
  storage,
  languages = [],
  apply = () => {}
}) {
  const pending = ref(false)
  let requestVersion = 0
  function readPreference() {
    try {
      return storage?.getItem(LOCALE_STORAGE_KEY)
    } catch {
      return null
    }
  }
  async function setLocale(value, { persist = true } = {}) {
    const next = normalizeLocale(value)
    if (!next) throw new RangeError(`Unsupported locale: ${value}`)
    const version = ++requestVersion
    pending.value = true
    try {
      await load(next)
      if (version !== requestVersion) return false
      locale.value = next
      apply(next)
      if (persist) {
        try {
          storage?.setItem(LOCALE_STORAGE_KEY, next)
        } catch {
          // Private browsing and storage quotas must not prevent a local language switch.
        }
      }
      return true
    } finally {
      if (version === requestVersion) pending.value = false
    }
  }
  async function initialize() {
    const initial = resolveInitialLocale(readPreference(), languages)
    try {
      await setLocale(initial, { persist: false })
    } catch (error) {
      console.warn('Unable to load preferred language; using Simplified Chinese.', error)
      await setLocale(DEFAULT_LOCALE, { persist: false })
    }
  }
  function handleStorage(event) {
    if (event.key !== LOCALE_STORAGE_KEY && event.key !== null) return
    if (event.storageArea && storage && event.storageArea !== storage) return
    const next = resolveInitialLocale(event.newValue, languages)
    return setLocale(next, { persist: false }).catch(error => {
      console.warn('Unable to synchronize language.', error)
    })
  }
  return {
    locale: readonly(locale),
    pending: readonly(pending),
    setLocale,
    initialize,
    handleStorage
  }
}
