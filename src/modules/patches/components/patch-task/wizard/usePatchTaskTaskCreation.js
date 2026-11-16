import { t } from '@/core/i18n'
import { patchInstallApi } from '../../../api'
import { createPatchTaskError } from '../../../utils/patchTaskFeedback'

function getPatchStatusIds(patches) {
  return patches.flatMap(patch => {
    const rawValue =
      patch?.patch_status_id ||
      patch?.patchStatusId ||
      patch?.patch_status_ids ||
      patch?.patchStatusIds ||
      patch?.id

    if (Array.isArray(rawValue)) {
      return rawValue.filter(Boolean)
    }

    return rawValue ? [rawValue] : []
  })
}

function getTaskPackages(props) {
  if (props.taskPackages.length > 0) {
    return props.taskPackages.filter(Boolean)
  }

  return props.patchesToInstall.flatMap(patch => {
    const rawValue = patch?.packages || patch?.packageEntry || patch?.packageEntries || []

    if (Array.isArray(rawValue)) {
      return rawValue.filter(Boolean)
    }

    return rawValue ? [rawValue] : []
  })
}

export function usePatchTaskTaskCreation({
  props,
  confirmedHosts,
  isRollbackTask,
  isPackageTask,
  isVulnerabilityTask,
  createdTaskId,
  taskDetailData,
  installConfig,
  backendRestartReason,
  resolveApiErrorMessage
}) {
  function buildTaskRequestPayload() {
    return {
      hostIds: confirmedHosts.value.map(host => host.hostId || host.id).filter(Boolean),
      patchIds: props.patchesToInstall.map(patch => patch.patch_id).filter(Boolean),
      patchStatusIds: getPatchStatusIds(props.patchesToInstall)
    }
  }

  async function createExecutionTask(isCurrent = () => true) {
    try {
      const requestPayload = buildTaskRequestPayload()
      const res = isRollbackTask.value
        ? await patchInstallApi.createRollbackTask({
            ...requestPayload,
            histUpdateIds: props.histUpdateIds
          })
        : isPackageTask.value
          ? await patchInstallApi.createPkgUpdateTask({
              hostIds: requestPayload.hostIds,
              packages: getTaskPackages(props)
            })
          : isVulnerabilityTask.value
            ? await patchInstallApi.createVulnFixTask({
                hostIds: requestPayload.hostIds,
                patchIds: requestPayload.patchIds,
                patchStatusIds: requestPayload.patchStatusIds
              })
            : await patchInstallApi.createTask({
                ...requestPayload,
                osType: 'linux'
              })

      if (!isCurrent()) return
      const data = res?.data || null
      const taskId = data?.id || ''
      if (!taskId) {
        throw createPatchTaskError('patches.linux.taskCreateFailed')
      }

      createdTaskId.value = taskId
      taskDetailData.value = data

      if (data.restartType && ['system', 'service', 'none'].includes(data.restartType)) {
        installConfig.restartPolicy = data.restartType
      }
      backendRestartReason.value = data.restartReason || ''
    } catch (error) {
      const failure = new Error(resolveApiErrorMessage(error, t('patches.linux.taskCreateFailed')))
      failure.localMessage = error.localMessage
      throw failure
    }
  }

  return {
    createExecutionTask
  }
}
