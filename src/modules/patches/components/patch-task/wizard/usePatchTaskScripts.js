import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../../../api'

export function usePatchTaskScripts({ installConfig, createdTaskId, invalidatePreparedTask }) {
  const preScriptUploadRef = ref(null)
  const postScriptUploadRef = ref(null)
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
    return type === 'pre' ? '预执行脚本' : '校验脚本'
  }

  function triggerScriptUpload(type) {
    const inputRef = type === 'pre' ? preScriptUploadRef.value : postScriptUploadRef.value
    inputRef?.click()
  }

  async function uploadScriptToTask(type, file, silent = false) {
    if (!createdTaskId.value || !file) return true
    try {
      await patchInstallApi.uploadScript(createdTaskId.value, getScriptType(type), file)
      if (!silent) {
        ElMessage.success(`${getScriptLabel(type)}已上传`)
      }
      return true
    } catch {
      ElMessage.error(`${getScriptLabel(type)}上传失败`)
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
      ElMessage.error(`${getScriptLabel(type)}保存失败`)
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
      ElMessage.error('脚本读取失败，请检查文件内容后重试')
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
    postScriptUploadRef,
    preScriptUploadRef,
    resetScriptState,
    scriptFiles,
    scriptModes,
    syncScriptConfig,
    triggerScriptUpload
  }
}
