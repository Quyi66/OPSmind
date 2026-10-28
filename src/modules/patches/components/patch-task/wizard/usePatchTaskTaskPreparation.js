import { patchInstallApi } from '../../../api'

export function usePatchTaskTaskPreparation({
  props,
  createdTaskId,
  isRollbackTask,
  installConfig,
  restartOptions,
  restartAdviceSource,
  backendRestartReason,
  affectedPackages
}) {
  async function loadRestartOptions(isCurrent = () => true) {
    if (!createdTaskId.value) return
    try {
      const res = await patchInstallApi.getRestartOptions(createdTaskId.value)
      if (!isCurrent()) return
      const data = res?.data || {}
      restartAdviceSource.value = 'task'
      restartOptions.restartType = data.restartType || installConfig.restartPolicy || 'none'
      restartOptions.restartRequired = Boolean(data.restartRequired)
      restartOptions.restartLabel = data.restartLabel || ''
      restartOptions.restartDescription = data.restartReason || ''
      restartOptions.restartReason = data.restartReason || ''
      if (['system', 'service', 'none'].includes(restartOptions.restartType)) {
        installConfig.restartPolicy = restartOptions.restartType
      }
      backendRestartReason.value = restartOptions.restartReason || backendRestartReason.value
    } catch {
      if (!isCurrent()) return
      restartOptions.restartType = installConfig.restartPolicy || 'none'
      restartOptions.restartRequired = restartOptions.restartType !== 'none'
      restartOptions.restartReason = backendRestartReason.value
    }
  }

  async function loadRollbackInfo(isCurrent = () => true) {
    if (!createdTaskId.value || !isRollbackTask.value) return

    try {
      const res = await patchInstallApi.getRollbackInfo(createdTaskId.value)
      if (!isCurrent()) return
      const data = res?.data || {}

      if (
        Array.isArray(data.patchPkgs) &&
        data.patchPkgs.length &&
        props.packageCandidates.length === 0
      ) {
        affectedPackages.value = data.patchPkgs
      }

      if (['system', 'service', 'none'].includes(data.restartType)) {
        installConfig.restartPolicy = data.restartType
        restartOptions.restartType = data.restartType
        restartOptions.restartRequired = data.restartType !== 'none'
      }

      if (data.restartReason) {
        restartOptions.restartReason = data.restartReason
      }

      if (data.kernelWarning) {
        restartOptions.restartDescription = data.kernelWarning
        backendRestartReason.value = data.kernelWarning
      }
    } catch {
      // 忽略回滚信息接口失败，保持现有任务默认值
    }
  }

  return {
    loadRestartOptions,
    loadRollbackInfo
  }
}
