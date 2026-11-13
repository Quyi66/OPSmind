import { t } from '@/core/i18n'

export const CONNECT_EXCEPTION_DEFAULT_CONDITION = 'sjxy_all'

export const CONNECT_EXCEPTION_CONDITION_OPTIONS = Object.freeze([
  { get label() { return t('asset.conditionToday') }, value: 'today' },
  { get label() { return t('asset.conditionRecentFailed') }, value: 'recently' },
  { get label() { return t('asset.conditionRecentOk') }, value: 'recently_ok' },
  { get label() { return t('asset.conditionLow') }, value: 'low' },
  { get label() { return t('asset.conditionAll') }, value: CONNECT_EXCEPTION_DEFAULT_CONDITION }
])

const SELECTABLE_CONNECT_EXCEPTION_CONDITIONS = new Set(
  CONNECT_EXCEPTION_CONDITION_OPTIONS.map(item => item.value)
)

/**
 * 接口将 oplus_all、空值及其他任意值都视为“全部异常设备”。
 * 页面统一使用接口默认值 sjxy_all，确保筛选框可以正确回显。
 */
export const normalizeConnectExceptionCondition = value => {
  if (typeof value === 'string' && SELECTABLE_CONNECT_EXCEPTION_CONDITIONS.has(value)) {
    return value
  }
  return CONNECT_EXCEPTION_DEFAULT_CONDITION
}
