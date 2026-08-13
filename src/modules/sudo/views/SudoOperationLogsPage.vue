<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="搜索" clearable style="width: 180px" @keyup.enter="handleSearch" @clear="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 150px" @change="handleSearch">
            <el-option label="全部操作" value="all" />
            <el-option label="设置密码复杂度" value="设置密码复杂度" />
            <el-option label="新增sudo配置" value="新增sudo配置" />
            <el-option label="扫描sudo配置" value="扫描sudo配置" />
            <el-option label="重置密码" value="重置密码" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px" @change="handleSearch">
            <el-option label="全部状态" value="all" />
            <el-option label="成功" value="COMPLETED" />
            <el-option label="失败" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" placeholder="全部" style="width: 120px" @change="handleSearch">
            <el-option label="全部时间" value="all" />
            <el-option label="最近1天" value="1" />
            <el-option label="最近7天" value="7" />
            <el-option label="最近30天" value="30" />
            <el-option label="最近一年" value="365" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
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
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
        max-height="calc(100vh - 264px)"
      >
        <el-table-column prop="start_time" label="开始时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="140" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <RunLogStatusTag
              :type="getStatusType(row.status)"
              size="small"
              :clickable="!!row.run_id"
              @click="handleViewResult(row)"
            >
              {{ getStatusText(row.status) }}
            </RunLogStatusTag>
          </template>
        </el-table-column>
        <el-table-column prop="executor_node" label="执行引擎节点" min-width="140">
          <template #default="{ row }">
            {{ row.executor_node || '' }}
          </template>
        </el-table-column>
        <el-table-column prop="message" label="结果" min-width="140">
          <template #default="{ row }">
            <span>
              {{ row.message || '' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" width="100" />
        <el-table-column prop="end_time" label="结束时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="90">
          <template #default="{ row }">
            {{ formatDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 作业运行结果弹窗 -->
    <ExecuteResultDialog
      v-model:visible="resultDialogVisible"
      :run-id="selectedRunId"
      :job-title="selectedJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as sudoApi from '@/modules/sudo/api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'
import RunLogStatusTag from '@/components/shared/RunLogStatusTag.vue'

const loading = ref(false)
const tableData = ref([])

useActiveTaskListPolling({
  records: tableData,
  refresh: loadData
})
const resultDialogVisible = ref(false)
const selectedRunId = ref('')
const selectedJobTitle = ref('')

const filters = reactive({
  keyword: '',
  action: 'all',
  status: 'all',
  day: '1'
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  filters.keyword = ''
  filters.action = 'all'
  filters.status = 'all'
  filters.day = '1'
  pagination.page = 1
  pagination.pageSize = 10
  loadData()
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await sudoApi.getOperationLog({
      action: filters.action,
      status: filters.status,
      day: filters.day,
      keyword: filters.keyword,
      page: pagination.page,
      size: pagination.pageSize
    })

    tableData.value = response?.records || []
    pagination.total = response?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load operation log:', error)
    ElMessage.error('加载操作记录失败')
  } finally {
    loading.value = false
  }
}

function handleViewResult(row) {
  if (!row.run_id) {
    ElMessage.warning('无法获取执行详情')
    return
  }
  selectedRunId.value = row.run_id
  selectedJobTitle.value = row.action || ''
  resultDialogVisible.value = true
}

function getStatusType(status) {
  switch (status) {
    case 'COMPLETED':
    case 'SUCCESS':
      return 'success'
    case 'ERROR':
    case 'FAILED':
      return 'danger'
    case 'RUNNING':
      return 'primary'
    case 'WAITING':
      return 'warning'
    default:
      return 'info'
  }
}

function getStatusText(status) {
  switch (status) {
    case 'COMPLETED':
    case 'SUCCESS':
      return '成功'
    case 'ERROR':
    case 'FAILED':
      return '失败'
    case 'RUNNING':
      return '执行中'
    case 'WAITING':
      return '等待中'
    default:
      return status
  }
}

function formatTime(time) {
  if (!time) return ''
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return ''
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    if (diffMs < 0) return ''

    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = n => String(n).padStart(2, '0')
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.text-danger {
  color: var(--el-color-danger);
}

</style>
