<template>
  <el-dialog v-model="visible" title="扫描补丁" width="760px" :close-on-click-modal="false">
    <el-alert
      title="可混选 Linux / Windows 主机，平台会按资产类型下发扫描任务。"
      type="info"
      :closable="false"
    />
    <AcmDeviceSelector
      v-if="!submitted"
      v-model="selection"
      ci-types="linux,windows"
      :options="selectorOptions"
      class="scan-selector"
    />
    <el-alert
      v-if="summary"
      :title="summary"
      :type="issues.length ? 'warning' : 'info'"
      :closable="false"
      class="scan-message"
    />
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="scan-message"
    />
    <template v-if="submitted">
      <p>
        已提交 Linux {{ submitted.linuxHosts || 0 }} 台 / Windows
        {{ submitted.windowsHosts || 0 }} 台
      </p>
      <div v-for="run in runs" :key="run.runId" class="scan-run">
        <el-button link type="primary" @click="openResult(run)">
          {{ run.label }}：{{ run.runId }}
        </el-button>
        <span>{{ run.status || '等待结果' }}</span>
      </div>
    </template>
    <template v-if="!submitted" #footer>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="checking || !selection.length || !!issues.length"
        @click="submit"
      >
        扫描
      </el-button>
    </template>
  </el-dialog>
  <ExecuteResultDialog
    v-model:visible="resultVisible"
    :run-id="currentRunId"
    job-title="补丁扫描"
  />
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { getJobRunResult } from '@/composables/useJobPolling'
import { getAgentErrorMessage } from '@/modules/asset/utils/agentErrors'
import { scanPatchHosts, getScanRuns } from '../../api/scan'
import {
  resolveAgentCapabilityHosts,
  getAgentCapabilityIssues,
  getAgentHostId,
  formatAgentCapabilitySummary
} from '../../utils/agentCapability'

const props = defineProps({
  modelValue: Boolean,
  preselectedHosts: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'submitted'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const selectorOptions = {
  selectMode: 'host',
  selector: 'multiple',
  label: '选择 Linux / Windows 主机'
}
const selection = ref([])
const resolved = ref([])
const checking = ref(false)
const submitting = ref(false)
const submitted = ref(null)
const errorMessage = ref('')
const issues = computed(() => getAgentCapabilityIssues(resolved.value, 'scan'))
const summary = computed(() =>
  checking.value ? '正在确认主机状态…' : formatAgentCapabilitySummary(resolved.value, issues.value)
)
const runs = ref([])
const resultVisible = ref(false)
const currentRunId = ref('')
let version = 0
let selectionVersion = 0
let timer
async function checkSelection() {
  const request = ++selectionVersion
  checking.value = true
  errorMessage.value = ''
  try {
    const hosts = selection.value.length ? await resolveAgentCapabilityHosts(selection.value) : []
    if (request === selectionVersion) resolved.value = hosts
  } catch (error) {
    if (request === selectionVersion) {
      resolved.value = selection.value.map(host => ({ ...host, agentInfoUnavailable: true }))
      errorMessage.value = getAgentErrorMessage(error)
    }
  } finally {
    if (request === selectionVersion) checking.value = false
  }
}
async function submit() {
  if (submitting.value || !selection.value.length) return
  const request = version
  submitting.value = true
  try {
    await checkSelection()
    if (request !== version || issues.value.length || checking.value) return
    const result = await scanPatchHosts(resolved.value.map(getAgentHostId))
    if (request !== version) return
    submitted.value = result
    runs.value = getScanRuns(result)
    if (!runs.value.length)
      errorMessage.value = '扫描已提交，但未返回运行记录，请到操作日志确认结果。'
    emit('submitted', { ...result, refreshOverview: true })
    pollRuns()
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) submitting.value = false
  }
}
async function pollRuns() {
  const request = version
  const active = runs.value.filter(
    run => !['COMPLETED', 'SUCCESS', 'FAILED', 'ERROR', 'CANCELLED'].includes(run.status)
  )
  if (!visible.value || !active.length) return
  const results = await Promise.allSettled(active.map(run => getJobRunResult(run.runId)))
  if (request !== version) return
  results.forEach((result, index) => {
    if (result.status === 'fulfilled')
      active[index].status = (result.value?.data || result.value)?.status
  })
  if (
    runs.value.some(
      run => !['COMPLETED', 'SUCCESS', 'FAILED', 'ERROR', 'CANCELLED'].includes(run.status)
    )
  )
    timer = setTimeout(pollRuns, 4000)
  else emit('submitted', { ...submitted.value, refreshOverview: true })
}
function openResult(run) {
  currentRunId.value = run.runId
  resultVisible.value = true
}
watch(selection, checkSelection, { deep: true })
watch(visible, open => {
  version++
  selectionVersion++
  clearTimeout(timer)
  resultVisible.value = false
  submitting.value = false
  checking.value = false
  if (!open) return
  submitted.value = null
  runs.value = []
  errorMessage.value = ''
  resolved.value = []
  selection.value = props.preselectedHosts.map(host => ({
    ...host,
    key: getAgentHostId(host),
    value: host.value || host.hostname || host.IP || host.ip,
    assetType: host.assetType || host.ciType
  }))
})
onUnmounted(() => {
  version++
  selectionVersion++
  clearTimeout(timer)
})
</script>

<style scoped>
.scan-selector,
.scan-message {
  margin-top: 16px;
}
.scan-message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.scan-run {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0;
}
</style>
