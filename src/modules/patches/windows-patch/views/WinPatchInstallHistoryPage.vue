<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="主机 ID">
          <el-input
            v-model="filters.hostId"
            placeholder="按主机 ID 过滤"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
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
        :disabled="selectedRows.length === 0"
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

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="logList"
        max-height="calc(100vh - 360px)"
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
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="WIN_PATCH_PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
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
import { onMounted, reactive, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import WinPatchRollbackDialog from '../components/tasks/WinPatchRollbackDialog.vue'
import WindowsKbDetailDialog from '../components/kb/WindowsKbDetailDialog.vue'
import WindowsKbLinkList from '../components/kb/WindowsKbLinkList.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_PAGE_SIZE_OPTIONS } from '../constants'
import { formatDateTime, isRollbackSelectable, parsePageResponse, pickValue } from '../utils'

const loading = ref(false)
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

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

async function loadLogs() {
  loading.value = true
  try {
    const response = await winPatchApi.getInstallLogs({
      hostId: filters.hostId || undefined,
      page: pagination.page - 1,
      size: pagination.pageSize
    })
    const page = parsePageResponse(response)
    logList.value = page.content
    pagination.total = page.total
    selectedRows.value = []
  } finally {
    loading.value = false
  }
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
  pagination.page = 1
  loadLogs()
}

function handleReset() {
  filters.hostId = ''
  pagination.page = 1
  pagination.pageSize = 20
  loadLogs()
}

function handlePageChange(page) {
  pagination.page = page
  loadLogs()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadLogs()
}

function handleRollbackSuccess() {
  rollbackDialogVisible.value = false
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

onMounted(() => {
  loadLogs()
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
