<template>
  <div class="agent-batch-panel">
    <div class="batch-toolbar">
      <h2>{{ batchId ? detail?.batch.name || '批次详情' : '批次记录' }}</h2>
      <div class="batch-actions">
        <el-button v-if="batchId" @click="backToList">返回列表</el-button>
        <el-button :loading="loading" :disabled="busy" @click="refresh">刷新</el-button>
        <el-button v-if="!batchId && canManageAgents" type="primary" @click="emit('create-batch')">
          新建批次
        </el-button>
      </div>
    </div>
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="false"
      class="batch-alert"
    />
    <template v-if="!batchId">
      <p class="batch-hint">显示最近 50 个批次。点击批次名称查看逐台安装进度。</p>
      <el-table v-loading="loading" :data="batches" row-key="batch.id">
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="openBatch(row)">{{ row.batch.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.batch.status === 'open' ? 'primary' : 'info'">
              {{ row.batch.status === 'open' ? '进行中' : '已关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上线进度" min-width="210">
          <template #default="{ row }">
            <el-progress :percentage="getBatchProgress(row.counts)" />
            <span class="batch-hint">
              {{ row.counts.online || 0 }} / {{ row.counts.total || 0 }} 台
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="batch.createdBy" label="创建人" min-width="120" />
        <el-table-column prop="batch.createdAt" label="创建时间" width="180" />
      </el-table>
    </template>
    <template v-else-if="detail">
      <div class="batch-meta">
        <el-tag :type="detail.batch.status === 'open' ? 'primary' : 'info'">
          {{ detail.batch.status === 'open' ? '进行中' : '已关闭' }}
        </el-tag>
        <span>创建人：{{ detail.batch.createdBy || '-' }}</span>
        <span>创建时间：{{ detail.batch.createdAt }}</span>
        <span>过期时间：{{ detail.batch.expiresAt }}</span>
        <span>保留凭据：{{ Number(detail.batch.keepCredentials) ? '是' : '否' }}</span>
      </div>
      <div class="batch-counts">
        <el-tag type="info">总计 {{ detail.counts.total || 0 }}</el-tag>
        <el-tag v-for="(status, key) in BATCH_STATUSES" :key="key" :type="status.type">
          {{ status.label }} {{ detail.counts[key] || 0 }}
        </el-tag>
      </div>
      <el-progress :percentage="getBatchProgress(detail.counts)" />
      <div class="batch-toolbar detail-actions">
        <el-select
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
          style="width: 180px"
          @change="clearSelection"
        >
          <el-option
            v-for="(status, key) in BATCH_STATUSES"
            :key="key"
            :label="status.label"
            :value="key"
          />
        </el-select>
        <div v-if="canManageAgents" class="batch-actions">
          <el-button
            :disabled="!writable || busy || !retryableItems.length"
            @click="openRetry(false)"
          >
            重试失败项
          </el-button>
          <el-button :disabled="!writable || busy || !selectedIds.length" @click="openRetry(true)">
            重试已选（{{ selectedIds.length }}）
          </el-button>
          <el-dropdown
            v-if="detail.scriptOs?.length"
            :disabled="!writable || busy"
            @command="loadScript"
          >
            <el-button :disabled="!writable || busy" :loading="scriptLoading">批次脚本</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="os in detail.scriptOs" :key="os" :command="os">
                  {{ os === 'windows' ? 'Windows' : 'Linux' }} 脚本
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="danger" plain :disabled="!writable || busy" @click="closeBatch">
            关闭批次
          </el-button>
        </div>
      </div>
      <el-alert
        v-if="!writable"
        title="批次已关闭或已过期，无法重试或获取脚本；未上线主机请新建批次。"
        type="info"
        :closable="false"
        class="batch-alert"
      />
      <el-table
        ref="itemTable"
        v-loading="loading"
        :data="filteredItems"
        row-key="id"
        @selection-change="selectionChanged"
      >
        <el-table-column
          v-if="canManageAgents"
          type="selection"
          width="45"
          :selectable="selectable"
        />
        <el-table-column prop="ip" label="IP" min-width="140" />
        <el-table-column prop="hostname" label="主机名" min-width="140" />
        <el-table-column label="OS" width="100">
          <template #default="{ row }">
            {{ row.targetOs === 'windows' ? 'Windows' : 'Linux' }}
          </template>
        </el-table-column>
        <el-table-column label="通道" width="120">
          <template #default="{ row }">
            {{ row.channel === 'push' ? '平台推装' : '批次脚本' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="BATCH_STATUSES[row.status]?.type || 'info'">
              {{ BATCH_STATUSES[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="260">
          <template #default="{ row }">
            <div class="batch-message">{{ row.message || '-' }}</div>
            <span v-if="row.status === 'unreachable'" class="batch-hint">
              建议使用批次脚本安装。
            </span>
            <el-button
              v-if="row.status === 'conflict' && canManageAgents"
              link
              type="primary"
              @click="openPendingAgents"
            >
              前往待处理 Agent
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <el-dialog
      v-model="retryVisible"
      title="重试安装"
      width="700px"
      :close-on-click-modal="false"
      :close-on-press-escape="!busy"
      :show-close="!busy"
      append-to-body
    >
      <el-form label-width="110px" :disabled="busy">
        <p>本次重试 {{ retryItems.length }} 台主机。</p>
        <AgentBatchCredentials
          v-model="retryCredentials"
          :operating-systems="retryOs"
          hint="未补充凭据时使用资产现有凭据；待脚本安装的主机需补充对应系统凭据。"
        />
      </el-form>
      <el-alert
        v-if="retryError"
        :title="retryError"
        type="error"
        :closable="false"
        class="batch-alert"
      />
      <template #footer>
        <el-button :disabled="busy" @click="retryVisible = false">取消</el-button>
        <el-button type="primary" :loading="busy" :disabled="!writable" @click="submitRetry">
          开始重试
        </el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="scriptVisible" title="批次脚本" width="780px" append-to-body>
      <template v-if="script">
        <el-alert
          :title="
            script.os === 'windows'
              ? 'Windows 需管理员执行；已装好的机器会自动跳过，可整批重复下发。'
              : 'Linux 需 root 或 sudo；已装好的机器会自动跳过，可整批重复下发。'
          "
          type="info"
          :closable="false"
        />
        <p>有效期至 {{ detail?.batch.expiresAt }}，最多使用 {{ script.maxUses }} 次。</p>
        <el-input :model-value="script.installCommand" type="textarea" :rows="6" readonly />
        <div class="batch-actions script-actions">
          <el-button type="primary" @click="copyCommand">复制命令</el-button>
          <el-button @click="downloadScript">下载文件</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { authService } from '@/core/auth'
import { agentApi, getAgentErrorMessage } from '../../api'
import AgentBatchCredentials from './AgentBatchCredentials.vue'
import {
  BATCH_STATUSES,
  buildBatchCredentials,
  createBatchCredentials,
  hasAgentManagePermission,
  getBatchProgress,
  isBatchWritable,
  isRetryableItem,
  needsBatchPolling
} from '../../utils/agentBatch'

const props = defineProps({
  batchId: { type: String, default: '' },
  active: { type: Boolean, default: true }
})
const emit = defineEmits(['select-batch', 'create-batch', 'pending'])
const batchId = computed(() => props.batchId)
const canManageAgents = computed(() => hasAgentManagePermission(authService))
const batches = ref([])
const detail = ref(null)
const loading = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const itemTable = ref(null)
const statusFilter = ref('')
const selectedIds = ref([])
const now = ref(Date.now())
const writable = computed(() => isBatchWritable(detail.value, now.value))
const filteredItems = computed(() =>
  (detail.value?.items || []).filter(
    item => !statusFilter.value || item.status === statusFilter.value
  )
)
const retryableItems = computed(() => (detail.value?.items || []).filter(isRetryableItem))
const retryVisible = ref(false)
const retryIds = ref([])
const retryItems = computed(() =>
  retryableItems.value.filter(item => !retryIds.value.length || retryIds.value.includes(item.id))
)
const retryOs = computed(() => [...new Set(retryItems.value.map(item => item.targetOs))])
const retryCredentials = ref(createBatchCredentials())
const retryError = ref('')
const script = ref(null)
const scriptVisible = ref(false)
const scriptLoading = ref(false)
let timer
let expiryTimer
let version = 0
let scriptVersion = 0
let session = 0

function clearSelection() {
  selectedIds.value = []
  itemTable.value?.clearSelection()
}
function selectable(item) {
  return writable.value && !busy.value && isRetryableItem(item)
}
function selectionChanged(rows) {
  selectedIds.value = rows.filter(isRetryableItem).map(item => item.id)
}
function openBatch(result) {
  emit('select-batch', result.batch.id)
}
function backToList() {
  emit('select-batch', '')
}
function openPendingAgents() {
  emit('pending')
}
function schedulePoll() {
  window.clearTimeout(timer)
  if (
    props.active &&
    batchId.value &&
    detail.value?.batch.status === 'open' &&
    needsBatchPolling(detail.value?.counts)
  )
    timer = window.setTimeout(refresh, 5000)
}
function applyDetail(result) {
  detail.value = result
  now.value = Date.now()
  window.clearTimeout(expiryTimer)
  const expires = Date.parse(String(result.batch.expiresAt || '').replace(' ', 'T'))
  if (result.batch.status === 'open' && expires > now.value)
    expiryTimer = window.setTimeout(
      () => {
        now.value = Date.now()
        scriptVersion++
        scriptLoading.value = false
        scriptVisible.value = false
        script.value = null
        clearSelection()
      },
      Math.min(expires - now.value, 2147483647)
    )
  const retryableIds = new Set((result.items || []).filter(isRetryableItem).map(item => item.id))
  selectedIds.value = selectedIds.value.filter(id => retryableIds.has(id))
  if (!isBatchWritable(result)) {
    scriptVersion++
    scriptLoading.value = false
    scriptVisible.value = false
    script.value = null
    clearSelection()
  }
}
async function refresh() {
  if (busy.value || !props.active) return
  window.clearTimeout(timer)
  const request = ++version
  loading.value = true
  errorMessage.value = ''
  try {
    if (batchId.value) {
      const result = await agentApi.getBatch(batchId.value)
      if (request === version) applyDetail(result)
    } else {
      const result = await agentApi.getBatches()
      if (request === version) batches.value = result
    }
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) {
      loading.value = false
      schedulePoll()
    }
  }
}
function openRetry(selected) {
  if (!props.active || !canManageAgents.value || !isBatchWritable(detail.value) || busy.value)
    return
  retryIds.value = selected ? [...selectedIds.value] : []
  retryCredentials.value = createBatchCredentials()
  retryError.value = ''
  retryVisible.value = true
}
async function submitRetry() {
  if (!props.active || !canManageAgents.value || busy.value || !isBatchWritable(detail.value))
    return
  retryError.value = ''
  let credentials
  try {
    if (!retryItems.value.length) throw new Error('没有可重试的主机')
    credentials = buildBatchCredentials(retryCredentials.value, retryOs.value)
    if (
      retryItems.value.some(
        item =>
          item.status === 'await_script' && !credentials.some(value => value.os === item.targetOs)
      )
    )
      throw new Error('请为待脚本安装的主机补充对应系统凭据')
  } catch (error) {
    retryError.value = getAgentErrorMessage(error)
    return
  }
  window.clearTimeout(timer)
  const request = ++version
  busy.value = true
  loading.value = false
  try {
    const result = await agentApi.retryBatch(batchId.value, {
      itemIds: retryIds.value,
      ...(credentials.length ? { credentials } : {})
    })
    if (request !== version) return
    applyDetail(result)
    retryVisible.value = false
    clearSelection()
    errorMessage.value = ''
    ElMessage.success('已提交重试')
  } catch (error) {
    if (request === version) retryError.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) {
      busy.value = false
      schedulePoll()
    }
  }
}
async function closeBatch() {
  if (!props.active || !canManageAgents.value || busy.value || !isBatchWritable(detail.value))
    return
  const id = batchId.value
  const confirmationSession = session
  try {
    await ElMessageBox.confirm('关闭后批次脚本立即失效，未上线的机器需新建批次', '关闭批次', {
      type: 'warning'
    })
  } catch {
    return
  }
  if (
    !props.active ||
    confirmationSession !== session ||
    id !== batchId.value ||
    busy.value ||
    !isBatchWritable(detail.value)
  )
    return
  window.clearTimeout(timer)
  const request = ++version
  busy.value = true
  loading.value = false
  try {
    const result = await agentApi.closeBatch(id)
    if (request !== version) return
    applyDetail(result)
    retryVisible.value = false
    errorMessage.value = ''
    ElMessage.success('批次已关闭')
  } catch (error) {
    if (request === version) errorMessage.value = getAgentErrorMessage(error)
  } finally {
    if (request === version) {
      busy.value = false
      schedulePoll()
    }
  }
}
async function loadScript(os) {
  if (
    !props.active ||
    !canManageAgents.value ||
    !isBatchWritable(detail.value) ||
    busy.value ||
    scriptLoading.value ||
    !detail.value.scriptOs?.includes(os)
  )
    return
  const request = ++scriptVersion
  scriptLoading.value = true
  script.value = null
  try {
    const result = await agentApi.getBatchScript(batchId.value, os)
    if (request !== scriptVersion) return
    script.value = result
    scriptVisible.value = true
  } catch (error) {
    if (request === scriptVersion) ElMessage.error(getAgentErrorMessage(error))
  } finally {
    if (request === scriptVersion) scriptLoading.value = false
  }
}
async function copyCommand() {
  if (!script.value?.installCommand) return
  try {
    if (window.navigator.clipboard?.writeText)
      await window.navigator.clipboard.writeText(script.value.installCommand)
    else {
      const textarea = document.createElement('textarea')
      textarea.value = script.value.installCommand
      document.body.appendChild(textarea)
      try {
        textarea.select()
        if (!document.execCommand('copy')) throw new Error('copy failed')
      } finally {
        textarea.remove()
      }
    }
    ElMessage.success('命令已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制命令')
  }
}
function downloadScript() {
  if (!script.value?.fileName || !script.value.fileContent) return
  const url = window.URL.createObjectURL(
    new window.Blob([script.value.fileContent], { type: 'text/plain;charset=utf-8' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = script.value.fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}
watch(retryVisible, open => {
  if (!open) retryCredentials.value = createBatchCredentials()
})
watch(scriptVisible, open => {
  if (!open) script.value = null
})
watch(
  [() => props.active, batchId],
  () => {
    session++
    version++
    scriptVersion++
    window.clearTimeout(timer)
    window.clearTimeout(expiryTimer)
    busy.value = false
    loading.value = false
    scriptLoading.value = false
    detail.value = null
    errorMessage.value = ''
    statusFilter.value = ''
    clearSelection()
    retryVisible.value = false
    scriptVisible.value = false
    script.value = null
    refresh()
  },
  { immediate: true }
)
onUnmounted(() => {
  session++
  version++
  scriptVersion++
  window.clearTimeout(timer)
  window.clearTimeout(expiryTimer)
})
</script>

<style scoped>
.agent-batch-panel {
  min-width: 0;
}
.batch-toolbar,
.batch-actions,
.batch-counts,
.batch-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.batch-toolbar {
  justify-content: space-between;
  margin-bottom: 16px;
}
.batch-toolbar h2 {
  margin: 0;
  font-size: 20px;
}
.batch-actions > .el-button + .el-button {
  margin-left: 0;
}
.batch-counts,
.batch-meta {
  margin-bottom: 16px;
}
.batch-meta,
.batch-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.batch-alert {
  margin-bottom: 16px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.batch-message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.detail-actions,
.script-actions {
  margin-top: 20px;
}
</style>
