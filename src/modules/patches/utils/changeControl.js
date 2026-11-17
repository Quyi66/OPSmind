import { ElMessageBox } from 'element-plus'
import { t } from '@/core/i18n'

export const NON_WINDOW_CONFIRM_REQUIRED = 'NON_WINDOW_CONFIRM_REQUIRED'
export const isChangeControlCancelled = error => error?.changeControlCancelled === true

export function apiErrorText(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback
}

// The backend interprets unzoned date strings in Asia/Shanghai.
export function changeControlTimestamp(value) {
  if (value == null || value === '') return undefined
  if (typeof value === 'number') return value
  if (/^\d{13}$/.test(value)) return Number(value)
  const text = String(value).replace(' ', 'T')
  return Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? `${text}+08:00`
    : text)
}

export function implementationPlan(draft = {}) {
  const planStartTime = changeControlTimestamp(draft.planStartTime)
  const planEndTime = changeControlTimestamp(draft.planEndTime)
  if (
    (planStartTime !== undefined && !Number.isFinite(planStartTime)) ||
    (planEndTime !== undefined && !Number.isFinite(planEndTime)) ||
    (planEndTime !== undefined && planStartTime !== undefined && planEndTime <= planStartTime)
  ) throw new Error(t('patches.changeControl.invalidPlan'))
  const applyReason = draft.applyReason?.trim()
  return {
    ...(planStartTime !== undefined && { planStartTime }),
    ...(planEndTime !== undefined && { planEndTime }),
    ...(applyReason && { applyReason })
  }
}

function cancelled() {
  return Object.assign(new Error(t('patches.changeControl.confirmationCancelled')), {
    changeControlCancelled: true
  })
}

export async function requestConfirmationPhrase(
  { confirmText, message },
  title = t('patches.changeControl.confirmTitle')
) {
  if (!confirmText) throw new Error(message || t('patches.changeControl.checkFailed'))
  try {
    const { value } = await ElMessageBox.prompt(
      message || confirmText,
      title,
      {
        confirmButtonText: t('patches.linux.confirmSubmit'),
        cancelButtonText: t('common.cancel'),
        closeOnClickModal: false,
        inputPlaceholder: confirmText,
        inputValidator: value => String(value || '').toUpperCase() === confirmText.toUpperCase() ||
          t('patches.changeControl.confirmMismatch')
      }
    )
    return value
  } catch (error) {
    if (error === 'cancel' || error === 'close') throw cancelled()
    throw error
  }
}

export async function submitWithWindowConfirmation(send, payload, { check, isCurrent = () => true } = {}) {
  let request = payload
  if (check) {
    const result = await check()
    if (!isCurrent()) throw cancelled()
    if (result && !['PASS', 'CONFIRM', 'REJECT'].includes(result.decision)) {
      throw new Error(result.message || t('patches.changeControl.checkFailed'))
    }
    if (result?.decision === 'REJECT') throw new Error(result.message || t('patches.changeControl.rejected'))
    if (result?.decision === 'CONFIRM' || result?.needConfirm) {
      request = { ...request, nonWindowConfirmText: await requestConfirmationPhrase(result) }
    }
  }
  if (!isCurrent()) throw cancelled()
  try {
    return await send(request)
  } catch (error) {
    const data = error?.response?.data
    if (data?.code !== NON_WINDOW_CONFIRM_REQUIRED || !isCurrent()) throw error
    const nonWindowConfirmText = await requestConfirmationPhrase({
      confirmText: data.confirmText || data.windowCheck?.confirmText,
      message: data.error || data.windowCheck?.message
    })
    if (!isCurrent()) throw cancelled()
    return send({ ...payload, nonWindowConfirmText })
  }
}
