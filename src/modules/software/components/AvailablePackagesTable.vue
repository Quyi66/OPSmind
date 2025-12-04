<template>
  <div class="available-packages-table">
    <!-- 表格区域 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      stripe
      style="width: 100%"
      size="small"
    >
      <el-table-column prop="pkg_name" label="名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <el-button type="primary" link @click="handlePackageClick(row)">
            {{ row.pkg_name }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="pkg_envra" label="软件包" min-width="200" show-overflow-tooltip />
      <el-table-column prop="pkg_arch" label="架构" width="100" />
      <el-table-column prop="pkg_release" label="发行号" width="120" />
      <el-table-column prop="pkg_version" label="版本号" width="120" />
      <el-table-column prop="pkg_yumstate" label="软件状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.pkg_yumstate" :type="row.pkg_yumstate === '可用' ? 'success' : 'info'" size="small">
            {{ row.pkg_yumstate }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="repo_id" label="仓库ID" width="120" />
      <el-table-column prop="scan_date" label="扫描时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.scan_date) }}
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区域 -->
    <div class="pagination-section">
      <div class="pagination-left">
        <el-select v-model="pagination.pageSize" style="width: 80px" @change="handleSizeChange">
          <el-option :value="10" label="10" />
          <el-option :value="25" label="25" />
          <el-option :value="50" label="50" />
          <el-option :value="100" label="100" />
        </el-select>
        <span class="pagination-info">{{ paginationInfo }}</span>
      </div>
      <div class="pagination-right">
        <span class="page-info">Page {{ pagination.page }} of {{ totalPages }}</span>
        <el-button-group>
          <el-button size="small" :disabled="pagination.page <= 1" @click="handlePageChange(1)">
            <i class="fa fa-angle-double-left" />
          </el-button>
          <el-button size="small" :disabled="pagination.page <= 1" @click="handlePageChange(pagination.page - 1)">
            <i class="fa fa-angle-left" />
          </el-button>
          <el-button size="small" :disabled="pagination.page >= totalPages" @click="handlePageChange(pagination.page + 1)">
            <i class="fa fa-angle-right" />
          </el-button>
          <el-button size="small" :disabled="pagination.page >= totalPages" @click="handlePageChange(totalPages)">
            <i class="fa fa-angle-double-right" />
          </el-button>
        </el-button-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { packageApi } from '../api'

const props = defineProps({
  searchText: {
    type: String,
    default: ''
  }
})

const loading = ref(false)
const filterText = ref('')
const tableData = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 监听外部搜索文本变化（只在有实际变化时触发，跳过初始化）
let isFirstWatch = true
watch(() => props.searchText, (newVal, oldVal) => {
  if (isFirstWatch) {
    isFirstWatch = false
    return
  }
  if (newVal !== oldVal) {
    filterText.value = newVal
    pagination.page = 1
    loadData()
  }
})

// 分页信息
const paginationInfo = computed(() => {
  const total = pagination.total
  if (total === 0) return '0-0/0'
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, total)
  return `${start}-${end}/${total.toLocaleString()}`
})

const totalPages = computed(() => {
  return Math.ceil(pagination.total / pagination.pageSize) || 1
})

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await packageApi.getAvailableList({
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value ? `pkg_name:*${filterText.value}*` : ''
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    pagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load packages:', error)
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 点击软件包名称
function handlePackageClick(row) {
  // TODO: 跳转到软件包详情或安装页面
  console.log('Package clicked:', row)
}

// 搜索
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 分页
function handlePageChange(page) {
  pagination.page = page
  loadData()
}

function handleSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

// 暴露刷新方法
function refresh() {
  loadData()
}

defineExpose({ refresh })

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.available-packages-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  margin-top: 12px;

  .pagination-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .pagination-info {
      font-size: 13px;
      color: #606266;
    }
  }

  .pagination-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .page-info {
      font-size: 13px;
      color: #606266;
    }
  }
}
</style>
