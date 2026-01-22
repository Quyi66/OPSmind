<template>
  <el-dialog
    v-model="visible"
    title="操作记录"
    width="90%"
    destroy-on-close
    class="operation-logs-dialog"
  >
    <div class="dialog-content">
      <!-- 筛选栏 -->
      <div class="ops-filter-bar">
        <el-form inline size="small">
          <el-form-item label="时间范围">
            <el-select v-model="dayFilter" style="width: 100px" @change="handleFilterChange">
              <el-option label="今天" :value="1" />
              <el-option label="近3天" :value="3" />
              <el-option label="近7天" :value="7" />
              <el-option label="近30天" :value="30" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="statusFilter" style="width: 100px" clearable @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="完成" value="COMPLETED" />
              <el-option label="失败" value="FAILED" />
              <el-option label="运行中" value="RUNNING" />
              <el-option label="等待中" value="WAITING" />
            </el-select>
          </el-form-item>
          <el-form-item label="操作">
            <el-select v-model="actionFilter" style="width: 150px" clearable @change="handleFilterChange">
              <el-option label="全部" value="all" />
              <el-option label="补丁扫描" value="#{app_vap.menu.patch_scan.title}" />
              <el-option label="补丁安装" value="#{app_vap.menu.patch_install.title}" />
              <el-option label="补丁回退" value="#{app_vap.menu.patch_rollback.title}" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        size="small"
        max-height="500px"
      >
        <el-table-column prop="start_time" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120">
          <template #default="{ row }">
            {{ formatAction(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" width="140" show-overflow-tooltip />
        <el-table-column prop="message" label="结果" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatMessage(row.message) }}
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" width="100" />
        <el-table-column prop="end_time" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ calculateDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              text
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          small
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </el-dialog>

  <!-- 详情对话框 -->
  <ExecuteResultDialog
    v-if="detailDialogVisible"
    v-model:visible="detailDialogVisible"
    :run-id="selectedRunId"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  highlightRunId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const tableData = ref([])
const dayFilter = ref(1)
const statusFilter = ref('all')
const actionFilter = ref('all')
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const detailDialogVisible = ref(false)
const selectedRunId = ref('')

let pollingTimer = null

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const { useApi } = await import('@/core/api')
    const cacheBuster = Date.now()
    const response = await useApi().post(
      `/dts/api/dts/q/data/JAO_LIST_OPERATION_LOG/?cacheBuster=${cacheBuster}`,
      {
        params: {
          module: 'vap2',
          action: actionFilter.value === 'all' ? 'all' : actionFilter.value,
          status: statusFilter.value === 'all' ? 'all' : statusFilter.value,
          day: dayFilter.value
        }
      }
    )

    if (response?.data) {
      tableData.value = response.data.records || []
      pagination.value.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load operation logs:', error)
    ElMessage.error('加载操作记录失败')
  } finally {
    loading.value = false
  }
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (error) {
    return timestamp
  }
}

// 格式化操作类型
function formatAction(action) {
  const actionMap = {
    '#{app_vap.menu.patch_scan.title}': '补丁扫描',
    '#{app_vap.menu.patch_install.title}': '补丁安装',
    '#{app_vap.menu.patch_rollback.title}': '补丁回退',
    '#{app_vap.menu.win_patch_scan.title}': 'Windows扫描',
    '#{app_vap.menu.import_patch_library_time}': '定时导入补丁库'
  }
  return actionMap[action] || action
}

// 获取状态类型
function getStatusType(status) {
  const typeMap = {
    COMPLETED: 'success',
    FAILED: 'danger',
    RUNNING: 'warning',
    WAITING: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const textMap = {
    COMPLETED: '完成',
    FAILED: '运行失败',
    RUNNING: '正在运行',
    WAITING: '等待中'
  }
  return textMap[status] || status
}

// 格式化消息
function formatMessage(message) {
  if (!message) return '-'
  try {
    const msg = JSON.parse(message)
    return msg.msg_id || message
  } catch {
    return message
  }
}

// 计算耗时
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diff = Math.floor((end - start) / 1000) // 秒
    const hours = Math.floor(diff / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const seconds = diff % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

// 查看详情
function handleViewDetail(row) {
  if (!row.run_id) return
  selectedRunId.value = row.run_id
  detailDialogVisible.value = true
}

// 筛选变化
function handleFilterChange() {
  pagination.value.page = 1
  loadData()
}

// 刷新
function handleRefresh() {
  loadData()
}

// 分页变化
function handlePageChange(page) {
  pagination.value.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadData()
}

// 开始轮询
function startPolling() {
  stopPolling()
  pollingTimer = setInterval(() => {
    // 如果有运行中或等待中的任务，继续轮询
    const hasRunningTasks = tableData.value.some(
      row => row.status === 'RUNNING' || row.status === 'WAITING'
    )
    if (hasRunningTasks) {
      loadData()
    }
  }, 5000) // 每5秒刷新一次
}

// 停止轮询
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 监听对话框打开
watch(() => props.modelValue, (val) => {
  if (val) {
    loadData()
    startPolling()
  } else {
    stopPolling()
  }
})

onMounted(() => {
  if (props.modelValue) {
    loadData()
    startPolling()
  }
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.operation-logs-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
