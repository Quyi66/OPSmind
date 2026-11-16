import { t } from '@/core/i18n'
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../../../api'

export function usePatchTaskScripts({ installConfig, createdTaskId, invalidatePreparedTask }) {
  const scriptUploadFiles = reactive({ pre: null, post: null })
  const scriptModes = reactive({
    pre: 'edit',
    post: 'edit'
  })
  const scriptFiles = reactive({
    pre: '',
    post: ''
  })

  function getScriptType(type) {
    return type === 'pre' ? 'pre-check' : 'validate'
  }

  function getScriptLabel(type) {
    return type === 'pre' ? t('patches.linux.preScript') : t('patches.linux.validationScript')
  }

  async function uploadScriptToTask(type, file, silent = false) {
    if (!createdTaskId.value || !file) return true
    try {
      await patchInstallApi.uploadScript(createdTaskId.value, getScriptType(type), file)
      if (!silent) {
        ElMessage.success(t('patches.linux.scriptUploaded', { script: getScriptLabel(type) }))
      }
      return true
    } catch {
      ElMessage.error(t('patches.linux.scriptUploadError', { script: getScriptLabel(type) }))
      return false
    }
  }

  async function syncScriptConfig(type) {
    if (!createdTaskId.value) return true

    if (scriptModes[type] === 'upload') {
      if (scriptUploadFiles[type]) {
        return uploadScriptToTask(type, scriptUploadFiles[type], true)
      }
      return true
    }

    try {
      const content = type === 'pre' ? installConfig.preScript : installConfig.postScript
      await patchInstallApi.updateScript(createdTaskId.value, getScriptType(type), content || '')
      return true
    } catch {
      ElMessage.error(t('patches.linux.scriptSaveError', { script: getScriptLabel(type) }))
      return false
    }
  }

  async function handleScriptUpload(type, event) {
    const file = event.target?.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      if (type === 'pre') {
        installConfig.preScript = content
        scriptFiles.pre = file.name
        scriptUploadFiles.pre = file
      } else {
        installConfig.postScript = content
        scriptFiles.post = file.name
        scriptUploadFiles.post = file
      }
    } catch {
      ElMessage.error(t('patches.linux.scriptReadFailed'))
    } finally {
      event.target.value = ''
    }
  }

  function resetScriptState() {
    installConfig.preScript = ''
    installConfig.postScript = ''
    scriptModes.pre = 'edit'
    scriptModes.post = 'edit'
    scriptFiles.pre = ''
    scriptFiles.post = ''
    scriptUploadFiles.pre = null
    scriptUploadFiles.post = null
  }

  watch(
    [
      () => installConfig.preScript,
      () => installConfig.postScript,
      () => scriptModes.pre,
      () => scriptModes.post
    ],
    () => {
      invalidatePreparedTask()
    }
  )

  return {
    handleScriptUpload,
    resetScriptState,
    scriptFiles,
    scriptModes,
    syncScriptConfig
  }
}
