<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" style="width: 140px">
            <el-option label="全部" value="3650" />
            <el-option label="今天" value="0" />
            <el-option label="最近7天" value="7" />
            <el-option label="最近30天" value="30" />
            <el-option label="最近一年" value="365" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="状态筛选" style="width: 140px">
            <el-option label="全部状态" value="all" />
            <el-option label="等待中" value="WAITING" />
            <el-option label="正在运行" value="RUNNING" />
            <el-option label="回调" value="CALLBACK" />
            <el-option label="运行错误" value="ERROR" />
            <el-option label="运行失败" value="FAILED" />
            <el-option label="完成" value="COMPLETED" />
            <el-option label="运行终止" value="INTERRUPTED" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.search"
            placeholder="搜索作业标题"
            clearable
            style="width: 240px"
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
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="handleRefresh" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        max-height="calc(100vh - 230px)"
      >
        <el-table-column label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>

        <el-table-column label="作业" show-overflow-tooltip>
          <template #default="{ row }">
            {{ translateText(row.job_title) }}
          </template>
        </el-table-column>

        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ getJobTypeLabel(row.job_type) }}
          </template>
        </el-table-column>

        <el-table-column label="用户" width="100">
          <template #default="{ row }">
            {{ row.username || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="审核" width="100">
          <template #default="{ row }">
            {{ row.review_user || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="耗时" width="100">
          <template #default="{ row }">
            {{ calculateDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>

        <el-table-column label="结束时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>

        <el-table-column label="Ansible Node" width="150">
          <template #default="{ row }">
            <div class="node-list">
              <el-tag
                v-for="(ip, index) in parseNodes(row.ata_url)"
                :key="index"
                size="small"
                type="info"
              >
                {{ ip }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              style="cursor: pointer"
              @click="handleViewResult(row)"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="详情" width="150">
          <template #default="{ row }">
            <div class="stats-info">{{ formatStats(row.stats_json) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="canRerun(row)"
              type="primary"
              text
              size="small"
              @click="handleRerun(row)"
            >
              重新启动
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </div>

    <ExecuteResultDialog
      v-if="resultDialogVisible"
      v-model:visible="resultDialogVisible"
      :run-id="resultMeta.runId"
      :job-title="resultMeta.jobTitle"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteResultDialog from './JobListView/ExecuteResultDialog.vue'
import { translateText } from '@/utils/i18n.js'

const loading = ref(false)
const tableData = ref([])
const filters = ref({
  day: '0',
  status: 'all',
  search: '',
  job_id: '',
  type: '',
  run_ids: ''
})
const pagination = ref({
  page: 1,
  size: 10,
  total: 0
})
const resultDialogVisible = ref(false)
const resultMeta = ref({ runId: '', jobTitle: '' })

let searchTimeout = null

const jobTypeMap = {
  script: '脚本作业',
  playbook: 'Playbook',
  flow: '流程作业',
  schedule: '定时作业'
}

const statusMap = {
  WAITING: { label: '等待中', type: 'info' },
  RUNNING: { label: '正在运行', type: 'primary' },
  CALLBACK: { label: '回调', type: 'primary' },
  ERROR: { label: '运行错误', type: 'warning' },
  FAILED: { label: '运行失败', type: 'danger' },
  COMPLETED: { label: '完成', type: 'success' },
  INTERRUPTED: { label: '运行终止', type: 'info' }
}

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const payload = {
      params: {
        day: filters.value.day,
        job_id: filters.value.job_id,
        type: filters.value.type,
        run_ids: filters.value.run_ids,
        status: filters.value.status
      },
      size: pagination.value.size,
      page: pagination.value.page,
      orderBy: 'start_time desc',
      filter: filters.value.search
    }

    const response = await jaoApi.fetchJobRunLogs(payload)
    const data = response?.data || response
    tableData.value = data.records || []
    pagination.value.total = data.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取运行记录失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
  fetchData()
}

function handleSearchDebounced() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    handleSearch()
  }, 500)
}

function handleRefresh() {
  fetchData()
}

function handleReset() {
  filters.value.day = '0'
  filters.value.status = 'all'
  filters.value.search = ''
  pagination.value.page = 1
  fetchData()
}

function getJobTypeLabel(type) {
  return jobTypeMap[type] || type
}

function getStatusLabel(status) {
  return statusMap[status]?.label || status
}

function getStatusType(status) {
  return statusMap[status]?.type || 'info'
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  const start = new Date(startTime)
  const end = new Date(endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

  const diff = Math.abs(end - start) / 1000
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = Math.floor(diff % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

function parseNodes(ataUrl) {
  if (!ataUrl) return []
  return ataUrl.split(',').filter(ip => ip.trim())
}

function formatStats(statsJson) {
  if (!statsJson) return '-'
  try {
    const stats = JSON.parse(statsJson)
    const parts = []
    if (stats.totalHosts) parts.push(`总数:${stats.totalHosts}`)
    if (stats.okHosts) parts.push(`成功:${stats.okHosts}`)
    if (stats.failedHosts) parts.push(`失败:${stats.failedHosts}`)
    if (stats.unreachableHosts) parts.push(`不可达:${stats.unreachableHosts}`)
    return parts.join(' | ') || '-'
  } catch {
    return '-'
  }
}

function canRerun(row) {
  return row.job_type === 'script' &&
         row.status !== 'WAITING' &&
         row.status !== 'RUNNING' &&
         row.status !== 'CALLBACK'
}

function handleViewResult(row) {
  if (!row?.id) return
  resultMeta.value = {
    runId: row.id,
    jobTitle: row.job_title
  }
  resultDialogVisible.value = true
}

async function handleRerun(row) {
  try {
    await ElMessageBox.confirm(
      `确定要重新启动作业 "${row.job_title}" 吗？`,
      '重新启动作业',
      { type: 'warning' }
    )

    loading.value = true
    try {
      await jaoApi.rerunJob(row.job_id, row.id)
      ElMessage.success('作业已重新启动')
      fetchData()
    } catch (error) {
      ElMessage.error(error?.message || '重新启动作业失败')
    } finally {
      loading.value = false
    }
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/common.scss' as *;

.run-logs-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.header-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.table-container {
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-container :deep(.el-table) {
  flex: 1;
  min-height: 0;
}

.job-title {
  font-weight: 500;
  color: #1e293b;
  word-break: break-all;
}

.node-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.stats-info {
  font-size: 12px;
  color: #64748b;
}

.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
