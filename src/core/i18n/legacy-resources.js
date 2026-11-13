import { shallowRef, watch } from 'vue'
import { currentLocale, i18n, t } from './index'

const aliases = {
  'common.action.save': 'common.save',
  'common.action.cancel': 'common.cancel',
  'common.action.confirm': 'common.confirm',
  'common.action.close': 'common.close',
  'common.action.delete': 'common.delete',
  'common.entity.action.edit': 'common.edit',
  'common.entity.action.delete': 'common.delete',
  'common.entity.action.view': 'common.view',
  'common.entity.action.copy': 'common.copy',
  'jao.title': 'automation.legacy.jobTitle',
  'acm.title': 'navigation.groups.asset-management',
  'app_pms.title': 'navigation.modules.password',
  'app_spm.title': 'navigation.modules.yum-repo',
  'app_uim.name': 'navigation.modules.uam',
  'cac.index.square': 'navigation.groups.system-inspection',
  'flow.index.list': 'navigation.pages.flow.list'
}

const MODULES = [
  'acm',
  'adm',
  'app',
  'app_pms',
  'app_spm',
  'app_sudo',
  'app_uim',
  'app_vap',
  'app_vcm',
  'cac',
  'cmd',
  'common',
  'dts',
  'flow',
  'gfs',
  'jao',
  'ssc',
  'udp',
  'global'
]
const resources = shallowRef({})
const customResources = shallowRef({})
const requests = new Map()
let stopWatchingLocale

export function flattenTranslations(data, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(data || {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') result[path] = value
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenTranslations(value, path, result)
    }
  }
  return result
}

export async function loadTranslations() {
  if (!stopWatchingLocale) {
    // Retry only failed modules after an effective language change, without blocking the switch.
    stopWatchingLocale = watch(currentLocale, () => {
      void loadTranslations()
    })
  }
  await Promise.all(
    MODULES.map(module => {
      if (!requests.has(module)) {
        const base = import.meta.env.BASE_URL || '/'
        const url = `${base}i18n/zh-cn/${module}.json`
        const request = (async () => {
          const response = await globalThis.fetch(url)
          if (!response.ok) throw new Error(`Unable to load legacy translations: ${module}`)
          const messages = flattenTranslations(await response.json())
          resources.value = { ...resources.value, ...messages }
        })().catch(error => {
          // Failed modules remain retryable. Successful modules are retained.
          requests.delete(module)
          console.warn('[i18n] Unable to load legacy translations:', { module, url }, error)
        })
        requests.set(module, request)
      }
      return requests.get(module)
    })
  )
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => stopWatchingLocale?.())
}

export function getLegacyTranslation(key) {
  const locale = currentLocale.value
  const custom = customResources.value[locale]
  if (typeof custom?.[key] === 'string') return custom[key]
  const messages = i18n.global.getLocaleMessage(locale).legacy
  if (typeof messages?.[key] === 'string') return messages[key]
  if (Object.hasOwn(aliases, key)) return t(aliases[key])
  const fallback = customResources.value['zh-CN']
  if (typeof fallback?.[key] === 'string') return fallback[key]
  return typeof resources.value[key] === 'string' ? resources.value[key] : undefined
}

export function addLegacyTranslations(translations, locale = currentLocale.value) {
  customResources.value = {
    ...customResources.value,
    [locale]: { ...customResources.value[locale], ...flattenTranslations(translations) }
  }
}
