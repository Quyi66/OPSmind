<template>
  <div class="operation-logs-view">
    <!-- 筛选区 - 水平排列，右对齐 -->
    <div class="filter-bar">
      <div class="filter-bar__left">
        <!-- 可以放其他操作按钮 -->
      </div>
      <div class="filter-bar__right">
        <el-select v-model="filters.ata_node" size="small" placeholder="执行引擎节点" clearable style="width: 130px" @change="loadData">
          <el-option label="全部" value="" />
        </el-select>
        <el-select v-model="filters.status" size="small" placeholder="状态" style="width: 100px" @change="loadData">
          <el-option label="全部" value="all" />
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
          <el-option label="运行中" value="RUNNING" />
        </el-select>
        <el-select v-model="filters.action" size="small" placeholder="操作" style="width: 120px" @change="loadData">
          <el-option label="全部" value="all" />
        </el-select>
        <el-input
          v-model="filters.keyword"
          size="small"
          placeholder=""
          clearable
          style="width: 150px"
          @keyup.enter="loadData"
        />
        <el-button size="small" @click="loadData">
          <i class="fa fa-search"></i>
        </el-button>
        <el-button size="small" @click="loadData">
          <i class="fa fa-sync"></i>
        </el-button>
        <span class="time-range-label">时间范围:</span>
        <el-select v-model="filters.day" size="small" style="width: 110px" @change="loadData">
          <el-option label="Last Year" value="365" />
          <el-option label="Last Month" value="30" />
          <el-option label="Last Week" value="7" />
          <el-option label="Last 3 Days" value="3" />
        </el-select>
      </div>
    </div>

    <!-- 表头行 -->
    <div class="table-header">
      <div class="th-cell" style="width: 160px">开始时间 <i class="fa fa-sort"></i></div>
      <div class="th-cell" style="width: 220px">操作 <i class="fa fa-sort"></i></div>
      <div class="th-cell" style="width: 90px">状态</div>
      <div class="th-cell" style="width: 120px">执行引擎节点 <i class="fa fa-sort"></i></div>
      <div class="th-cell" style="flex: 1">结果</div>
      <div class="th-cell" style="width: 80px">用户 <i class="fa fa-sort"></i></div>
      <div class="th-cell" style="width: 160px">结束时间</div>
      <div class="th-cell" style="width: 80px">耗时 <i class="fa fa-sort"></i></div>
    </div>

    <!-- 表格内容 -->
    <div class="table-body" v-loading="loading">
      <div class="table-row" v-for="(row, index) in tableData" :key="index">
        <div class="td-cell" style="width: 160px">{{ formatDateTime(row.start_time) }}</div>
        <div class="td-cell" style="width: 220px">{{ row.action }}</div>
        <div class="td-cell" style="width: 90px">
          <span :class="['status-badge', getStatusClass(row.status)]">
            {{ getStatusLabel(row.status) }}
          </span>
        </div>
        <div class="td-cell" style="width: 120px">{{ row.ata_node }}</div>
        <div class="td-cell result-cell" style="flex: 1">{{ row.message || '-' }}</div>
        <div class="td-cell" style="width: 80px">{{ row.username }}</div>
        <div class="td-cell" style="width: 160px">{{ formatDateTime(row.end_time) }}</div>
        <div class="td-cell" style="width: 80px">{{ calcDuration(row.start_time, row.end_time) }}</div>
      </div>
      <div class="table-empty" v-if="!loading && !tableData.length">
        暂无数据
      </div>
    </div>

    <!-- 分页 - 左对齐 -->
    <div class="table-footer">
      <div class="pagination-left">
        <el-select v-model="pageSize" size="small" style="width: 70px" @change="loadData">
          <el-option :value="10" label="10" />
          <el-option :value="20" label="20" />
          <el-option :value="50" label="50" />
          <el-option :value="100" label="100" />
        </el-select>
        <span class="page-info">{{ paginationInfo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as userApi from '@/modules/user/api'

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

// 分页信息
const paginationInfo = computed(() => {
  if (!tableData.value.length) return '0 / 0'
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `${start} - ${end} / ${total.value}`
})

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

// 获取状态样式类
function getStatusClass(status) {
  const classes = {
    SUCCESS: 'status-success',
    FAILED: 'status-failed',
    RUNNING: 'status-running'
  }
  return classes[status] || 'status-default'
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

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await userApi.getOperationLogs({
      module: 'uim',
      action: filters.value.action,
      status: filters.value.status,
      day: filters.value.day
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

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.operation-logs-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.time-range-label {
  font-size: 13px;
  color: #6b7280;
  margin-left: 16px;
}

// 自定义表格样式
.table-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 40px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.th-cell {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 4px;

  i {
    font-size: 10px;
    color: #9ca3af;
  }
}

.table-body {
  flex: 1;
  overflow-y: auto;
}

.table-row {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.15s;

  &:hover {
    background: #f9fafb;
  }
}

.td-cell {
  font-size: 13px;
  color: #374151;
  padding: 0 8px;
  word-break: break-word;
}

.result-cell {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.table-empty {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

// 状态徽章
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: #d1fae5;
  color: #059669;
}

.status-failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-running {
  background: #fef3c7;
  color: #d97706;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}

// 分页
.table-footer {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 13px;
  color: #6b7280;
}
</style>
