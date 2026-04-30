<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" style="width: 120px">
            <el-option label="全部" value="3650" />
            <el-option label="今天" value="0" />
            <el-option label="最近7天" value="7" />
            <el-option label="最近30天" value="30" />
            <el-option label="最近一年" value="365" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" style="width: 120px">
            <el-option label="全部状态" value="all" />
            <el-option label="等待中" value="WAITING" />
            <el-option label="运行中" value="RUNNING" />
            <el-option label="回调中" value="CALLBACK" />
            <el-option label="运行错误" value="ERROR" />
            <el-option label="运行失败" value="FAILED" />
            <el-option label="完成" value="COMPLETED" />
            <el-option label="运行终止" value="INTERRUPTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
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
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredLogs"
        height="100%"
        :default-sort="{ prop: 'start_time', order: 'descending' }"
      >
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDate(row.start_time) }}
          </template>
        </el-table-column>

        <el-table-column prop="job_title" label="作业" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.job_title || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="job_type" label="类型" width="100" />

        <el-table-column prop="username" label="用户" width="100" />

        <el-table-column prop="review_user" label="审核" width="80" />

        <el-table-column label="耗时" width="100" align="left">
          <template #default="{ row }">
            {{ formatTimeDiff(row.start_time, row.end_time) }}
          </template>
        </el-table-column>

        <el-table-column prop="end_time" label="结束时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDate(row.end_time) }}
          </template>
        </el-table-column>

        <el-table-column prop="ata_url" label="Ansible Node" width="140">
          <template #default="{ row }">
            <div class="ata-node-cell">
              <el-tag
                v-for="(node, idx) in parseAtaUrl(row.ata_url)"
                :key="idx"
                type="info"
                size="small"
              >{{ node }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusTagType(row.status)"
              size="small"
              style="cursor: pointer"
              @click="handleViewResult(row)"
            >{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="stats_json" label="详情" width="80">
          <template #default="{ row }">
            <span v-html="formatJobStats(row.stats_json)"></span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.job_type === 'script' && !['WAITING', 'RUNNING', 'CALLBACK'].includes(row.status)"
              text
              type="primary"
              size="small"
              @click="handleRerun(row)"
            >
              重运行
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="loadData"
      />
    </div>

    <!-- 运行结果对话框 -->
    <el-dialog
      v-model="showResultDialog"
      :title="currentLog?.job_title || '运行结果'"
      width="900px"
      class="result-dialog"
    >
      <div v-if="currentLog" class="log-detail">
        <div class="log-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="作业名称">{{ currentLog.job_title }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ currentLog.job_type }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <span :class="['status-badge', getStatusClass(currentLog.status)]">
                {{ getStatusText(currentLog.status) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="执行人">{{ currentLog.username }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatDate(currentLog.start_time) }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ formatDate(currentLog.end_time) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="log-output">
          <h4>执行输出</h4>
          <pre class="output-content">{{ currentLog.output || '无输出' }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="showResultDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import { useApi } from '@/core/api'

// 筛选条件
const filters = reactive({
  day: '0',
  status: 'all',
  keyword: ''
})

// 状态
const loading = ref(false)
const logs = ref([])
const tableRef = ref(null)
const pageSize = ref(10)
const currentPage = ref(1)
const total = ref(0)

// 结果对话框
const showResultDialog = ref(false)
const currentLog = ref(null)

// 过滤后的日志列表（本地搜索）
const filteredLogs = computed(() => {
  if (!filters.keyword) {
    return logs.value
  }
  const keyword = filters.keyword.toLowerCase()
  return logs.value.filter(log =>
    (log.job_title && log.job_title.toLowerCase().includes(keyword)) ||
    (log.job_type && log.job_type.toLowerCase().includes(keyword)) ||
    (log.username && log.username.toLowerCase().includes(keyword))
  )
})

// 分页信息
const paginationInfo = computed(() => {
  const totalCount = total.value || filteredLogs.value.length
  if (totalCount === 0) return '0 - 0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, totalCount)
  return `${start} - ${end} / ${totalCount}`
})

// 分页大小变化
function handlePageSizeChange() {
  currentPage.value = 1
  loadData()
}

// 搜索
function handleSearch() {
  currentPage.value = 1
  loadData()
}

// 重置
function handleReset() {
  filters.day = '0'
  filters.status = 'all'
  filters.keyword = ''
  currentPage.value = 1
  pageSize.value = 10
  loadData()
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await useApi().post('/dts/api/dts/q/data/JAO_LIST_RUN_LOGS/', {
      params: {
        type: 'command',
        day: filters.day,
        job_id: '',
        run_ids: '',
        status: filters.status
      },
      size: pageSize.value,
      page: currentPage.value,
      orderBy: 'start_time desc',
      filter: filters.keyword || ''
    })
    const data = response.data || response || {}
    logs.value = data.records || data || []
    total.value = data.total || logs.value.length
  } catch (error) {
    console.error('加载日志失败:', error)
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

// 查看运行结果
async function handleViewResult(row) {
  currentLog.value = row
  showResultDialog.value = true
}

// 重新运行
async function handleRerun(row) {
  try {
    await ElMessageBox.confirm(
      '确定要重新运行此作业吗？',
      '重新运行',
      { type: 'warning' }
    )
    await useApi().post('/jao/api/jao/job/rerun', {
      runId: row.id
    })
    ElMessage.success('已提交重新运行')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新运行失败:', error)
      ElMessage.error('重新运行失败')
    }
  }
}

// 解析 Ansible Node URL
function parseAtaUrl(ataUrl) {
  if (!ataUrl) return []
  return ataUrl.split(',').filter(s => s.trim())
}

// 获取状态样式类
function getStatusClass(status) {
  const statusMap = {
    'WAITING': 'status-secondary',
    'RUNNING': 'status-primary',
    'CALLBACK': 'status-primary',
    'ERROR': 'status-warning',
    'FAILED': 'status-danger',
    'COMPLETED': 'status-success',
    'INTERRUPTED': 'status-dark'
  }
  return statusMap[status] || 'status-secondary'
}

// 获取状态 Tag 类型
function getStatusTagType(status) {
  const statusMap = {
    'WAITING': 'info',
    'RUNNING': 'primary',
    'CALLBACK': 'primary',
    'ERROR': 'warning',
    'FAILED': 'danger',
    'COMPLETED': 'success',
    'INTERRUPTED': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'WAITING': '等待中',
    'RUNNING': '运行中',
    'CALLBACK': '回调中',
    'ERROR': '运行错误',
    'FAILED': '运行失败',
    'COMPLETED': '完成',
    'INTERRUPTED': '运行终止'
  }
  return statusMap[status] || status || '未知'
}

// 格式化日期
function formatDate(dateStr) {
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

// 格式化耗时
function formatTimeDiff(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const diff = end - start
  if (diff < 0) return '-'

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// 格式化作业统计信息
function formatJobStats(statsJson) {
  if (!statsJson) return ''
  try {
    const stats = JSON.parse(statsJson)
    let html = ''
    if (stats.ok) html += `<span class="text-success">${stats.ok}</span>`
    if (stats.changed) html += `<span class="text-warning">${stats.changed}</span>`
    if (stats.unreachable) html += `<span class="text-danger">${stats.unreachable}</span>`
    if (stats.failed) html += `<span class="text-danger">${stats.failed}</span>`
    return html || '-'
  } catch (e) {
    return '-'
  }
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
  background: var(--el-bg-color);
}

.logs-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.logs-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;

  .filter-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.logs-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px 20px;
}

.logs-pagination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);

  .pagination-info {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

// Ansible Node 单元格
.ata-node-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// 徽章样式
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.badge-secondary {
  background-color: var(--el-text-color-secondary);
  color: #fff;
}

// 状态徽章
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;

  &.status-secondary {
    background-color: var(--el-text-color-secondary);
  }

  &.status-primary {
    background-color: var(--el-color-primary);
  }

  &.status-success {
    background-color: #28a745;
  }

  &.status-warning {
    background-color: #ffc107;
    color: var(--el-text-color-primary);
  }

  &.status-danger {
    background-color: #dc3545;
  }

  &.status-dark {
    background-color: var(--el-fill-color-dark);
  }
}

// 统计颜色
.text-success {
  color: #28a745;
  margin-right: 4px;
}

.text-warning {
  color: #ffc107;
  margin-right: 4px;
}

.text-danger {
  color: #dc3545;
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}

// 日志详情
.log-detail {
  .log-info {
    margin-bottom: 20px;
  }

  .log-output {
    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
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
    background-color: var(--el-fill-color-light) !important;
    color: var(--el-text-color-regular);
    font-weight: 500;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-table__row {
    &:hover > td {
      background-color: var(--el-fill-color-light) !important;
    }
  }

  .el-table__cell {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

:deep(.el-select) {
  .el-input__wrapper {
    border-radius: 4px;
  }
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

:deep(.el-button.is-link) {
  color: var(--el-text-color-secondary);
  padding: 4px 8px;

  &:hover {
    color: var(--el-color-primary);
  }

  i {
    font-size: 14px;
  }
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 12px 20px;
}
</style>
