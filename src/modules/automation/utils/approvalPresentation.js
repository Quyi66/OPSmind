import { currentLocale, t } from '@/core/i18n'

export function formatApprovalDuration(value) {
  // Preserve the original Chinese display, including backend string formatting.
  if (currentLocale.value !== 'en-US') {
    return t('automation.approval.durationHours', { count: value })
  }
  const count =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN
  return Number.isFinite(count) && count >= 0
    ? t('automation.approval.durationHours', { count })
    : '-'
}
