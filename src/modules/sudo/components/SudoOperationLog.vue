<template>
  <div class="operation-log-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索"
          clearable
          style="width: 180px"
          @keyup.enter="loadData"
          @clear="loadData"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-select v-model="filters.action" placeholder="操作类型" clearable style="width: 150px" @change="loadData">
          <el-option label="全部操作" value="all" />
          <el-option label="设置密码复杂度" value="设置密码复杂度" />
          <el-option label="新增sudo配置" value="新增sudo配置" />
          <el-option label="扫描sudo配置" value="扫描sudo配置" />
          <el-option label="重置密码" value="重置密码" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px" @change="loadData">
          <el-option label="全部状态" value="all" />
          <el-option label="成功" value="COMPLETED" />
          <el-option label="失败" value="ERROR" />
        </el-select>
        <el-select v-model="filters.day" placeholder="时间范围" style="width: 120px" @change="loadData">
          <el-option label="最近1天" :value="1" />
          <el-option label="最近7天" :value="7" />
          <el-option label="最近30天" :value="30" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button @click="loadData" :loading="loading">
          <i class="fa fa-refresh"></i>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
      >
        <!-- 开始时间 -->
        <el-table-column prop="start_time" label="开始时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.start_time) }}
          </template>
        </el-table-column>
        <!-- 操作 -->
        <el-table-column prop="action" label="操作" min-width="140" />
        <!-- 状态 -->
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
              class="status-tag-clickable"
              @click="handleViewResult(row)"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- 执行引擎节点 -->
        <el-table-column prop="ata_node" label="执行引擎节点" min-width="140">
          <template #default="{ row }">
            {{ row.ata_node || '' }}
          </template>
        </el-table-column>
        <!-- 结果 -->
        <el-table-column prop="message" label="结果" min-width="140">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.status === 'ERROR' }">
              {{ row.message || '' }}
            </span>
          </template>
        </el-table-column>
        <!-- 用户 -->
        <el-table-column prop="username" label="用户" width="100" />
        <!-- 结束时间 -->
        <el-table-column prop="end_time" label="结束时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.end_time) }}
          </template>
        </el-table-column>
        <!-- 耗时 -->
        <el-table-column prop="duration" label="耗时" width="90">
          <template #default="{ row }">
            {{ formatDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
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
import * as sudoApi from '@/modules/sudo/api'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const loading = ref(false)
const tableData = ref([])
const resultDialogVisible = ref(false)
const selectedRunId = ref('')
const selectedJobTitle = ref('')

const filters = reactive({
  keyword: '',
  action: 'all',
  status: 'all',
  day: 1
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const response = await sudoApi.getOperationLog({
      keyword: filters.keyword,
      action: filters.action,
      status: filters.status,
      day: filters.day
    })

    const result = response?.data || response
    tableData.value = result?.records || []
    pagination.total = result?.total || tableData.value.length
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

    const pad = (n) => String(n).padStart(2, '0')
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.operation-log-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #f8fafc;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  .toolbar-left {
    display: flex;
    gap: 12px;
  }

  .toolbar-right {
    display: flex;
    gap: 10px;
  }
}

.table-container {
  flex: 1;
  min-height: 0;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.text-danger {
  color: #ef4444;
}

.status-tag-clickable {
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
}
</style>
