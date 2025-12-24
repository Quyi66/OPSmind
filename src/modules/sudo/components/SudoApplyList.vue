<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索"
        clearable
        size="small"
        style="width: 200px"
        @input="handleSearch"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
      <el-button size="small" @click="handleReset">
        <i class="fa fa-undo"></i> 重置
      </el-button>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleAddSudo">
        <el-icon><Plus /></el-icon> 添加sudo
      </el-button>
      <el-button size="small" @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="paginatedData"
        v-loading="loading"
        style="width: 100%"
        stripe
      >
        <el-table-column label="主机" prop="$data_owner" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.$data_owner || row.host || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="用户" prop="user" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="权限" prop="user_spec" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user_spec || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)" size="small">
              {{ getStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回收时间" width="170">
          <template #default="{ row }">
            {{ getRecoveryTime(row) }}
          </template>
        </el-table-column>
        <el-table-column label="有效时长" prop="valid_period" width="100">
          <template #default="{ row }">
            {{ formatValidPeriod(row.valid_period) }}
          </template>
        </el-table-column>
        <el-table-column label="配置时间" prop="exec_time" width="170" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.exec_time) }}
          </template>
        </el-table-column>
        <el-table-column label="消息" prop="result_msg" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.result_msg || '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredData.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 添加sudo对话框 -->
    <AddSudoDialog
      v-model="showAddDialog"
      @saved="handleAddCompleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as sudoApi from '@/modules/sudo/api'
import AddSudoDialog from './AddSudoDialog.vue'

const loading = ref(false)
const tableData = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const showAddDialog = ref(false)

const filteredData = computed(() => {
  let data = tableData.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(row =>
      row.$data_owner?.toLowerCase().includes(keyword) ||
      row.host?.toLowerCase().includes(keyword) ||
      row.user?.toLowerCase().includes(keyword) ||
      row.user_spec?.toLowerCase().includes(keyword)
    )
  }
  return data
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 搜索处理
function handleSearch() {
  currentPage.value = 1
}

// 重置处理
function handleReset() {
  searchKeyword.value = ''
  currentPage.value = 1
}

// 分页处理
function handlePageChange(page) {
  currentPage.value = page
}

function handlePageSizeChange() {
  currentPage.value = 1
}

async function loadData() {
  loading.value = true
  try {
    const response = await sudoApi.getSudoApplyList()
    const result = response?.data || response
    tableData.value = result?.records || []
    total.value = result?.total || 0
  } catch (error) {
    console.error('Failed to load sudo apply list:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 计算状态
function getStatusType(row) {
  if (!row.exec_time) return 'info'
  if (row.result === 'FAIL') return 'danger'

  const execTime = new Date(row.exec_time).getTime()
  const validPeriod = row.valid_period || 0
  const endTime = execTime + validPeriod * 60 * 1000

  if (validPeriod !== 0 && Date.now() >= endTime) {
    return 'warning'
  }
  return 'primary'
}

function getStatusText(row) {
  if (!row.exec_time) return '待执行'
  if (row.result === 'FAIL') return '失败'

  const execTime = new Date(row.exec_time).getTime()
  const validPeriod = row.valid_period || 0
  const endTime = execTime + validPeriod * 60 * 1000

  if (validPeriod !== 0 && Date.now() >= endTime) {
    return '已失效'
  }
  return '生效中'
}

// 计算回收时间
function getRecoveryTime(row) {
  if (!row.exec_time) return '-----'
  const validPeriod = row.valid_period || 0
  if (validPeriod === 0) return '永久'

  const execTime = new Date(row.exec_time).getTime()
  const endDate = new Date(execTime + validPeriod * 60 * 1000)
  return formatDateTime(endDate)
}

function formatValidPeriod(minutes) {
  if (!minutes || minutes === 0) return '永久'
  if (minutes < 60) return `${minutes}分钟`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时`
  return `${Math.floor(minutes / 1440)}天`
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleAddSudo() {
  showAddDialog.value = true
}

function handleAddCompleted() {
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.ops-page-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.ops-filter-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.ops-action-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ops-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.ops-pagination-wrapper {
  flex-shrink: 0;
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
