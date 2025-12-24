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
      <el-button type="primary" size="small" @click="handleScanHosts">
        <i class="fa fa-redo"></i> 扫描主机
      </el-button>
      <el-button size="small" @click="loadData">
        <i class="fa fa-refresh"></i> 刷新
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="paginatedData"
        v-loading="loading"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column label="主机" prop="$data_owner" min-width="150" sortable show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.$data_owner || row.host || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="用户/用户组" prop="user" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="sudo文件" prop="file" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.file || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="sudo配置" prop="user_spec" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user_spec || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="$update_time" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.$update_time) }}
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

    <!-- 扫描主机对话框 -->
    <ScanHostsDialog
      v-model="showScanDialog"
      @scanned="handleScanCompleted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as sudoApi from '@/modules/sudo/api'
import ScanHostsDialog from './ScanHostsDialog.vue'

const loading = ref(false)
const tableData = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const showScanDialog = ref(false)

const filteredData = computed(() => {
  let data = tableData.value
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(row =>
      row.$data_owner?.toLowerCase().includes(keyword) ||
      row.host?.toLowerCase().includes(keyword) ||
      row.user?.toLowerCase().includes(keyword) ||
      row.file?.toLowerCase().includes(keyword) ||
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
    const response = await sudoApi.getSudoPermissionList()
    const result = response?.data || response
    tableData.value = result?.records || []
    total.value = result?.total || 0
  } catch (error) {
    console.error('Failed to load sudo permission list:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleScanHosts() {
  showScanDialog.value = true
}

function handleScanCompleted() {
  loadData()
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-----'
  const date = new Date(dateStr)
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
