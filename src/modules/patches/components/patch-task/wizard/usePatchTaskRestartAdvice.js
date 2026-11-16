import { t } from '@/core/i18n'
import { message as localMessage, messageRef } from '@/core/i18n/feedback'
import { computed, reactive, ref, watch } from 'vue'
import { getRestartLabel, normalizeRestartType } from './patchTaskWizardUtils'

export function usePatchTaskRestartAdvice({
  props,
  affectedPackages,
  createdTaskId,
  installConfig,
  isSkipped,
  restartConfirmText
}) {
  const localFallbackReason = messageRef('')
  const restartAdviceSource = ref('local')
  const restartAdviceCacheKey = ref('')
  const backendRestartReason = ref('')
  const restartOptions = reactive({
    restartType: 'none',
    restartRequired: false,
    restartLabel: messageRef(''),
    restartDescription: messageRef(''),
    restartReason: messageRef('')
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
  // The backend confirmation token is a protocol value and stays unchanged.
  const restartConfirmSubmitText = '确认重启'
  const restartConfirmKeyword = computed(() => {
    if (installConfig.restartPolicy === 'system') return t('patches.linux.confirmSystemRestart')
    if (installConfig.restartPolicy === 'service') return t('patches.linux.confirmServiceRestart')
    return t('patches.linux.confirmRestart')
  })
  const shownKeywords = new Map()
  watch(restartConfirmKeyword, keyword => {
    const policy = installConfig.restartPolicy
    if (!shownKeywords.has(policy)) shownKeywords.set(policy, new Set())
    shownKeywords.get(policy).add(keyword)
  }, { immediate: true, flush: 'sync' })
  const restartConfirmationValid = computed(() =>
    restartConfirmText?.value === restartConfirmKeyword.value ||
    Boolean(shownKeywords.get(installConfig.restartPolicy)?.has(restartConfirmText?.value))
  )
  const restartAdviceTitle = computed(() => {
    if (restartOptions.restartLabel) return restartOptions.restartLabel
    if (installConfig.restartPolicy === 'system') return t('patches.linux.systemRestartAdvice')
    if (installConfig.restartPolicy === 'service') return t('patches.linux.serviceRestartAdvice')
    return t('patches.linux.restartAdvice')
  })
  const packageBasedRestartAdvice = computed(() => {
    const restartType = normalizeRestartType(
      restartOptions.restartType || installConfig.restartPolicy
    )
    if (restartType === 'none') return ''

    const packageNames = Array.from(new Set(affectedPackages.value.filter(Boolean)))

    let packageDescription = t('patches.linux.packageUpdate')
    if (packageNames.length > 0) {
      if (packageNames.length > 10) {
        const preview = packageNames.slice(0, 10).join(t('common.listSeparator'))
        packageDescription = t('patches.linux.packageUpdatePreview', { names: preview, count: packageNames.length })
      } else {
        packageDescription = t('patches.linux.packageUpdateNames', { names: packageNames.join(t('common.listSeparator')) })
      }
    }

    return t('patches.linux.packageRestartAdvice', { packages: packageDescription, restart: getRestartLabel(restartType) })
  })
  const smartRestartGuess = computed(() => {
    if (smartRestartType.value === 'system') {
      return t('patches.linux.systemRestartGuess')
    }
    if (smartRestartType.value === 'service') {
      return t('patches.linux.serviceRestartGuess')
    }
    return t('patches.linux.noRestartGuess')
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
    if (isSkipped.restart) return t('patches.linux.restartSkipped')
    if (installConfig.restartPolicy === 'system') return t('patches.linux.systemRestart')
    if (installConfig.restartPolicy === 'service') return t('patches.linux.serviceRestart')
    return t('patches.linux.doNotRestart')
  })

  function resetRestartOptions() {
    restartAdviceSource.value = 'local'
    localFallbackReason.value = ''
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

    localFallbackReason.value = message
    const description = localMessage('patches.linux.localRestartDescription', () => ({
      reason: localFallbackReason.value,
      advice: smartRestartGuess.value
    }))
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
    restartConfirmationValid,
    restartConfirmSubmitText,
    restartOptions,
    restartStrategySummary,
    smartRestartGuess,
    smartRestartType
  }
}
