import { t } from '@/core/i18n'
import { message } from '@/core/i18n/feedback'

// Keep the Error contract for execution code and the local message for persistent UI feedback.
export function createPatchTaskError(key, params = {}) {
  return Object.assign(new Error(t(key, params)), { localMessage: message(key, params) })
}
