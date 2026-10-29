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
        v-if="capabilityError || capabilityIssues.length"
        :type="capabilityError ? 'error' : 'warning'"
        :title="capabilityError || capabilitySummary"
        :closable="false"
        show-icon
      />
    </div>
    <template #footer>
      <el-button :disabled="submitting" @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="submitting || checking || !hostIds.length || !!capabilityIssues.length"
        @click="handleSubmit"
      >
        {{ submitting ? '扫描中…' : '提交扫描任务' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'
import { getAgentErrorMessage } from '@/modules/asset/utils/agentErrors'
import { scanPatchHosts } from '../../../api/scan'
import {
  formatAgentCapabilitySummary,
  getAgentCapabilityIssues,
  resolveAgentCapabilityHosts
} from '../../../utils/agentCapability'
import { buildSelectorHostItems, extractHostIds } from '../../utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  preselectedHosts: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'submitted'])
const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  label: '选择 Windows 主机'
}
const { startPolling, stopPolling } = useJobPolling()
const selection = ref([])
const resolvedHosts = ref([])
const submitting = ref(false)
const checking = ref(false)
const capabilityError = ref('')
const hostIds = computed(() => extractHostIds(selection.value))
const capabilityIssues = computed(() => getAgentCapabilityIssues(resolvedHosts.value, 'scan'))
const capabilitySummary = computed(() =>
  formatAgentCapabilitySummary(resolvedHosts.value, capabilityIssues.value)
)
let sessionId = 0
let selectionRequestId = 0

async function checkSelection() {
  const session = sessionId
  const requestId = ++selectionRequestId
  checking.value = true
  capabilityError.value = ''
  try {
    const hosts = selection.value.length ? await resolveAgentCapabilityHosts(selection.value) : []
    if (session !== sessionId || requestId !== selectionRequestId) return false
    resolvedHosts.value = hosts
    return true
  } catch (error) {
    if (session === sessionId && requestId === selectionRequestId) {
      resolvedHosts.value = selection.value.map(host => ({ ...host, agentInfoUnavailable: true }))
      capabilityError.value = getAgentErrorMessage(error, '无法确认目标主机的 Agent 状态')
    }
    return false
  } finally {
    if (session === sessionId && requestId === selectionRequestId) checking.value = false
  }
}

function finishScan(scanResult, { message, type = 'success' }) {
  submitting.value = false
  ElMessage[type](message)
  visibleModel.value = false
  emit('submitted', { ...scanResult, refreshOverview: true })
}

async function handleSubmit() {
  if (submitting.value || !hostIds.value.length) return
  const session = sessionId
  const isCurrent = () => session === sessionId && props.modelValue
  const finish = (result, options) => {
    if (isCurrent()) finishScan(result, options)
  }
  submitting.value = true
  try {
    const checked = await checkSelection()
    if (!isCurrent()) return
    if (!checked || capabilityIssues.value.length) {
      submitting.value = false
      return
    }
    const scanResult = await scanPatchHosts(extractHostIds(resolvedHosts.value))
    if (!isCurrent()) return
    const runId = scanResult?.windowsRunId || scanResult?.runId || scanResult?.run_id
    if (!runId) {
      finish(scanResult, { message: '扫描任务已提交，请稍后刷新主机列表查看结果' })
      return
    }
    ElMessage.success('扫描任务已提交，正在采集补丁信息…')
    startPolling(runId, {
      interval: 5000,
      maxAttempts: 120,
      showMessage: false,
      onSuccess: () => finish(scanResult, { message: '扫描作业已完成，正在刷新主机列表' }),
      onError: result =>
        finish(scanResult, {
          message: result?.error || getAgentErrorMessage(result, '扫描执行失败，请稍后查看结果'),
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
    ElMessage.error(getAgentErrorMessage(error, '提交扫描任务失败'))
  }
}

watch(selection, checkSelection, { deep: true })
watch(
  () => props.modelValue,
  open => {
    sessionId++
    selectionRequestId++
    stopPolling()
    submitting.value = false
    checking.value = false
    capabilityError.value = ''
    resolvedHosts.value = []
    if (open) selection.value = buildSelectorHostItems(props.preselectedHosts)
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  sessionId++
  selectionRequestId++
})
</script>

<style scoped lang="scss">
.win-patch-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
