<template>
  <AcmDeviceSelectorDialog
    v-model="visibleModel"
    ci-types="windows"
    :initial-selection="selection"
    :options="selectorOptions"
    :title="t('patches.windows.selectScanDevices')"
    :confirm-text="submitButtonText"
    :description="t('patches.windows.scanSelectionHint')"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleSubmit"
  />
  <ExecuteResultDialog
    v-if="resultVisible"
    v-model:visible="resultVisible"
    :run-id="currentRunId"
    :job-title="t('patches.windows.windowsScan')"
  />
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { usePatchScanCompletion } from '@/modules/patches/composables/usePatchScanCompletion'
import { winPatchApi } from '../../api'
import { buildSelectorHostItems, extractHostIds, unwrapResponse } from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  preselectedHosts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submitted', 'completed'])

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  get label() { return t('patches.windows.selectWindowsHosts') }
}

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// 选择器只等待提交响应，后台扫描完成后由独立观察器刷新列表。
const { trackScan } = usePatchScanCompletion(() => emit('completed'))
const resultVisible = ref(false)
const currentRunId = ref('')

const submitting = ref(false)
const selection = ref([])

const hostIds = computed(() => extractHostIds(selection.value))

const submitButtonText = computed(() => (submitting.value ? t('patches.windows.submitting') : t('patches.windows.submitScan')))

function resetForm() {
  selection.value = buildSelectorHostItems(props.preselectedHosts)
}

function resolveScanErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?._status ||
    error?.message ||
    t('patches.windows.submitScanFailed')
  )
}

async function handleSubmit(nextSelection = selection.value) {
  if (submitting.value) return
  selection.value = nextSelection
  if (!hostIds.value.length) {
    ElMessage.warning(t('patches.windows.selectHostFirst'))
    return
  }

  submitting.value = true
  try {
    const response = await winPatchApi.createScanTask(hostIds.value)
    const payload = unwrapResponse(response)
    const scanResult = Array.isArray(payload) ? payload[0] : payload
    if (['FAILED', 'ERROR'].includes(scanResult?.status)) {
      throw new Error(scanResult.error || t('patches.windows.submitScanFailed'))
    }
    const runId = scanResult?.runId || scanResult?.run_id

    visibleModel.value = false
    emit('submitted', { ...(scanResult || {}), refreshOverview: true, openDetail: false })
    if (runId) {
      currentRunId.value = String(runId)
      trackScan(currentRunId.value)
      resultVisible.value = true
      ElMessage.success(t('patches.windows.scanSubmittedProgress'))
    } else {
      ElMessage.success(t('patches.windows.scanSubmittedRefresh'))
    }
  } catch (error) {
    console.error('提交扫描任务失败:', error)
    ElMessage.error(resolveScanErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      resetForm()
    }
  },
  { immediate: true }
)
</script>
