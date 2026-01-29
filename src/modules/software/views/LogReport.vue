<template>
  <div class="ops-page-layout">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="时间范围">
          <el-select v-model="filterDay" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="今天" value="1" />
            <el-option label="最近7天" value="7" />
            <el-option label="最近30天" value="30" />
            <el-option label="最近一年" value="365" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行引擎">
          <el-select
            v-model="engineFilter"
            placeholder="全部"
            clearable
            style="width: 130px"
          >
            <el-option
              v-for="node in engineOptions"
              :key="node"
              :label="node"
              :value="node"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="statusFilter"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select
            v-model="actionFilter"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="action in actionOptions"
              :key="action"
              :label="action"
              :value="action"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="searchText"
            placeholder="搜索..."
            clearable
            style="width: 180px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadLogs" title="刷新">
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
        height="calc(100vh - 300px)"
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
        <el-table-column prop="message" label="结果" min-width="200" sortable show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatMessage(row.message) }}
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
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
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
      action: actionFilter.value || 'all',
      status: statusFilter.value || 'all',
      day: filterDay.value
    }
    const response = await softwareLogsApi.getOperationLogs(params)
    // 返回格式: { total: number, records: [] }
    const data = response?.data || response || {}
    const records = data.records || []
    allData.value = Array.isArray(records) ? records : []

    // 设置总数（服务端返回）
    pagination.value.total = data.total || allData.value.length

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

.status-badge {
  &.clickable {
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
