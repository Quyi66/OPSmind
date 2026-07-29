<template>
  <div class="recently-selector">
    <!-- 搜索栏 -->
    <div class="search-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索运维工具名称"
        clearable
        :prefix-icon="Search"
        @input="handleSearch"
      />
      <el-button :icon="Refresh" @click="fetchData" />
    </div>

    <!-- 运维工具列表 -->
    <div class="table-wrapper">
      <el-table
        ref="tableRef"
        :data="pagedData"
        v-loading="loading"
        height="100%"
        row-key="id"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" reserve-selection />
        <el-table-column
          prop="jobTitle"
          label="运维工具"
          min-width="280"
          show-overflow-tooltip
          sortable
        >
          <template #default="{ row }">
            {{ translateText(row.jobTitle) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="执行主机" width="120" show-overflow-tooltip sortable>
          <template #default="{ row }">
            <span v-if="row.run_result_hosts?.length">
              {{ row.run_result_hosts[0]?.value || '-' }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="jobType" label="类型" width="80" align="left" sortable>
          <template #default="{ row }">
            {{ getJobTypeLabel(row.jobType) }}
          </template>
        </el-table-column>
        <el-table-column label="结束时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.endTime || row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column label="Ansible Node" width="150" align="left">
          <template #default="{ row }">
            <el-tag v-if="getAnsibleNodeLabel(row.executor_node)" type="primary" size="small">
              {{ getAnsibleNodeLabel(row.executor_node) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="left" sortable>
          <template #default="{ row }">
            <el-tag
              :type="getStatusStyle(row.status)"
              size="small"
              class="clickable-status"
              @click="handleViewResult(row)"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" width="60" align="left">
          <template #default="{ row }">
            <span class="detail-count" v-if="row.statsJson" @click="handleViewResult(row)">
              {{ getHostCount(row.statsJson) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="filteredData.length"
        popper-class="acm-pagination-popper"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 运维工具运行结果弹窗 -->
    <ExecuteResultDialog
      v-model:visible="resultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
      :z-index="6000"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { formatDateTime } from '@/modules/automation/utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { JOB_TYPE_OPTIONS } from '@/modules/automation/stores/useJobStore'
import { translateText } from '@/utils/i18n'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const tableRef = ref(null)
const loading = ref(false)
const tableData = ref([])
const searchKeyword = ref('')
const pagination = ref({
  page: 1,
  pageSize: 10
})

// 运行结果弹窗状态
const resultDialogVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')
let isInternalUpdate = false

const isSingleSelector = computed(() => props.options.selector === 'single')

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchKeyword.value) return tableData.value
  const keyword = searchKeyword.value.toLowerCase()
  return tableData.value.filter(item => item.jobTitle?.toLowerCase().includes(keyword))
})

const pagedData = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  return filteredData.value.slice(start, start + pagination.value.pageSize)
})

watch(
  () => props.ciType,
  () => {
    pagination.value.page = 1
    fetchData()
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  async () => {
    if (isInternalUpdate) {
      return
    }

    await syncSelectionFromModelValue()
  },
  { deep: true }
)

watch(filteredData, () => {
  const maxPage = Math.max(1, Math.ceil(filteredData.value.length / pagination.value.pageSize))
  if (pagination.value.page > maxPage) {
    pagination.value.page = maxPage
    return
  }

  nextTick(() => {
    syncSelectionFromModelValue()
  })
})

watch(
  () => [pagination.value.page, pagination.value.pageSize],
  () => {
    nextTick(() => {
      syncSelectionFromModelValue()
    })
  }
)

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.queryAcmRecentlyUsed({
      jobTypes: 'script,command',
      limit: 100
    })

    const data = response?.data || response
    // API 返回的是作业记录列表
    tableData.value = Array.isArray(data) ? data : data?.records || []
    await syncSelectionFromModelValue()
  } catch (error) {
    console.error('Failed to fetch recently used:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
}

function handleSelectionChange(selection) {
  if (isInternalUpdate) {
    return
  }

  let effectiveSelection = Array.isArray(selection) ? [...selection] : []

  if (isSingleSelector.value && effectiveSelection.length > 1) {
    const latestRow = effectiveSelection[effectiveSelection.length - 1]
    effectiveSelection = latestRow ? [latestRow] : []

    isInternalUpdate = true
    tableRef.value?.clearSelection()
    if (latestRow) {
      tableRef.value?.toggleRowSelection(latestRow, true)
    }
    nextTick(() => {
      isInternalUpdate = false
    })
  }

  const selectedHosts = extractHostsFromJobs(effectiveSelection)

  isInternalUpdate = true
  emit('update:modelValue', isSingleSelector.value ? selectedHosts.slice(0, 1) : selectedHosts)
  nextTick(() => {
    isInternalUpdate = false
  })
}

async function syncSelectionFromModelValue() {
  await nextTick()

  if (!tableRef.value || !tableData.value.length) {
    return
  }

  isInternalUpdate = true
  tableRef.value.clearSelection()

  const selectedKeySet = new Set((props.modelValue || []).map(item => item.key || item.value))

  if (selectedKeySet.size > 0) {
    filteredData.value.forEach(row => {
      const matched = doesJobMatchSelection(row, selectedKeySet)
      if (matched) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
  }

  nextTick(() => {
    isInternalUpdate = false
  })
}

/**
 * 查看作业运行结果
 */
function handleViewResult(row) {
  if (!row.runId && !row.id) return

  currentRunId.value = row.runId || row.id
  currentJobTitle.value = row.jobTitle || ''
  resultDialogVisible.value = true
}



function getAnsibleNodeLabel(nodeValue) {
  if (!nodeValue) return ''
  try {
    let val = nodeValue
    // 如果是 JSON 数组字符串，解析它
    if (typeof nodeValue === 'string' && nodeValue.trim().startsWith('[')) {
      val = JSON.parse(nodeValue)
    }

    if (Array.isArray(val)) {
      return val.filter(Boolean).join(', ')
    }
    return String(val)
  } catch {
    return String(nodeValue)
  }
}

function getStatusLabel(status) {
  if (!status) return '-'
  const statusUpper = status.toUpperCase()
  const labels = {
    SUCCESS: '完成',
    COMPLETED: '完成',
    FAILED: '运行失败',
    ERROR: '运行错误',
    RUNNING: '执行中',
    PENDING: '等待中'
  }
  return labels[statusUpper] || status
}

function getStatusStyle(status) {
  if (!status) return 'info'
  const statusUpper = status.toUpperCase()
  const styles = {
    SUCCESS: 'success',
    COMPLETED: 'success',
    FAILED: 'warning',
    ERROR: 'danger',
    RUNNING: 'primary',
    PENDING: 'info'
  }
  return styles[statusUpper] || 'info'
}

function getHostCount(statsJson) {
  try {
    const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson
    return stats?.totalHosts || stats?.total || '-'
  } catch {
    return '-'
  }
}

function getJobTypeLabel(type) {
  if (!type) return '-'
  const option = JOB_TYPE_OPTIONS.find(opt => opt.value === type)
  return option ? option.label : type
}

function extractHostsFromJobs(rows = []) {
  const selectedHosts = []

  rows.forEach(job => {
    const jobHosts = Array.isArray(job?.run_result_hosts) ? job.run_result_hosts : []
    jobHosts.forEach(host => {
      const normalizedHost = {
        key: host.key || host.id,
        value: host.value || host.IP,
        assetType: host.assetType || props.ciType
      }

      if (
        !selectedHosts.some(
          item => item.key === normalizedHost.key || item.value === normalizedHost.value
        )
      ) {
        selectedHosts.push(normalizedHost)
      }
    })
  })

  return selectedHosts
}

function doesJobMatchSelection(row, selectedKeySet) {
  const keySet =
    selectedKeySet || new Set((props.modelValue || []).map(item => item.key || item.value))
  const rowHosts = Array.isArray(row?.run_result_hosts) ? row.run_result_hosts : []

  return rowHosts.some(host => keySet.has(host.key || host.value || host.IP))
}

function handlePageChange() {
  nextTick(() => {
    syncSelectionFromModelValue()
  })
}

function handlePageSizeChange() {
  pagination.value.page = 1
}
</script>

<style scoped>
.recently-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 10px;
}

.search-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.search-toolbar .el-input {
  width: 200px;
}

.recently-selector .table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.recently-selector :deep(.el-pagination) {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.detail-count {
  color: #409eff;
  cursor: pointer;
}

.detail-count:hover {
  text-decoration: underline;
}

.clickable-status {
  cursor: pointer;
  transition: transform 0.2s;
}

.clickable-status:hover {
  transform: scale(1.05);
}
</style>
