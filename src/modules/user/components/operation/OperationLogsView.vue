<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-select v-model="filters.ata_node" placeholder="执行引擎节点" clearable style="width: 130px" @change="loadData">
        <el-option label="全部" value="" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" style="width: 100px" @change="loadData">
        <el-option label="全部" value="all" />
        <el-option label="成功" value="SUCCESS" />
        <el-option label="失败" value="FAILED" />
        <el-option label="运行中" value="RUNNING" />
      </el-select>
      <el-select v-model="filters.action" placeholder="操作" style="width: 120px" @change="loadData">
        <el-option label="全部" value="all" />
      </el-select>
      <span class="time-range-label">时间范围:</span>
      <el-select v-model="filters.day" style="width: 110px" @change="loadData">
        <el-option label="Last Year" value="365" />
        <el-option label="Last Month" value="30" />
        <el-option label="Last Week" value="7" />
        <el-option label="Last 3 Days" value="3" />
      </el-select>
      <el-input
        v-model="filters.keyword"
        placeholder="搜索"
        clearable
        style="width: 150px"
        @keyup.enter="loadData"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
      <el-button type="primary" @click="loadData">
        <i class="fa fa-search"></i> 搜索
      </el-button>
      <el-button @click="loadData" title="刷新">
        <i class="fa fa-sync"></i>
      </el-button>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="start_time" label="开始时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="200" sortable show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
.time-range-label {
  font-size: 13px;
  color: #6b7280;
  margin-left: 16px;
}
</style>
