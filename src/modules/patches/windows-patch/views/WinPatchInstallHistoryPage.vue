<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small" @submit.prevent>
        <el-form-item label="主机 ID">
          <el-input
            v-model="filters.hostId"
            placeholder="按主机 ID 过滤"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button
        type="warning"
        size="small"
        :disabled="loading || selectedRows.length === 0"
        @click="rollbackDialogVisible = true"
      >
        回滚选中记录
      </el-button>
      <span class="win-patch-selection-text">安装历史（按时间倒序）</span>
      <span class="win-patch-selection-text">已选 {{ selectedRows.length }} 条可回滚记录</span>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadLogs()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadLogs()">重试</el-button>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="logList"
        max-height="calc(100vh - 394px)"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="isRollbackRowSelectable" />
        <el-table-column label="主机" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['hosts', 'hostKey', 'host_key'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="KB 编号" min-width="160">
          <template #default="{ row }">
            <WindowsKbLinkList
              :kb-numbers="resolveKbNumbers(row)"
              dialog-title="关联 KB"
              @select-kb="openKbDetail"
            />
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{
              formatDateTime(
                pickValue(row, ['updateTime', 'update_time', 'executedDate', 'executed_date'], '')
              )
            }}
          </template>
        </el-table-column>
        <el-table-column label="安装历史" min-width="110" align="center">
          <template #default="{ row }">
            <el-button
              v-if="resolveRunId(row)"
              type="primary"
              link
              @click.stop="openRunResult(row)"
            >
              查看
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-if="totalKnown"
        :current-page="pagination.page"
        :page-size="pagination.pageSize"
        :disabled="loading"
        :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
      <span v-else-if="!loadError" class="win-patch-selection-text">
        总数暂不可核实，请刷新重试
      </span>
    </div>

    <WinPatchRollbackDialog
      v-model="rollbackDialogVisible"
      :selected-rows="selectedRows"
      @success="handleRollbackSuccess"
    />

    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentRunTitle"
    />

    <WindowsKbDetailDialog v-model="kbDetailDialogVisible" :kb-number="selectedKbNumber" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import WinPatchRollbackDialog from '../components/tasks/WinPatchRollbackDialog.vue'
import WindowsKbDetailDialog from '../components/kb/WindowsKbDetailDialog.vue'
import WindowsKbLinkList from '../components/kb/WindowsKbLinkList.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import { formatDateTime, isRollbackSelectable, parsePageResponse, pickValue } from '../utils'

const route = useRoute()
const loading = ref(false)
const loadError = ref('')
const totalKnown = ref(true)
let loadRequestId = 0
const logList = ref([])
const selectedRows = ref([])
const rollbackDialogVisible = ref(false)
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentRunTitle = ref('')
const kbDetailDialogVisible = ref(false)
const selectedKbNumber = ref('')

const filters = reactive({
  hostId: ''
})
const appliedHostId = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

async function loadLogs() {
  if (route.name !== 'patches-windowsRollback') return
  const requestId = ++loadRequestId
  const isCurrentRequest = () => requestId === loadRequestId
  let query = {
    hostId: appliedHostId.value || undefined,
    page: pagination.page - 1,
    size: pagination.pageSize
  }
  loading.value = true
  loadError.value = ''
  logList.value = []
  selectedRows.value = []
  try {
    let response = await winPatchApi.getInstallLogs(query)
    if (!isCurrentRequest()) return
    // 对照主机概览，只用明确的总数校正失效页，最多补查一次。
    const total = getExplicitTotal(response)
    if (total !== null) {
      const lastPage = Math.max(0, Math.ceil(total / query.size) - 1)
      if (query.page > lastPage) {
        query = { ...query, page: lastPage }
        pagination.page = lastPage + 1
        response = await winPatchApi.getInstallLogs(query)
        if (!isCurrentRequest()) return
        const correctedTotal = getExplicitTotal(response)
        if (
          correctedTotal !== null &&
          query.page > Math.max(0, Math.ceil(correctedTotal / query.size) - 1)
        ) {
          throw new Error('安装历史分页已变化，请重试')
        }
      }
    }
    const page = parsePageResponse(response)
    if (!Number.isSafeInteger(page.total) || page.total < 0) {
      throw new Error('安装历史总数无效')
    }
    logList.value = page.content
    totalKnown.value = getExplicitTotal(response) !== null
    pagination.total = page.total
    selectedRows.value = []
  } catch {
    if (!isCurrentRequest()) return
    totalKnown.value = false
    pagination.total = 0
    loadError.value = '加载安装历史失败，请重试'
  } finally {
    if (isCurrentRequest()) loading.value = false
  }
}

function getExplicitTotal(response) {
  const data = response?.data ?? response
  const raw = data?.totalElements ?? data?.total
  if (!['number', 'string'].includes(typeof raw) || String(raw).trim() === '') return null
  const total = Number(raw)
  return Number.isSafeInteger(total) && total >= 0 ? total : null
}

function isRollbackRowSelectable(row) {
  return isRollbackSelectable(row)
}

function handleSelectionChange(rows) {
  selectedRows.value = Array.isArray(rows) ? rows : []
}

function resolveRunId(row) {
  return String(pickValue(row, ['runId', 'run_id'], '')).trim()
}

function openRunResult(row) {
  const runId = resolveRunId(row)
  if (!runId) return

  currentRunId.value = runId
  currentRunTitle.value = `补丁安装历史：${pickValue(
    row,
    ['updateKbNumbers', 'update_kb_numbers', 'kbNumber', 'kb_number'],
    runId
  )}`
  runResultDialogVisible.value = true
}

function handleSearch() {
  appliedHostId.value = filters.hostId.trim()
  pagination.page = 1
  pagination.total = 0
  loadLogs()
}

function handleReset() {
  filters.hostId = ''
  appliedHostId.value = ''
  pagination.page = 1
  pagination.pageSize = 20
  pagination.total = 0
  loadLogs()
}

function handlePageChange(page) {
  if (loading.value || page === pagination.page) return
  pagination.page = page
  loadLogs()
}

function handleSizeChange(size) {
  if (loading.value || size === pagination.pageSize) return
  pagination.pageSize = size
  pagination.page = 1
  loadLogs()
}

function handleRollbackSuccess() {
  loadLogs()
}

function openKbDetail(kbNumber) {
  selectedKbNumber.value = normalizeKbNumber(kbNumber)
  kbDetailDialogVisible.value = Boolean(selectedKbNumber.value)
}

function resolveKbNumbers(row) {
  const raw = pickValue(
    row,
    ['updateKbNumbers', 'update_kb_numbers', 'kbNumber', 'kb_number', 'kbArticle', 'kb_article'],
    ''
  )
  if (Array.isArray(raw)) {
    return raw.map(normalizeKbNumber).filter(Boolean)
  }

  return String(raw)
    .split(/[,，;；\s]+/)
    .map(normalizeKbNumber)
    .filter(Boolean)
}

function normalizeKbNumber(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (!normalized) return ''

  const match = normalized.match(/KB\s*\d+/i)
  if (match) {
    return match[0].replace(/\s+/g, '')
  }

  return /^\d+$/.test(normalized) ? `KB${normalized}` : normalized
}

watch(
  [() => route.name, () => route.query.hostId],
  ([name, hostId]) => {
    loadRequestId += 1
    loading.value = false
    loadError.value = ''
    logList.value = []
    pagination.total = 0
    selectedRows.value = []
    rollbackDialogVisible.value = false
    runResultDialogVisible.value = false
    kbDetailDialogVisible.value = false
    if (name !== 'patches-windowsRollback') return

    const value = Array.isArray(hostId) ? hostId[0] : hostId
    filters.hostId = typeof value === 'string' ? value : ''
    appliedHostId.value = filters.hostId.trim()
    pagination.page = 1
    loadLogs()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  loadRequestId += 1
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

.win-patch-selection-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
