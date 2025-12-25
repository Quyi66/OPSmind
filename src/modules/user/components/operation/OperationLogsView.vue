<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="执行引擎">
          <el-select v-model="filters.ata_node" placeholder="全部" clearable style="width: 130px">
            <el-option label="全部" value="" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" style="width: 100px">
            <el-option label="全部" value="all" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="运行中" value="RUNNING" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="filters.action" placeholder="全部" style="width: 120px">
            <el-option label="全部" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-select v-model="filters.day" style="width: 120px">
            <el-option label="最近一年" value="365" />
            <el-option label="最近一月" value="30" />
            <el-option label="最近一周" value="7" />
            <el-option label="最近三天" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索"
            clearable
            style="width: 150px"
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
      <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="200" sortable show-overflow-tooltip>
          <template #default="{ row }">
            {{ translateAction(row.action) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
              :class="{ 'clickable-tag': row.run_id }"
              @click="row.run_id && handleViewRunResult(row)"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ata_node" label="执行引擎节点" width="140" sortable />
        <el-table-column prop="message" label="结果" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.message || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="username" label="用户" width="100" sortable />
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="100" sortable>
          <template #default="{ row }">
            {{ calcDuration(row.start_time, row.end_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 作业运行结果弹窗 -->
    <ExecuteResultDialog
      v-model:visible="showRunResultDialog"
      :run-id="currentRunId"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import { translateI18nKey } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({
  initialFilters: {
    type: Object,
    default: () => ({})
  }
})

// 筛选条件
const filters = ref({
  day: props.initialFilters.day || '365',
  action: props.initialFilters.action || 'all',
  status: props.initialFilters.status || 'all',
  ata_node: '',
  keyword: ''
})

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 作业结果弹窗
const showRunResultDialog = ref(false)
const currentRunId = ref('')

// 格式化日期时间
function formatDateTime(isoString) {
  if (!isoString) return '-'
  try {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch {
    return isoString
  }
}

// 计算耗时
function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return '-'
  try {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const diff = end - start
    if (diff < 0) return '-'

    const totalSeconds = Math.floor(diff / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `0:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch {
    return '-'
  }
}

// 获取状态类型
function getStatusType(status) {
  const types = {
    SUCCESS: 'success',
    FAILED: 'danger',
    RUNNING: 'warning'
  }
  return types[status] || 'info'
}

// 获取状态标签
function getStatusLabel(status) {
  const labels = {
    SUCCESS: '运行成功',
    FAILED: '运行失败',
    RUNNING: '运行中'
  }
  return labels[status] || status
}

// 翻译操作名称
function translateAction(action) {
  if (!action) return '-'
  return translateI18nKey(action)
}

// 查看作业运行结果
function handleViewRunResult(row) {
  if (row.run_id) {
    currentRunId.value = row.run_id
    showRunResultDialog.value = true
  }
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await userApi.getOperationLogs({
      module: 'uim',
      action: filters.value.action,
      status: filters.value.status,
      day: filters.value.day,
      page: currentPage.value,
      size: pageSize.value
    })
    tableData.value = response?.records || response?.data?.records || []
    total.value = response?.total || response?.data?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to load operation logs:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function handleReset() {
  filters.value = {
    day: '365',
    action: 'all',
    status: 'all',
    ata_node: '',
    keyword: ''
  }
  currentPage.value = 1
  pageSize.value = 10
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.time-range-label {
  font-size: 13px;
  color: #6b7280;
  margin-left: 16px;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
</style>
