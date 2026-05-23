import { computed, reactive, ref, watch } from 'vue'
import { getRestartLabel, normalizeRestartType } from './patchTaskWizardUtils'

export function usePatchTaskRestartAdvice({ props, affectedPackages, createdTaskId, installConfig, isSkipped }) {
  const restartAdviceSource = ref('local')
  const restartAdviceCacheKey = ref('')
  const backendRestartReason = ref('')
  const restartOptions = reactive({
    restartType: 'none',
    restartRequired: false,
    restartLabel: '',
    restartDescription: '',
    restartReason: ''
  })

  const smartRestartType = computed(() => {
    const patches = props.patchesToInstall
    let needsSystem = false
    let needsService = false

    for (const patch of patches) {
      const id = patch.patch_id?.toLowerCase() || ''
      if (
        patch.rebootStatus === 'system' ||
        patch.isKernel === 'is_kernel' ||
        id.includes('kernel')
      ) {
        needsSystem = true
      } else if (patch.rebootStatus === 'service') {
        needsService = true
      }
    }

    const pkgs = affectedPackages.value.join(' ').toLowerCase()
    if (pkgs.includes('kernel')) {
      needsSystem = true
    }

    if (needsSystem) return 'system'
    if (needsService || pkgs.includes('glibc') || pkgs.includes('openssl')) return 'service'
    return 'none'
  })

  watch(
    smartRestartType,
    type => {
      if (!createdTaskId.value && restartAdviceSource.value === 'local') {
        installConfig.restartPolicy = type
      }
    },
    { immediate: true }
  )

  const requiresRestartConfirm = computed(
    () => restartOptions.restartRequired || installConfig.restartPolicy !== 'none'
  )
  const restartConfirmSubmitText = '确认重启'
  const restartConfirmKeyword = computed(() => {
    if (installConfig.restartPolicy === 'system') return '确认系统重启'
    if (installConfig.restartPolicy === 'service') return '确认服务重启'
    return '确认重启'
  })
  const restartAdviceTitle = computed(() => {
    if (restartOptions.restartLabel) return restartOptions.restartLabel
    if (installConfig.restartPolicy === 'system') return '系统重启建议'
    if (installConfig.restartPolicy === 'service') return '服务重启建议'
    return '重启建议'
  })
  const packageBasedRestartAdvice = computed(() => {
    const restartType = normalizeRestartType(restartOptions.restartType || installConfig.restartPolicy)
    if (restartType === 'none') return ''

    const packageNames = Array.from(new Set(affectedPackages.value.filter(Boolean)))
    
    let packageDescription = '软件包更新'
    if (packageNames.length > 0) {
      if (packageNames.length > 10) {
        const preview = packageNames.slice(0, 10).join('、')
        packageDescription = `软件包更新（${preview} 等共 ${packageNames.length} 个）`
      } else {
        packageDescription = `软件包更新（${packageNames.join('、')}）`
      }
    }

    return `${packageDescription}，建议${getRestartLabel(restartType)}。`
  })
  const smartRestartGuess = computed(() => {
    if (smartRestartType.value === 'system') {
      return '检测到内核相关补丁或关键系统组件更新，建议执行系统重启。'
    }
    if (smartRestartType.value === 'service') {
      return '检测到服务级补丁或基础库更新，建议执行服务重启。'
    }
    return '当前补丁预计无需重启，可直接继续后续流程。'
  })
  const restartAdviceDescription = computed(() => {
    if (packageBasedRestartAdvice.value) {
      return packageBasedRestartAdvice.value
    }

    return (
      restartOptions.restartDescription ||
      restartOptions.restartReason ||
      backendRestartReason.value ||
      smartRestartGuess.value
    )
  })
  const restartStrategySummary = computed(() => {
    if (isSkipped.restart) return '已跳过重启'
    if (installConfig.restartPolicy === 'system') return '系统重启'
    if (installConfig.restartPolicy === 'service') return '服务重启'
    return '不重启'
  })

  function resetRestartOptions() {
    restartAdviceSource.value = 'local'
    restartAdviceCacheKey.value = ''
    restartOptions.restartType = 'none'
    restartOptions.restartRequired = false
    restartOptions.restartLabel = ''
    restartOptions.restartDescription = ''
    restartOptions.restartReason = ''
    backendRestartReason.value = ''
  }

  function applyLocalRestartAdvice(message = '') {
    restartAdviceSource.value = 'local'
    installConfig.restartPolicy = smartRestartType.value

    if (!message) {
      return
    }

    const description = `${message} ${smartRestartGuess.value}`.trim()
    restartOptions.restartType = smartRestartType.value
    restartOptions.restartRequired = smartRestartType.value !== 'none'
    restartOptions.restartLabel = ''
    restartOptions.restartDescription = description
    restartOptions.restartReason = description
  }

  return {
    applyLocalRestartAdvice,
    backendRestartReason,
    requiresRestartConfirm,
    resetRestartOptions,
    restartAdviceCacheKey,
    restartAdviceDescription,
    restartAdviceSource,
    restartAdviceTitle,
    restartConfirmKeyword,
    restartConfirmSubmitText,
    restartOptions,
    restartStrategySummary,
    smartRestartGuess,
    smartRestartType
  }
}
