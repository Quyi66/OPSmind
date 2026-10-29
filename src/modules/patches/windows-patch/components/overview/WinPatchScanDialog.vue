<template>
  <el-dialog
    v-model="visibleModel"
    title="创建扫描任务"
    width="760px"
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="win-patch-dialog-body">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="选择 Windows 主机并提交补丁扫描任务，扫描结果可在主机列表中查看。"
      />
      <el-form label-width="110px">
        <el-form-item label="选择主机" required>
          <AcmDeviceSelector
            v-model="selection"
            ci-types="windows"
            :options="selectorOptions"
            :disabled="submitting"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="capabilitySummary"
        :title="checkingCapability ? '正在校验 Agent 实时状态…' : capabilitySummary"
        :type="capabilityIssues.length ? 'warning' : 'info'"
        :closable="false"
        show-icon
      />
    </div>
    <template #footer>
      <el-button :disabled="submitting" @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="
          submitting || checkingCapability || capabilityIssues.length > 0 || hostIds.length === 0
        "
        @click="handleSubmit"
      >
        {{ submitButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'
import { winPatchApi } from '../../api'
import { buildSelectorHostItems, extractHostIds, unwrapResponse } from '../../utils'
import { getAgentHostId, validateAgentCapability } from '../../../utils/agentCapability'
import { useAgentCapabilitySelection } from '../../../composables/useAgentCapabilitySelection'

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

const emit = defineEmits(['update:modelValue', 'submitted'])

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  label: '选择 Windows 主机'
}

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const { startPolling, stopPolling } = useJobPolling()

const submitting = ref(false)
const selection = ref([])
let requestVersion = 0

const hostIds = computed(() => extractHostIds(selection.value))
const capabilityHosts = computed(() => {
  const originals = new Map(props.preselectedHosts.map(host => [getAgentHostId(host), host]))
  return selection.value.map(host => ({ ...originals.get(getAgentHostId(host)), ...host }))
})
const {
  checking: checkingCapability,
  issues: capabilityIssues,
  summary: capabilitySummary,
  refresh: refreshCapabilities
} = useAgentCapabilitySelection(capabilityHosts, 'scan', () => props.modelValue)

const submitButtonText = computed(() => (submitting.value ? '扫描中…' : '提交扫描任务'))

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

function finishScan(scanResult, { message, type = 'success' } = {}) {
  submitting.value = false
  if (message) {
    ElMessage[type](message)
  }
  visibleModel.value = false
  // 通知父页面刷新主机列表；刷新请求由父页面处理，不在此确认其结果。
  emit('submitted', { ...(scanResult || {}), refreshOverview: true })
}

async function handleSubmit() {
  if (submitting.value) return
  if (!hostIds.value.length) {
    ElMessage.warning('请先选择至少一台主机')
    return
  }

  const version = ++requestVersion
  const isCurrent = () => version === requestVersion && props.modelValue
  const finish = (result, options) => {
    if (isCurrent()) finishScan(result, options)
  }
  submitting.value = true
  try {
    const targets = await refreshCapabilities()
    if (!isCurrent() || !targets) return
    if (!validateAgentCapability(targets, 'scan')) {
      submitting.value = false
      return
    }
    const response = await winPatchApi.createScanTask(hostIds.value)
    if (!isCurrent()) return
    const scanResult = unwrapResponse(response)
    const runId = scanResult?.runId || scanResult?.run_id

    if (!runId) {
      // 没有 runId 时退回到「已提交」语义，直接刷新列表
      finish(scanResult, { message: '扫描任务已提交，请稍后刷新主机列表查看结果' })
      return
    }

    ElMessage.success('扫描任务已提交，正在采集补丁信息…')

    // 根据 runId 轮询作业结果，完成后刷新主机列表
    startPolling(runId, {
      interval: 5000,
      maxAttempts: 120,
      showMessage: false,
      onSuccess: () => finish(scanResult, { message: '扫描作业已完成，正在刷新主机列表' }),
      onError: res =>
        finish(scanResult, {
          message: res?.error || '扫描执行失败，请稍后查看结果',
          type: 'error'
        }),
      onTimeout: () =>
        finish(scanResult, {
          message: '扫描结果查询超时，请稍后刷新主机列表查看结果',
          type: 'warning'
        })
    })
  } catch (error) {
    if (!isCurrent()) return
    submitting.value = false
    console.error('提交扫描任务失败:', error)
    ElMessage.error(resolveScanErrorMessage(error))
  }
}

watch(
  () => props.modelValue,
  open => {
    requestVersion++
    stopPolling()
    submitting.value = false
    if (open) {
      resetForm()
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestVersion++
})
</script>

<style scoped lang="scss">
.win-patch-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
