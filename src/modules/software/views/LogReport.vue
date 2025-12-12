<template>
  <div class="log-report">
    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <!-- 时间范围筛选（右侧） -->
        <div class="toolbar-right">
          <span class="filter-label">时间范围：</span>
          <el-select v-model="filterDay" style="width: 120px" @change="handleDayChange">
            <el-option label="All" value="all" />
            <el-option label="Today" value="1" />
            <el-option label="Last 7 Days" value="7" />
            <el-option label="Last 30 Days" value="30" />
            <el-option label="Last Year" value="365" />
          </el-select>
        </div>
      </div>

      <!-- 筛选器行 -->
      <div class="filter-bar">
        <div class="filter-bar-right">
          <el-select
            v-model="engineFilter"
            placeholder="执行引擎节点"
            clearable
            style="width: 130px"
            @change="handleFilterChange"
          >
            <el-option
              v-for="node in engineOptions"
              :key="node"
              :label="node"
              :value="node"
            />
          </el-select>
          <el-select
            v-model="statusFilter"
            placeholder="状态"
            clearable
            style="width: 100px"
            @change="handleFilterChange"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
          <el-select
            v-model="actionFilter"
            placeholder="操作"
            clearable
            style="width: 100px"
            @change="handleFilterChange"
          >
            <el-option
              v-for="action in actionOptions"
              :key="action"
              :label="action"
              :value="action"
            />
          </el-select>
          <el-input
            v-model="searchText"
            placeholder="搜索..."
            clearable
            style="width: 180px"
            @input="handleFilterChange"
          >
            <template #prefix>
              <i class="fa fa-search" />
            </template>
          </el-input>
          <el-button :icon="Refresh" @click="loadLogs" />
        </div>
      </div>

      <!-- 日志表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
        size="default"
        row-key="run_id"
        :default-sort="{ prop: 'start_time', order: 'descending' }"
        empty-text="没有数据"
      >
        <el-table-column prop="start_time" label="开始时间" min-width="160" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="120" sortable />
        <el-table-column prop="status" label="状态" min-width="100" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
              class="status-badge"
              :class="{ 'clickable': row.run_record }"
              @click="row.run_record && handleViewRunResult(row)"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" min-width="130" sortable />
        <el-table-column prop="message" label="结果" min-width="200" sortable>
          <template #default="{ row }">
            <span class="message-text">{{ formatMessage(row.message) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" min-width="100" sortable />
        <el-table-column prop="end_time" label="结束时间" min-width="160" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" min-width="100" sortable>
          <template #default="{ row }">
            {{ calcTimeDiff(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部分页 -->
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
import { ref, computed, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { softwareLogsApi } from '../api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

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
    if (row.ata_node) nodes.add(row.ata_node)
  })
  return Array.from(nodes)
})

const statusOptions = [
  { value: 'RUNNING', label: '执行中' },
  { value: 'ASYNC', label: '异步' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'FAILED', label: '失败' },
  { value: 'ERROR', label: '错误' }
]

// 状态定义（对应 jaoUtil.jobStatusDefs）
const jobStatusDefs = {
  RUNNING: { color: 'warning', title: '执行中' },
  ASYNC: { color: 'info', title: '异步' },
  COMPLETED: { color: 'success', title: '已完成' },
  FAILED: { color: 'danger', title: '失败' },
  ERROR: { color: 'danger', title: '错误' },
  PENDING: { color: 'info', title: '等待中' },
  CANCELLED: { color: 'info', title: '已取消' }
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
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
  if (seconds < 60) return `${seconds}秒`

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}分${secs}秒`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}时${mins}分`
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
  if (!message) return ''
  try {
    const obj = JSON.parse(message)
    const msgId = obj.msg_id
    if (!msgId) return message
    return message
  } catch {
    return message
  }
}

/**
 * 时间范围变更
 */
function handleDayChange() {
  pagination.value.page = 1
  loadLogs()
}

/**
 * 筛选变更
 */
function handleFilterChange() {
  pagination.value.page = 1
  applyFilters()
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
    filtered = filtered.filter(row => row.ata_node === engineFilter.value)
  }
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    filtered = filtered.filter(row => {
      return (
        (row.action && row.action.toLowerCase().includes(keyword)) ||
        (row.message && row.message.toLowerCase().includes(keyword)) ||
        (row.username && row.username.toLowerCase().includes(keyword)) ||
        (row.ata_node && row.ata_node.toLowerCase().includes(keyword))
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
 * 调用数据集: JAO_LIST_OPERATION_LOG
 * 返回格式: { total: number, records: [] }
 */
async function loadLogs() {
  loading.value = true
  try {
    const params = {
      module: 'spm',
      action: 'all',
      status: 'all',
      day: filterDay.value
    }
    const response = await softwareLogsApi.getOperationLogs(params)
    // 返回格式: { total: number, records: [] }
    const data = response?.data || response || {}
    const records = data.records || []
    allData.value = Array.isArray(records) ? records : []

    // 设置总数（服务端返回）
    pagination.value.total = data.total || allData.value.length

    // 重置筛选
    actionFilter.value = ''
    statusFilter.value = ''
    engineFilter.value = ''
    searchText.value = ''

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
.log-report {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.page-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;

  .page-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }
}

.main-content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 16px;

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-label {
      color: #409eff;
      font-size: 14px;
    }
  }
}

.filter-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 12px;

  .filter-bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.status-badge {
  &.clickable {
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}

.message-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;

  .footer-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .total-text {
      color: #606266;
      font-size: 14px;
    }
  }
}

// 表格样式优化
:deep(.el-table) {
  .el-table__header-wrapper {
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 500;
    }
  }

  .el-table__empty-block {
    min-height: 200px;
  }

  .el-table__empty-text {
    color: #909399;
  }
}
</style>
