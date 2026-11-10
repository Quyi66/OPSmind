<template>
  <AcmDeviceSelectorDialog
    v-model="visibleModel"
    ci-types="windows"
    :initial-selection="selection"
    :options="selectorOptions"
    title="选择设备 · Windows 补丁扫描"
    :confirm-text="submitButtonText"
    description="点击“提交扫描任务”后将立即扫描所选 Windows 主机，扫描结果可在主机列表中查看。"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleSubmit"
  />
  <ExecuteResultDialog
    v-if="resultVisible"
    v-model:visible="resultVisible"
    :run-id="currentRunId"
    job-title="Windows 补丁扫描"
  />
</template>

<script setup>
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
  label: '选择 Windows 主机'
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

const submitButtonText = computed(() => (submitting.value ? '提交中…' : '提交扫描任务'))

function resetForm() {
  selection.value = buildSelectorHostItems(props.preselectedHosts)
}

function resolveScanErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?._status ||
    error?.message ||
    '提交扫描任务失败'
  )
}

async function handleSubmit(nextSelection = selection.value) {
  if (submitting.value) return
  selection.value = nextSelection
  if (!hostIds.value.length) {
    ElMessage.warning('请先选择至少一台主机')
    return
  }

  submitting.value = true
  try {
    const response = await winPatchApi.createScanTask(hostIds.value)
    const payload = unwrapResponse(response)
    const scanResult = Array.isArray(payload) ? payload[0] : payload
    if (['FAILED', 'ERROR'].includes(scanResult?.status)) {
      throw new Error(scanResult.error || '提交扫描任务失败')
    }
    const runId = scanResult?.runId || scanResult?.run_id

    visibleModel.value = false
    emit('submitted', { ...(scanResult || {}), refreshOverview: true, openDetail: false })
    if (runId) {
      currentRunId.value = String(runId)
      trackScan(currentRunId.value)
      resultVisible.value = true
      ElMessage.success('扫描任务已提交，可在执行结果中查看进度；关闭窗口不会取消后台扫描')
    } else {
      ElMessage.success('扫描任务已提交，请稍后刷新主机列表查看结果')
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
