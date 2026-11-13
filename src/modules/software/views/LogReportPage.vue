<template>
  <div class="ops-page-layout">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item :label="t('yumRepo.software.timeRange')">
          <el-select v-model="filterDay" style="width: 100px" @change="handleSearch">
            <el-option :label="t('common.all')" value="all" />
            <el-option :label="t('yumRepo.software.today')" value="1" />
            <el-option :label="t('yumRepo.software.last7Days')" value="7" />
            <el-option :label="t('yumRepo.software.last30Days')" value="30" />
            <el-option :label="t('yumRepo.software.lastYear')" value="365" />
          </el-select>
        </el-form-item>
        <!-- <el-form-item label="执行引擎">
          <el-select
            v-model="engineFilter"
            placeholder="全部"
            clearable
            style="width: 130px" @change="handleSearch">
            <el-option
              v-for="node in engineOptions"
              :key="node"
              :label="node"
              :value="node"
            />
          </el-select>
        </el-form-item> -->
        <el-form-item :label="t('automation.workbench.status')">
          <el-select v-model="statusFilter" :placeholder="t('common.all')" clearable style="width: 100px" @change="handleSearch">
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('common.actions')">
          <el-select v-model="actionFilter" :placeholder="t('common.all')" clearable style="width: 100px" @change="handleSearch">
            <el-option
              v-for="action in actionOptions"
              :key="action"
              :label="action"
              :value="action"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('yumRepo.keyword')">
          <el-input v-model="searchText" :placeholder="t('yumRepo.search')" clearable style="width: 180px" @keyup.enter="handleSearch" @clear="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadLogs"
        :title="t('common.refresh')"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        size="small"
        row-key="run_id"
        max-height="calc(100vh - 264px)"
        :default-sort="{ prop: 'start_time', order: 'descending' }"
        :empty-text="t('yumRepo.software.noData')"
      >
        <el-table-column prop="start_time" :label="t('yumRepo.software.startedAt')" min-width="160" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" :label="t('common.actions')" min-width="120" sortable />
        <el-table-column prop="status" :label="t('automation.workbench.status')" min-width="100" sortable>
          <template #default="{ row }">
            <RunLogStatusTag
              :type="getStatusType(row.status)"
              size="small"
              :clickable="!!row.run_record"
              @click="handleViewRunResult(row)"
            >
              {{ getStatusText(row.status) }}
            </RunLogStatusTag>
          </template>
        </el-table-column>
        <el-table-column prop="executor_node" :label="t('yumRepo.software.executionNodes')" min-width="130" sortable />
        <el-table-column prop="message" :label="t('yumRepo.software.result')" min-width="200" sortable show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatMessage(row.message) }}
          </template>
        </el-table-column>
        <el-table-column prop="username" :label="t('yumRepo.software.user')" min-width="100" sortable />
        <el-table-column prop="end_time" :label="t('yumRepo.software.endedAt')" min-width="160" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('yumRepo.software.duration')" min-width="100" sortable>
          <template #default="{ row }">
            {{ calcTimeDiff(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 执行结果详情弹窗 - 复用 automation 模块的组件 -->
    <ExecuteResultDialog
      v-model:visible="runResultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { formatDateTime as formatDateTimeGlobal } from '@/utils/date'
import { softwareLogsApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { initTranslations } from '@/utils/i18n'
import { formatOperationLogMessage } from '@/utils/operationLogMessages'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'

const loading = ref(false)

// 筛选条件
const filterDay = ref('1') // 默认今天
const actionFilter = ref('')
const statusFilter = ref('')
const engineFilter = ref('')
const searchText = ref('')

// 表格数据
const tableData = ref([])
const allData = ref([]) // 原始数据，用于本地筛选

useActiveTaskListPolling({
  records: tableData,
  refresh: loadLogs
})

// 分页
const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})

// 筛选选项
const actionOptions = computed(() => {
  const actions = new Set()
  allData.value.forEach(row => {
    if (row.action) actions.add(row.action)
  })
  return Array.from(actions)
})

const engineOptions = computed(() => {
  const nodes = new Set()
  allData.value.forEach(row => {
    if (row.executor_node) nodes.add(row.executor_node)
  })
  return Array.from(nodes)
})

const statusOptions = [
  { value: 'RUNNING', get label() { return t('yumRepo.running') } },
  { value: 'ASYNC', get label() { return t('yumRepo.software.async') } },
  { value: 'COMPLETED', get label() { return t('automation.workbench.completed') } },
  { value: 'FAILED', get label() { return t('automation.stats.failed') } },
  { value: 'ERROR', get label() { return t('automation.flow.error') } }
]

// 状态定义（对应 jaoUtil.jobStatusDefs）
const jobStatusDefs = {
  RUNNING: { color: 'warning', get title() { return t('yumRepo.running') } },
  ASYNC: { color: 'info', get title() { return t('yumRepo.software.async') } },
  COMPLETED: { color: 'success', get title() { return t('automation.workbench.completed') } },
  FAILED: { color: 'danger', get title() { return t('automation.stats.failed') } },
  ERROR: { color: 'danger', get title() { return t('automation.flow.error') } },
  PENDING: { color: 'info', get title() { return t('automation.workbench.waiting') } },
  CANCELLED: { color: 'info', get title() { return t('automation.flow.cancelled') } }
}

// 执行结果弹窗
const runResultDialogVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  return formatDateTimeGlobal(dateStr)
}

/**
 * 计算时间差
 */
function calcTimeDiff(startTime, endTime) {
  if (!startTime || !endTime) return ''
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffMs = end - start

  if (diffMs < 0) return ''

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return t('yumRepo.software.seconds', { seconds })

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return t('yumRepo.software.minutesSeconds', { minutes, seconds: secs })

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return t('yumRepo.software.hoursMinutes', { hours, minutes: mins })
}

/**
 * 获取状态类型
 */
function getStatusType(status) {
  const def = jobStatusDefs[status]
  return def ? def.color : 'info'
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const def = jobStatusDefs[status]
  return def ? def.title : status
}

/**
 * 格式化消息
 */
function formatMessage(message) {
  return formatOperationLogMessage(message)
}

/**
 * 搜索处理
 */
function handleSearch() {
  pagination.value.page = 1
  loadLogs()
}

/**
 * 重置处理
 */
function handleReset() {
  filterDay.value = '1'
  actionFilter.value = ''
  statusFilter.value = ''
  engineFilter.value = ''
  searchText.value = ''
  pagination.value.page = 1
  loadLogs()
}

/**
 * 应用本地筛选
 */
function applyFilters() {
  let filtered = [...allData.value]

  if (actionFilter.value) {
    filtered = filtered.filter(row => row.action === actionFilter.value)
  }
  if (statusFilter.value) {
    filtered = filtered.filter(row => row.status === statusFilter.value)
  }
  if (engineFilter.value) {
    filtered = filtered.filter(row => row.executor_node === engineFilter.value)
  }
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    filtered = filtered.filter(row => {
      return (
        (row.action && row.action.toLowerCase().includes(keyword)) ||
        (row.message && row.message.toLowerCase().includes(keyword)) ||
        (row.username && row.username.toLowerCase().includes(keyword)) ||
        (row.executor_node && row.executor_node.toLowerCase().includes(keyword))
      )
    })
  }

  pagination.value.total = filtered.length

  // 分页
  const start = (pagination.value.page - 1) * pagination.value.size
  const end = start + pagination.value.size
  tableData.value = filtered.slice(start, end)
}

/**
 * 加载日志数据
 * 调用操作日志接口: /workflow/api/workflow/dashboard/list-operation-log
 * 返回格式: { total: number, records: [] }
 */
async function loadLogs() {
  loading.value = true
  try {
    const params = {
      module: 'secops',
      action: actionFilter.value || 'all',
      status: statusFilter.value || 'all',
      day: filterDay.value
    }
    const [response] = await Promise.all([
      softwareLogsApi.getOperationLogs(params),
      initTranslations()
    ])
    const records = response?.records || []
    allData.value = Array.isArray(records) ? records : []

    // 设置总数（服务端返回）
    pagination.value.total = response?.total || allData.value.length

    applyFilters()
  } catch (error) {
    console.error('Failed to load logs:', error)
    allData.value = []
    tableData.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

/**
 * 查看执行结果
 */
function handleViewRunResult(row) {
  if (!row.run_id) return

  currentRunId.value = row.run_id
  currentJobTitle.value = row.action || ''
  runResultDialogVisible.value = true
}

/**
 * 分页大小变更
 */
function handlePageSizeChange() {
  pagination.value.page = 1
  applyFilters()
}

/**
 * 页码变更
 */
function handlePageChange(page) {
  pagination.value.page = page
  applyFilters()
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped lang="scss">
/* 此组件使用全局的 ops-page-layout 样式 */

</style>
