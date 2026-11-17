import { reactive, watch } from 'vue'
import { currentLocale, getBackendLanguage } from '@/core/i18n'
import { patchChangeControlApi } from '../api'

const dictionaries = reactive(new Map())
const pending = new Map()

function load(lang) {
  if (dictionaries.has(lang) || pending.has(lang)) return
  const request = Promise.resolve()
    .then(() => patchChangeControlApi.getMessages(lang))
    .then(({ data }) => {
      if (data?.messages) dictionaries.set(lang, data.messages)
    })
    .catch(() => {
      // The frontend messages and backend display text remain usable on older deployments.
    })
    .finally(() => pending.delete(lang))
  pending.set(lang, request)
}

export function useSecopsMessages({ auditActions = false } = {}) {
  watch(currentLocale, locale => {
    load(getBackendLanguage(locale))
    if (auditActions) load('zh-CN')
  }, { immediate: true })
}

export function secopsText(key, fallback, params = {}) {
  const template = dictionaries.get(getBackendLanguage())?.[key]
  return typeof template === 'string'
    ? template.replace(/\{([\w.]+)\}/g, (placeholder, name) => params[name] ?? placeholder)
    : fallback
}

export function secopsAuditAction(action, fallback = action) {
  const chinese = dictionaries.get('zh-CN')
  const key = chinese && Object.keys(chinese).find(
    key => /^(secops|platform)\.audit_action\./.test(key) && chinese[key] === action
  )
  return key ? secopsText(key, fallback) : fallback
}

export function secopsLogMessage(key, params) {
  return /^(app_secops\.log\.|secops\.host\.reboot_)/.test(key) ? secopsText(key, '', params) : ''
}
