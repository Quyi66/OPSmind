import { patchInstallApi } from '../../../api'
import {
  buildRestartAdviceDescription,
  formatHostDisplay,
  getRestartLabel,
  getRestartPriority,
  normalizeRestartType,
  resolveHostIp
} from './patchTaskWizardUtils'

function getSelectedPatchIds(props) {
  return Array.from(
    new Set(
      props.patchesToInstall.flatMap(patch =>
        String(patch?.patch_id || patch?.patchId || '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean)
      )
    )
  )
}

export function usePatchTaskBackendRestartAdvice({
  props,
  confirmedHosts,
  installConfig,
  restartOptions,
  restartAdviceSource,
  restartAdviceCacheKey,
  applyLocalRestartAdvice
}) {
  async function loadRestartAdviceByHostPatch(force = false) {
    const hostEntries = Array.from(
      new Map(
        confirmedHosts.value
          .map(host => {
            const hostIp = resolveHostIp(host)
            if (!hostIp) return null

            return [
              hostIp,
              {
                hostIp,
                hostLabel: formatHostDisplay(host)
              }
            ]
          })
          .filter(Boolean)
      ).values()
    )
    const patchIds = getSelectedPatchIds(props)

    if (hostEntries.length === 0 || patchIds.length === 0) {
      applyLocalRestartAdvice('未获取到完整的主机或补丁信息，已退回本地启发式建议。')
      return false
    }

    const queryKey = JSON.stringify({
      hostIps: hostEntries.map(item => item.hostIp).sort(),
      patchIds: [...patchIds].sort()
    })

    if (
      !force &&
      restartAdviceCacheKey.value === queryKey &&
      restartAdviceSource.value === 'backend'
    ) {
      return true
    }

    const cacheBuster = Date.now()
    const patchIdParam = patchIds.join(',')
    const queryTasks = hostEntries.map(host => ({
      hostIp: host.hostIp,
      hostLabel: host.hostLabel,
      request: patchInstallApi.getPatchRebootOnHost({
        patchId: patchIdParam,
        hostIp: host.hostIp,
        cacheBuster
      })
    }))

    const settledResults = await Promise.allSettled(queryTasks.map(item => item.request))
    const successfulResults = []
    let ignoredCount = 0
    let failedCount = 0

    settledResults.forEach((result, index) => {
      const task = queryTasks[index]

      if (result.status === 'fulfilled') {
        const data = result.value?.data || result.value
        successfulResults.push({
          hostIp: task.hostIp,
          hostLabel: task.hostLabel,
          rebootStatus: normalizeRestartType(data?.rebootStatus)
        })
        return
      }

      const statusCode =
        result.reason?.response?.status || result.reason?.status || result.reason?.code || 0

      if (Number(statusCode) === 404) {
        ignoredCount++
      } else {
        failedCount++
      }
    })

    if (successfulResults.length === 0) {
      applyLocalRestartAdvice('后端未返回可用的重启建议，已退回本地启发式建议。')
      restartAdviceCacheKey.value = ''
      return false
    }

    const hostAdviceMap = new Map()
    successfulResults.forEach(item => {
      const current = hostAdviceMap.get(item.hostIp) || {
        hostIp: item.hostIp,
        hostLabel: item.hostLabel,
        rebootStatus: 'none'
      }

      if (getRestartPriority(item.rebootStatus) > getRestartPriority(current.rebootStatus)) {
        current.rebootStatus = item.rebootStatus
      }

      hostAdviceMap.set(item.hostIp, current)
    })

    const hostAdviceList = Array.from(hostAdviceMap.values())
    const overallRestartType = hostAdviceList.reduce((current, item) => {
      return getRestartPriority(item.rebootStatus) > getRestartPriority(current)
        ? item.rebootStatus
        : current
    }, 'none')

    restartAdviceSource.value = 'backend'
    restartAdviceCacheKey.value = queryKey
    restartOptions.restartType = overallRestartType
    restartOptions.restartRequired = overallRestartType !== 'none'
    restartOptions.restartLabel = getRestartLabel(overallRestartType)
    restartOptions.restartDescription = buildRestartAdviceDescription(
      hostAdviceList,
      ignoredCount,
      failedCount
    )
    restartOptions.restartReason = restartOptions.restartDescription
    installConfig.restartPolicy = overallRestartType

    return true
  }

  return {
    loadRestartAdviceByHostPatch
  }
}
