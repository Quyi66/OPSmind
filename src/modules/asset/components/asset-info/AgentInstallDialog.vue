<template>
  <el-dialog v-model="visible" title="安装 Agent" width="760px" :close-on-click-modal="false">
    <el-alert
      title="平台使用资产现有 SSH / WinRM 凭据安装，注册后自动绑定。通常需要 1～3 分钟。"
      type="info"
      :closable="false"
    />
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="install-alert"
    />
    <el-table :data="rows" max-height="360">
      <el-table-column prop="hostname" label="主机" min-width="150" />
      <el-table-column prop="ip" label="IP" width="150" />
      <el-table-column prop="message" label="安装状态 / 跳过原因" min-width="250" />
    </el-table>
    <el-button v-if="runId" link type="primary" class="run-record-btn" @click="resultVisible = true">
      查看运行记录
    </el-button>
    <p v-if="timedOut">等待上线已超过 5 分钟，请查看运行记录确认凭据、网络或安装失败原因。</p>
    <template #footer>
      <el-button v-if="submitted" :loading="refreshing" @click="refreshStatus">刷新状态</el-button>
      <el-button v-else type="primary" :loading="installing" @click="install">开始安装</el-button>
    </template>
  </el-dialog>
  <ExecuteResultDialog v-model:visible="resultVisible" :run-id="runId" job-title="安装 Agent" />
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { agentApi, getAgentErrorMessage } from '../../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({ modelValue: Boolean, hosts: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue', 'updated'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const rows = ref([])
const installing = ref(false)
const refreshing = ref(false)
const submitted = ref(false)
const runId = ref('')
const resultVisible = ref(false)
const errorMessage = ref('')
const timedOut = ref(false)
let timer
let version = 0
let startedAt = 0
async function install() {
  if (!rows.value.length || installing.value) return
  const request = version
  installing.value = true
  errorMessage.value = ''
  try {
    const result = await agentApi.installAgent(rows.value.map(row => row.hostId))
    if (request !== version) return
    runId.value = result.runId || ''
    const submittedIds = new Set((result.submitted || []).map(String))
    rows.value = rows.value.map(row => ({
      ...row,
      pending: submittedIds.has(row.hostId),
      message:
        result.skipped?.[row.hostId] ||
        (submittedIds.has(row.hostId) ? '已提交，等待 Agent 上线' : '未提交，请查看运行记录')
    }))
    submitted.value = true
    startedAt = Date.now()
    await refreshStatus()
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) installing.value = false
  }
}
async function refreshStatus() {
  clearTimeout(timer)
  const ids = rows.value.filter(row => row.pending).map(row => row.hostId)
  if (!ids.length || refreshing.value || !visible.value) return
  const request = version
  refreshing.value = true
  try {
    const infos = []
    for (let index = 0; index < ids.length; index += 100)
      infos.push(...(await agentApi.getHostAgentInfo(ids.slice(index, index + 100))))
    if (request !== version) return
    const online = new Set(
      infos
        .filter(
          info =>
            ['koreops_agent', 'agent', 'oplus_agent'].includes(info.connectionType) &&
            info.agentStatus === 'online'
        )
        .map(info => String(info.hostId))
    )
    rows.value = rows.value.map(row =>
      online.has(row.hostId) ? { ...row, pending: false, message: '安装成功，Agent 已在线' } : row
    )
    errorMessage.value = ''
    if (online.size) emit('updated')
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) {
      refreshing.value = false
      timedOut.value = Date.now() - startedAt >= 300000 && rows.value.some(row => row.pending)
      if (!timedOut.value && visible.value && rows.value.some(row => row.pending))
        timer = setTimeout(refreshStatus, 4000)
    }
  }
}
watch(visible, open => {
  version++
  clearTimeout(timer)
  refreshing.value = false
  installing.value = false
  resultVisible.value = false
  if (!open) return
  rows.value = props.hosts.map(host => ({
    hostId: String(host.id || host.hostId || host.key),
    hostname: host.hostname || host.value || '-',
    ip: host.IP || host.ip || '-',
    message: '待提交',
    pending: false
  }))
  submitted.value = false
  runId.value = ''
  errorMessage.value = ''
  timedOut.value = false
})
onUnmounted(() => {
  version++
  clearTimeout(timer)
})
</script>

<style scoped>
.install-alert {
  margin: 12px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.run-record-btn {
  margin-top: 12px;
}
</style>
