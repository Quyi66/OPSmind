import { t } from '@/core/i18n'

// API enrichment fields and backend status codes remain untouched. Translate
// their known presentation at render time so an open selector does not reload.
export function getFileStatusText(file, stage = false) {
  if (stage || file.repoType === 'STAGE') {
    const status = file._stageStatus || (file.repoType === 'STAGE' ? file.onlineStatus : '') || ''
    if (status === 'REJECTED') return t('automation.file.rejected')
    if (status === '' || status === 'NULL') return t('automation.file.pendingReview')
    return file._stageStatusText || status
  }
  if (file.onlineStatus === 'PUBLISHED') return t('automation.file.published')
  if (file.onlineStatus === 'DISABLED') return t('automation.file.disabled')
  return file._statusText || file.onlineStatus || ''
}
