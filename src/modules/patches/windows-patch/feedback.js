import { t } from '@/core/i18n'
import { message } from '@/core/i18n/feedback'

function backendErrorText(error) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.response?.data?.msg
}

// Keep backend messages verbatim and retain local keys across asynchronous task steps.
export function createWinPatchError(error, key, params = {}) {
  const backendText = backendErrorText(error)
  if (backendText) return new Error(backendText)
  if (error?.localMessage || error?.message) return error
  return Object.assign(new Error(t(key, typeof params === 'function' ? params() : params)), {
    localMessage: message(key, params)
  })
}

export function getWinPatchErrorFeedback(error, fallback) {
  return backendErrorText(error) || error?.localMessage || error?.message || fallback
}

const runTitleKeys = {
  main: 'patches.windows.mainExecution',
  'pre-check': 'patches.windows.preCheckScript',
  PRE_CHECK: 'patches.linux.precheck',
  INSTALL: 'patches.windows.executeInstall',
  EXECUTE: 'patches.windows.executeInstall',
  ROLLBACK: 'patches.windows.executeRollback',
  RESTART: 'patches.linux.executeRestart',
  VALIDATE: 'patches.windows.executeValidation',
  validate: 'patches.linux.validationScript',
  verification: 'patches.windows.executeVerification'
}

export function getWinPatchRunTitle(key, fallback) {
  return runTitleKeys[key] ? message(runTitleKeys[key]) : fallback
}
