<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="任务类型">
          <el-select
            v-model="filters.taskType"
            clearable
            placeholder="全部"
            class="task-type-filter" @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="补丁安装" value="install" />
            <el-option label="变更回滚" value="rollback" />
            <el-option label="软件包更新" value="pkg_update" />
            <el-option label="漏洞修复" value="vuln_fix" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input
            v-model="filters.operator"
            placeholder="请输入"
            clearable
            class="operator-filter"
          @keyup.enter="handleSearch" @clear="handleSearch" />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD"
            class="time-range-filter"
            @change="handleSearch"
          />
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

    <div class="ops-action-bar">
      <span class="action-bar-spacer" />
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        title="刷新"
        @click="loadData"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="tableData" max-height="calc(100vh - 314px)">
        <el-table-column prop="createdTime" label="记录时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="taskType" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTaskTypeTagType(row.taskType)" size="small" effect="light">
              {{ formatTaskType(row.taskType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getTaskStatusTagType(row.status)"
              size="small"
              class="status-tag--clickable"
              @click="openDetail(row)"
            >
              {{ formatTaskStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="osType" label="系统类型" width="120">
          <template #default="{ row }">
            <span class="os-type-cell">
              <i v-if="getOsIcon(row.osType)" :class="[getOsIcon(row.osType), 'os-brand-icon']" />
              <span>{{ row.osType }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="操作人" width="120" show-overflow-tooltip />
        <el-table-column label="涉及软件包" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatJsonArray(row.patchPkgs) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="PAGE_SIZE_OPTIONS"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <PatchProcessLogDetailDialog v-model="detailVisible" :task="selectedTask" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import { patchLogsApi } from '../api'
import PatchProcessLogDetailDialog from '../components/logs/PatchProcessLogDetailDialog.vue'
import {
  formatDateTime,
  formatJsonArray,
  formatTaskStatus,
  formatTaskType,
  getOsIcon,
  getTaskStatusTagType,
  getTaskTypeTagType
} from '../utils/patchProcessLogs'

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const loading = ref(false)
const tableData = ref([])
const detailVisible = ref(false)
const selectedTask = ref(null)

const filters = reactive(createDefaultFilters())
const pagination = reactive({
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0
})

async function loadData() {
  loading.value = true
  try {
    const response = await patchLogsApi.getAuditLogs(buildQueryParams())
    const data = response?.data || response || {}
    tableData.value = data.content || []
    pagination.total = data.totalElements || 0
  } catch (error) {
    console.error('Failed to load process logs:', error)
    ElMessage.error('加载流程操作记录失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function buildQueryParams() {
  return {
    taskType: filters.taskType || undefined,
    operator: filters.operator.trim() || undefined,
    startTime: buildDateRangeBoundary(filters.timeRange?.[0], 'start'),
    endTime: buildDateRangeBoundary(filters.timeRange?.[1], 'end'),
    page: pagination.page - 1,
    size: pagination.pageSize
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  Object.assign(filters, createDefaultFilters())
  pagination.page = 1
  pagination.pageSize = DEFAULT_PAGE_SIZE
  loadData()
}

function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

function openDetail(task) {
  selectedTask.value = task
  detailVisible.value = true
}

function createDefaultFilters() {
  return {
    taskType: '',
    operator: '',
    timeRange: []
  }
}

function buildDateRangeBoundary(dateValue, boundary) {
  if (!dateValue) return undefined
  return `${dateValue} ${boundary === 'end' ? '23:59:59' : '00:00:00'}`
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.task-type-filter {
  width: 140px;
}

.operator-filter {
  width: 180px;
}

.time-range-filter {
  width: 280px;
}

.action-bar-spacer {
  flex: 1;
}

.os-type-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .os-brand-icon {
    font-size: 16px;
    color: var(--el-text-color-regular);
    width: 16px;
    text-align: center;
    display: inline-block;
    vertical-align: middle;
  }
}

:deep(.el-date-editor) {
  height: 32px !important;
}

.status-tag--clickable {
  cursor: pointer;
  transition:
    opacity 0.2s,
    filter 0.2s;

  &:hover {
    opacity: 0.8;
    filter: brightness(1.1);
  }
}
</style>
