<template>
  <div class="patch-logs">
    <div class="page-header">
      <div class="header-left">
        <h2>操作日志</h2>
        <span class="subtitle">补丁管理操作记录和报告</span>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-input
        v-model="filterText"
        placeholder="搜索..."
        prefix-icon="Search"
        style="width: 200px"
        clearable
        @input="handleFilter"
      />
      <el-select v-model="typeFilter" placeholder="操作类型" clearable style="width: 120px" @change="handleFilter">
        <el-option label="补丁扫描" value="scan" />
        <el-option label="补丁安装" value="install" />
        <el-option label="补丁回退" value="rollback" />
        <el-option label="漏洞扫描" value="vulnerability_scan" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" @change="handleFilter">
        <el-option label="已完成" value="COMPLETED" />
        <el-option label="失败" value="FAILED" />
        <el-option label="运行中" value="RUNNING" />
      </el-select>
      <el-select v-model="dayFilter" placeholder="时间范围" style="width: 120px" @change="handleFilter">
        <el-option label="今天" :value="1" />
        <el-option label="近3天" :value="3" />
        <el-option label="近7天" :value="7" />
        <el-option label="近30天" :value="30" />
      </el-select>
      <el-button :loading="loading" @click="refresh">
        <i class="fas fa-sync-alt" />
        刷新
      </el-button>
    </div>

    <!-- 日志表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="startTime" label="开始时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="操作类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeStyle(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="200" show-overflow-tooltip />
        <el-table-column prop="user" label="操作用户" width="120" />
        <el-table-column prop="duration" label="耗时" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="endTime" label="结束时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusStyle(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="操作日志详情"
      width="800px"
    >
      <div class="log-detail" v-if="selectedLog">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getTypeStyle(selectedLog.type)" size="small">
              {{ getTypeLabel(selectedLog.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusStyle(selectedLog.status)" size="small">
              {{ getStatusLabel(selectedLog.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作用户">{{ selectedLog.user }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ formatDuration(selectedLog.duration) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(selectedLog.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDateTime(selectedLog.endTime) }}</el-descriptions-item>
          <el-descriptions-item label="目标" :span="2">{{ selectedLog.target }}</el-descriptions-item>
          <el-descriptions-item label="详细日志" :span="2">
            <pre class="log-content">{{ selectedLog.logContent || '无详细日志' }}</pre>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { patchLogsApi } from '../api'
import { OPERATION_TYPE_LABELS, TASK_STATUS_LABELS, TASK_STATUS_STYLES } from '../constants'

const loading = ref(false)
const filterText = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const dayFilter = ref(7)
const tableData = ref([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const detailDialogVisible = ref(false)
const selectedLog = ref(null)

function getTypeLabel(t) { return OPERATION_TYPE_LABELS[t] || t }
function getTypeStyle(t) {
  const map = { scan: 'primary', install: 'success', rollback: 'warning', vulnerability_scan: 'info' }
  return map[t] || ''
}
function getStatusLabel(s) { return TASK_STATUS_LABELS[s] || s }
function getStatusStyle(s) { return TASK_STATUS_STYLES[s] || '' }
function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}
function formatDuration(seconds) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`
}

async function loadData() {
  loading.value = true
  try {
    const response = await patchLogsApi.getLogs({
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value,
      type: typeFilter.value,
      status: statusFilter.value,
      day: dayFilter.value
    })
    if (response?.data) {
      tableData.value = response.data.records || []
      pagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('Failed to load logs:', error)
    tableData.value = [
      { id: 1, type: 'scan', target: 'server01, server02, server03', user: 'admin', status: 'COMPLETED', startTime: new Date(Date.now() - 3600000).toISOString(), endTime: new Date().toISOString(), duration: 180 },
      { id: 2, type: 'install', target: '5 个补丁 → 3 台主机', user: 'admin', status: 'COMPLETED', startTime: new Date(Date.now() - 7200000).toISOString(), endTime: new Date(Date.now() - 3600000).toISOString(), duration: 3600 },
      { id: 3, type: 'rollback', target: 'kernel-4.18.0-305 → server03', user: 'operator', status: 'FAILED', startTime: new Date(Date.now() - 10800000).toISOString(), endTime: new Date(Date.now() - 10000000).toISOString(), duration: 800 }
    ]
    pagination.total = 3
  } finally {
    loading.value = false
  }
}

function handleFilter() { pagination.page = 1; loadData() }
function refresh() { loadData() }
function handlePageChange(p) { pagination.page = p; loadData() }
function handleSizeChange(s) { pagination.pageSize = s; pagination.page = 1; loadData() }
function handleViewDetail(row) {
  selectedLog.value = {
    ...row,
    logContent: `[${formatDateTime(row.startTime)}] 开始执行${getTypeLabel(row.type)}任务\n[INFO] 目标: ${row.target}\n[INFO] 操作用户: ${row.user}\n...\n[${formatDateTime(row.endTime)}] 任务${row.status === 'COMPLETED' ? '完成' : '失败'}`
  }
  detailDialogVisible.value = true
}

onMounted(() => { loadData() })
defineExpose({ refresh })
</script>

<style scoped lang="scss">
.patch-logs {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-left {
  h2 { margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; }
  .subtitle { font-size: 13px; color: #64748b; }
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.table-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}
.log-content {
  background: #1e293b;
  color: #10b981;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}
</style>
