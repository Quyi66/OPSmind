<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`作业运行记录${jobTitle ? ` · ${jobTitle}` : ''}`"
    width="1260px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="history-dialog">
      <section class="history-toolbar">
        <div class="toolbar-group">
          <span class="toolbar-label">时间范围</span>
          <el-select v-model="timeRange" size="small" class="toolbar-select">
            <el-option
              v-for="option in timeRangeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="toolbar-group">
          <span class="toolbar-label">状态</span>
          <el-select v-model="statusValue" size="small" class="toolbar-select">
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>

        <div class="toolbar-group toolbar-search">
          <el-input
            v-model.trim="keyword"
            size="small"
            placeholder="输入作业名称搜索"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #suffix>
              <el-icon class="search-icon" @click="handleSearch"><Search /></el-icon>
            </template>
          </el-input>
          <el-button size="small" :icon="RefreshRight" @click="handleRefresh" />
        </div>
      </section>

      <el-table
        v-loading="tableLoading"
        :data="tableData"
        height="420px"
        class="history-table"
        @sort-change="handleSortChange"
        :empty-text="tableLoading ? ' ' : '暂无数据'"
      >
        <el-table-column
          prop="startTime"
          label="开始时间"
          width="170"
          sortable="custom"
          column-key="start_time"
        />
        <el-table-column prop="jobTitle" label="作业" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <span>{{ jobTypeLabel(row.jobTypeKey, row.jobType) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="执行人" width="110" />
        <el-table-column prop="reviewUser" label="审核人" width="110" />
        <el-table-column prop="duration" label="耗时" width="100" />
        <el-table-column
          prop="endTime"
          label="结束时间"
          width="170"
          sortable="custom"
          column-key="end_time"
        />
        <el-table-column label="Ansible Node" min-width="180">
          <template #default="{ row }">
            <div v-if="row.ansibleNodes.length" class="node-badges">
              <el-tag
                v-for="node in row.ansibleNodes"
                :key="node"
                type="info"
                size="small"
                class="node-badge"
              >
                {{ node }}
              </el-tag>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" sortable="custom" column-key="status">
          <template #default="{ row }">
            <el-tag
              v-if="row.status"
              :type="statusTagType(row.status)"
              effect="dark"
              size="small"
              class="history-status-tag"
              :class="{ 'is-clickable': !!row.id }"
              @click.stop="row.id && handleStatusClick(row)"
            >
              {{ statusLabel(row.status) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="220">
          <template #default="{ row }">
            <div v-if="row.statsBadges.length" class="stats-badges">
              <el-tag
                v-for="badge in row.statsBadges"
                :key="badge.key"
                :type="badge.type"
                size="small"
                effect="plain"
              >
                <i :class="badge.icon" class="badge-icon" />
                <span>{{ badge.count }}</span>
              </el-tag>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-tooltip v-if="canRerun(row)" content="重新执行">
              <el-button link type="primary" size="small" @click="handleRerun(row)">
                <i class="fa fa-rocket" />
                <span class="ml-1">重跑</span>
              </el-button>
            </el-tooltip>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="history-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <ExecuteResultDialog
        v-if="resultDialogVisible"
        v-model:visible="resultDialogVisible"
        :run-id="resultMeta.runId"
        :job-title="resultMeta.jobTitle"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteResultDialog from './ExecuteResultDialog.vue'
import {
  JOB_HISTORY_STATUS_OPTIONS,
  JOB_STATUS_LABELS,
  JOB_STATUS_TAG_TYPES
} from '@/modules/automation/constants/jobStatus'

const timeRangeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'Last year', value: 'lastYear' }
]

const timeRangeMap = {
  all: 3650,
  today: 0,
  last7: 7,
  last30: 30,
  lastYear: 365
}

const statusOptions = JOB_HISTORY_STATUS_OPTIONS
const RUNNING_STATUSES = ['WAITING', 'RUNNING', 'CALLBACK']
const DEFAULT_SORT = { field: 'start_time', order: 'desc' }

const props = defineProps({
  visible: { type: Boolean, default: false },
  jobId: { type: String, default: '' },
  jobTitle: { type: String, default: '' }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const timeRange = ref('today')
const statusValue = ref('all')
const keyword = ref('')
const tableLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const sortState = ref({ ...DEFAULT_SORT })
const resultDialogVisible = ref(false)
const resultMeta = ref({ runId: '', jobTitle: '' })

watch(resultDialogVisible, (visible) => {
  if (!visible) {
    resultMeta.value = { runId: '', jobTitle: '' }
  }
})

watch(
  () => [props.visible, props.jobId],
  ([visible, jobId]) => {
    if (visible && jobId) {
      currentPage.value = 1
      sortState.value = { ...DEFAULT_SORT }
      fetchRunLogs()
    }
  },
  { immediate: true }
)

watch([timeRange, statusValue], () => {
  if (!props.visible || !props.jobId) return
  currentPage.value = 1
  fetchRunLogs()
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      resetState()
    }
  }
)

function handleClose() {
  dialogVisible.value = false
}

function resetState() {
  timeRange.value = 'today'
  statusValue.value = 'all'
  keyword.value = ''
  currentPage.value = 1
  pageSize.value = 10
  total.value = 0
  tableData.value = []
  sortState.value = { ...DEFAULT_SORT }
}

function handleSearch() {
  if (!props.visible || !props.jobId) return
  currentPage.value = 1
  fetchRunLogs()
}

function handleRefresh() {
  if (!props.visible || !props.jobId) return
  fetchRunLogs()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchRunLogs()
}

function handlePageSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchRunLogs()
}

function handleSortChange({ column, order }) {
  const columnKey = column?.columnKey
  if (!order || !columnKey) {
    sortState.value = { ...DEFAULT_SORT }
  } else {
    sortState.value = {
      field: columnKey,
      order: order === 'ascending' ? 'asc' : 'desc'
    }
  }
  currentPage.value = 1
  fetchRunLogs()
}

function statusLabel(status) {
  return JOB_STATUS_LABELS[status] || status || '-'
}

function statusTagType(status) {
  const map = {
    WAITING: 'info',
    RUNNING: 'info',
    CALLBACK: 'warning',
    ERROR: 'danger',
    FAILED: 'danger',
    COMPLETED: 'success',
    INTERRUPTED: 'info'
  }
  return map[status] || JOB_STATUS_TAG_TYPES[status] || 'info'
}

function handleStatusClick(row) {
  if (!row?.id) return
  resultMeta.value = {
    runId: row.id,
    jobTitle: row.jobTitle || props.jobTitle || ''
  }
  resultDialogVisible.value = true
}

function canRerun(row) {
  if (!row?.id) return false
  const isBusy = RUNNING_STATUSES.includes(row.status)
  return !isBusy && row.jobTypeKey === 'script'
}

async function handleRerun(row) {
  try {
    await ElMessageBox.confirm(
      `确定要重新执行作业 "${row.jobTitle}" 吗？`,
      '重新执行',
      {
        type: 'warning',
        confirmButtonText: '执行',
        cancelButtonText: '取消'
      }
    )

    await jaoApi.executeJob({
      code: 'OKPacN',
      params: { runId: row.id }
    })
    ElMessage.success('作业已提交执行')
    handleRefresh()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '执行失败')
    }
  }
}

async function fetchRunLogs() {
  if (!props.jobId) {
    tableData.value = []
    total.value = 0
    return
  }
  tableLoading.value = true
  try {
    const filterKeyword = keyword.value?.trim()
    const payload = {
      params: {
        job_id: props.jobId,
        day: String(timeRangeMap[timeRange.value] ?? 0),
        type: '',
        run_ids: '',
        status: statusValue.value
      },
      size: pageSize.value,
      page: currentPage.value,
      orderBy: `${sortState.value.field} ${sortState.value.order}`,
      filter: filterKeyword ? `job_title:*${filterKeyword}*` : ''
    }
    const response = await jaoApi.fetchJobRunLogs(payload)
    const data = response?.data ?? response ?? {}
    const records = Array.isArray(data.records)
      ? data.records
      : Array.isArray(data.list)
        ? data.list
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : []
    const normalizedRecords = records.map(mapRunLogRecord)
    tableData.value = normalizedRecords
    total.value = Number(data.total ?? data.count ?? normalizedRecords.length) || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取运行记录失败')
  } finally {
    tableLoading.value = false
  }
}

function mapRunLogRecord(record = {}) {
  const startValue = record.start_time ?? record.startTime ?? record.start
  const endValue = record.end_time ?? record.endTime ?? record.end
  const jobTypeRaw = record.job_type ?? record.jobType ?? record.type ?? ''
  const jobTypeKey = String(jobTypeRaw).toLowerCase()
  const statsRaw = record.stats_json ?? record.statsJson ?? record.stats
  const statsBadges = buildStatsBadges(statsRaw)
  return {
    id: record.id ? String(record.id) : '',
    jobTitle: record.job_title ?? record.jobTitle ?? '-',
    jobType: jobTypeRaw || '-',
    jobTypeKey,
    username: record.username ?? record.user_name ?? '-',
    reviewUser: record.review_user ?? record.audit_user ?? '-',
    duration: formatDuration(startValue, endValue),
    startTime: formatDateTime(startValue),
    endTime: formatDateTime(endValue),
    status: record.status ?? '',
    ansibleNodes: parseNodes(record.ata_url ?? record.ataUrl ?? record.ansible_node ?? record.ansibleNode),
    statsBadges
  }
}

function parseNodes(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((node) => node.trim())
    .filter(Boolean)
}

function buildStatsBadges(stats) {
  const statsObj = parseStats(stats)
  const defs = [
    { key: 'unreachableHosts', type: 'danger', icon: 'fa fa-ban' },
    { key: 'failedHosts', type: 'warning', icon: 'fa fa-times-circle' },
    { key: 'failedTasks', type: 'danger', icon: 'fa fa-map-marker-times' }
  ]
  return defs
    .filter((def) => Number(statsObj[def.key]) > 0)
    .map((def) => ({ ...def, count: statsObj[def.key] }))
}

function parseStats(value) {
  if (!value) return {}
  if (typeof value === 'object') return value || {}
  try {
    return JSON.parse(value) || {}
  } catch {
    return {}
  }
}

function jobTypeLabel(typeKey, fallback) {
  const map = {
    script: '脚本',
    command: '命令',
    rest: 'REST',
    process: '流程',
    workflow: '工作流'
  }
  return map[typeKey] || fallback || '-'
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function formatDuration(startValue, endValue) {
  const start = toDate(startValue)
  const end = toDate(endValue)
  if (!start || !end) return '-'
  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalSeconds = Math.round(diffMs / 1000)
  if (!totalSeconds) return '0s'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds || !parts.length) parts.push(`${seconds}s`)
  return parts.join(' ')
}
</script>

<style scoped>
.history-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-toolbar {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toolbar-label {
  font-size: 12px;
  color: #909399;
}

.toolbar-select {
  width: 160px;
}

.toolbar-search {
  margin-left: auto;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.history-table {
  width: 100%;
}

.history-status-tag.is-clickable {
  cursor: pointer;
  text-decoration: underline;
}

.node-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.node-badge {
  margin-right: 0;
}

.stats-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge-icon {
  margin-right: 4px;
}

.history-footer {
  display: flex;
  justify-content: flex-end;
}

.ml-1 {
  margin-left: 4px;
}

.text-muted {
  color: #c0c4cc;
}

.search-icon {
  cursor: pointer;
}
</style>
