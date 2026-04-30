import { computed } from 'vue'
import {
  getPatchTaskDisplayConfig,
  resolvePatchTaskDisplayType
} from '../../../constants/task-display'

export function usePatchTaskDisplay(props) {
  const displayOperationType = computed(() =>
    resolvePatchTaskDisplayType({ taskMode: props.taskMode, operationType: props.operationType })
  )

  const operationConfig = computed(() => getPatchTaskDisplayConfig(displayOperationType.value))

  const wizardDialogTitle = computed(() => operationConfig.value.dialogTitle)
  const selectionCardTitle = computed(() => operationConfig.value.selectionTitle)
  const executeStepTitle = computed(() => operationConfig.value.executeTitle)
  const selectionSummaryLabel = computed(() => operationConfig.value.selectionSummaryLabel)
  const packageSummaryLabel = computed(() => operationConfig.value.packageSummaryLabel)
  const packageCardTitle = computed(() => operationConfig.value.packageCardTitle)
  const hostCardTitle = computed(() => operationConfig.value.hostCardTitle)
  const pipelineSuccessDescription = computed(() => operationConfig.value.successDescription)
  const preScriptPlaceholder = computed(() => operationConfig.value.preScriptPlaceholder)
  const postScriptPlaceholder = computed(() => operationConfig.value.postScriptPlaceholder)

  const selectionDisplayItems = computed(() => {
    if (props.selectionSummaryItems.length > 0) {
      return props.selectionSummaryItems.map((item, index) => ({
        key: item.key || `${props.operationType}-${index}`,
        primary: item.primary || item.patch_id || item.patchId || '-',
        secondary: item.secondary || ''
      }))
    }

    return props.patchesToInstall.map((item, index) => ({
      key: item.patch_id || `${props.operationType}-${index}`,
      primary: item.patch_id || '-',
      secondary: item.patch_name || item.description || ''
    }))
  })

  return {
    displayOperationType,
    executeStepTitle,
    hostCardTitle,
    packageCardTitle,
    packageSummaryLabel,
    pipelineSuccessDescription,
    postScriptPlaceholder,
    preScriptPlaceholder,
    selectionCardTitle,
    selectionDisplayItems,
    selectionSummaryLabel,
    wizardDialogTitle
  }
}
