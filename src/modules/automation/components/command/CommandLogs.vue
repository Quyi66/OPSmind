<template>
  <div class="command-logs">
    <!-- 标题栏 -->
    <div class="logs-header">
      <nav class="navbar navbar-light">
        <div class="navbar-title">日志</div>
        <div class="navbar-actions">
          <el-button type="primary" plain @click="showCleanDialog = true">
            <i class="fas fa-broom"></i>
            清理日志
          </el-button>
        </div>
      </nav>
    </div>

    <!-- 工具栏 -->
    <div class="logs-toolbar">
      <div class="toolbar-left">
        <el-button @click="loadData">
          <i class="fas fa-sync-alt"></i>
          刷新
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索"
          style="width: 200px"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>

    <!-- 日志表格 -->
    <div class="logs-table">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredLogs"
        border
        height="100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="jobTitle" label="作业名称" min-width="200" sortable>
          <template #default="{ row }">
            <a class="name-link" @click.stop="handleViewLog(row)">
              {{ row.jobTitle || row.id }}
            </a>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="类型" width="100" align="center" sortable />

        <el-table-column prop="status" label="状态" width="100" align="center" sortable>
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="startTime" label="开始时间" width="170" align="center" sortable>
          <template #default="{ row }">
            {{ formatDate(row.startTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="endTime" label="结束时间" width="170" align="center" sortable>
          <template #default="{ row }">
            {{ formatDate(row.endTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="duration" label="耗时" width="100" align="center">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>

        <el-table-column prop="createdBy" label="执行人" width="100" align="center" sortable />

        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link @click.stop="handleViewLog(row)" title="查看详情">
              <i class="fas fa-eye"></i>
            </el-button>
            <el-button link @click.stop="handleDeleteLog(row)" title="删除">
              <i class="fas fa-trash-alt"></i>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="logs-pagination">
      <el-select v-model="pageSize" style="width: 70px" @change="handlePageSizeChange">
        <el-option :value="10" label="10" />
        <el-option :value="25" label="25" />
        <el-option :value="50" label="50" />
        <el-option :value="100" label="100" />
      </el-select>
      <span class="pagination-info">{{ paginationInfo }}</span>
    </div>

    <!-- 清理日志对话框 -->
    <el-dialog
      v-model="showCleanDialog"
      title="清理日志"
      width="400px"
    >
      <el-form label-width="100px">
        <el-form-item label="清理策略">
          <el-select v-model="cleanPolicy" style="width: 100%">
            <el-option label="1小时前" value="1" />
            <el-option label="24小时前" value="24" />
            <el-option label="7天前" value="7" />
            <el-option label="30天前" value="30" />
            <el-option label="全部清理" value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="handleCleanLogs">
          开始清理
        </el-button>
        <el-button @click="showCleanDialog = false">
          取消
        </el-button>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="showLogDetail"
      :title="currentLog?.jobTitle || '日志详情'"
      width="900px"
    >
      <div v-if="currentLog" class="log-detail">
        <div class="log-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="作业名称">{{ currentLog.jobTitle }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ currentLog.type }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusType(currentLog.status)" size="small">
                {{ getStatusText(currentLog.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="执行人">{{ currentLog.createdBy }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatDate(currentLog.startTime) }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ formatDate(currentLog.endTime) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="log-output">
          <h4>执行输出</h4>
          <pre class="output-content">{{ currentLog.output || '无输出' }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="showLogDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useApi } from '@/core/api'

// 状态
const loading = ref(false)
const logs = ref([])
const searchKeyword = ref('')
const tableRef = ref(null)
const pageSize = ref(10)

// 清理对话框
const showCleanDialog = ref(false)
const cleanPolicy = ref('1')

// 日志详情
const showLogDetail = ref(false)
const currentLog = ref(null)

// 过滤后的日志列表
const filteredLogs = computed(() => {
  if (!searchKeyword.value) {
    return logs.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return logs.value.filter(log =>
    (log.jobTitle && log.jobTitle.toLowerCase().includes(keyword)) ||
    (log.type && log.type.toLowerCase().includes(keyword)) ||
    (log.createdBy && log.createdBy.toLowerCase().includes(keyword))
  )
})

// 分页信息
const paginationInfo = computed(() => {
  const total = filteredLogs.value.length
  if (total === 0) return '0 - 0 / 0'
  const start = 1
  const end = Math.min(pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 分页大小变化
function handlePageSizeChange() {
  // 当前简单实现
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await useApi().get('/jao/api/jao/run-log', {
      params: { type: 'command' }
    })
    logs.value = response.data || response || []
  } catch (error) {
    console.error('加载日志失败:', error)
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  // 搜索通过 computed 自动处理
}

// 查看日志详情
async function handleViewLog(row) {
  try {
    const response = await useApi().get(`/jao/api/jao/run-log/${row.id}`)
    currentLog.value = response.data || response || row
    showLogDetail.value = true
  } catch (error) {
    console.error('加载日志详情失败:', error)
    currentLog.value = row
    showLogDetail.value = true
  }
}

// 行点击
function handleRowClick(row) {
  handleViewLog(row)
}

// 删除日志
async function handleDeleteLog(row) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条日志吗？',
      '删除日志',
      { type: 'warning' }
    )
    await useApi().delete(`/jao/api/jao/run-log/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除日志失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 清理日志
async function handleCleanLogs() {
  try {
    await ElMessageBox.confirm(
      '确定要清理日志吗？此操作不可恢复。',
      '清理日志',
      { type: 'warning' }
    )
    await useApi().post('/jao/api/jao/run-log/clean', {
      policy: cleanPolicy.value
    })
    ElMessage.success('清理成功')
    showCleanDialog.value = false
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理日志失败:', error)
      ElMessage.error('清理失败')
    }
  }
}

// 获取状态类型
function getStatusType(status) {
  switch (status) {
    case 'SUCCESS':
    case 'COMPLETED': return 'success'
    case 'RUNNING': return 'warning'
    case 'FAILED':
    case 'ERROR': return 'danger'
    default: return 'info'
  }
}

// 获取状态文本
function getStatusText(status) {
  switch (status) {
    case 'SUCCESS': return '成功'
    case 'COMPLETED': return '完成'
    case 'RUNNING': return '运行中'
    case 'FAILED': return '失败'
    case 'ERROR': return '错误'
    case 'PENDING': return '等待中'
    default: return status || '未知'
  }
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '/')
}

// 格式化耗时
function formatDuration(duration) {
  if (!duration && duration !== 0) return '-'
  if (duration < 1000) return `${duration}ms`
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
  return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
}

// 刷新方法
function refresh() {
  loadData()
}

// 初始化
onMounted(() => {
  loadData()
})

// 暴露方法
defineExpose({
  refresh,
  loadData
})
</script>

<style scoped lang="scss">
.command-logs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.logs-header {
  border-bottom: 1px solid #dee2e6;

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    margin: 0;
  }

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
  }
}

.logs-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 16px;
}

.logs-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #dee2e6;

  .pagination-info {
    font-size: 13px;
    color: #6c757d;
  }
}

.name-link {
  color: #0d6efd;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.log-detail {
  .log-info {
    margin-bottom: 20px;
  }

  .log-output {
    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: #212529;
    }

    .output-content {
      background: #1e1e2e;
      color: #cdd6f4;
      padding: 16px;
      border-radius: 4px;
      max-height: 300px;
      overflow: auto;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
    }
  }
}

:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    background-color: #f8f9fa !important;
    color: #495057;
    font-weight: 600;
    border-bottom: 1px solid #dee2e6;
  }

  .el-table__row {
    cursor: pointer;

    &:hover > td {
      background-color: #f8f9fa !important;
    }
  }

  .el-table__cell {
    border-bottom: 1px solid #dee2e6;
  }
}

:deep(.el-button) {
  border-radius: 4px;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

:deep(.el-button.is-link) {
  color: #6c757d;

  &:hover {
    color: #0d6efd;
  }

  i {
    font-size: 14px;
  }
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #dee2e6;
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #dee2e6;
  padding: 12px 20px;
}
</style>
