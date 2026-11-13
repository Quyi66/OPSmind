// 展示层规范：不改写接口原值，未知数据与真实的 0 分开处理。
import { currentLocale, t } from '@/core/i18n'

export function toKnownNumber(value, { max = Infinity, integer = false } = {}) {
  if (value == null || typeof value === 'boolean' || String(value).trim() === '') return null
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const number = Number(value)
  return Number.isFinite(number) &&
    number >= 0 &&
    number <= max &&
    (!integer || Number.isInteger(number))
    ? number
    : null
}

export function formatKnownCount(value) {
  const number = toKnownNumber(value, { integer: true })
  return number === null ? t('common.pendingConfirmation') : number.toLocaleString(currentLocale.value)
}

export function formatCvssScore(value) {
  const number = toKnownNumber(value, { max: 10 })
  return number === null ? t('common.unscored') : number.toFixed(1)
}

export function getAssetDisplayName(asset = {}) {
  const validText = value => {
    const text = String(value ?? '').trim()
    return text && !/^(n\/a|null|undefined|unknown|-)$/i.test(text) ? text : ''
  }
  return (
    validText(asset.hostname) ||
    validText(asset.HOSTNAME) ||
    validText(asset.IP) ||
    validText(asset.host_key) ||
    t('common.unnamedDevice')
  )
}
