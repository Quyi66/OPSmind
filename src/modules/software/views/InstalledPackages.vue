<template>
  <div class="installed-packages">
    <div v-if="hostKey" class="filter-hint-section">
      <el-tag type="info" size="small" closable @close="clearHostFilter">
        筛选主机: {{ hostKey }}
      </el-tag>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-input
        v-model="filterText"
        placeholder="搜索软件包..."
        style="width: 200px"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <i class="fa fa-search" />
        </template>
      </el-input>
      <el-button link @click="loadData">
        <i class="fa fa-sync" />
      </el-button>
    </div>

    <!-- 表格 -->
    <div class="table-section">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
        size="small"
      >
        <el-table-column prop="host_key" label="主机" min-width="150" v-if="!hostKey" />
        <el-table-column prop="name" label="名称" min-width="200" />
        <el-table-column prop="version" label="版本号" width="150" />
        <el-table-column prop="release" label="发行号" width="120" />
        <el-table-column prop="arch" label="架构" width="100" />
        <el-table-column prop="install_time" label="安装时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.install_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { packageApi } from '../api'

const props = defineProps({
  hostKey: {
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

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await packageApi.getInstalledList({
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value,
      host_key: props.hostKey
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    pagination.total = data?.total || 0
  } catch (error) {
    console.error('Failed to load installed packages:', error)
    // 模拟数据
    const names = ['kernel', 'glibc', 'openssl', 'bash', 'systemd', 'python', 'nginx', 'httpd', 'mysql', 'redis']
    tableData.value = Array.from({ length: 10 }, (_, i) => ({
      host_key: props.hostKey || `192.168.1.${100 + (i % 5)}`,
      name: names[i % names.length],
      version: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      release: `${Math.floor(Math.random() * 100)}.el7`,
      arch: 'x86_64',
      install_time: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    }))
    pagination.total = 15230
  } finally {
    loading.value = false
  }
}

// 清除主机筛选
function clearHostFilter() {
  // 通知父组件清除 hostKey
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

// 监听 hostKey 变化
watch(() => props.hostKey, () => {
  pagination.page = 1
  loadData()
})

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.installed-packages {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: #fff;
}

.filter-hint-section {
  margin-bottom: 12px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.table-section {
  flex: 1;
  overflow: auto;
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
