<template>
  <div class="ops-page-layout">
    <!-- 筛选栏 -->
    <div class="ops-filter-bar">
      <template v-if="hostKey">
        <el-tag type="info" size="small" closable @close="clearHostFilter">
          筛选主机: {{ hostKey }}
        </el-tag>
      </template>
      <el-input
        v-model="filterText"
        placeholder="搜索软件包..."
        style="width: 200px"
        size="small"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <!-- 暂无操作按钮 -->
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <div class="table-toolbar-icons">
        <el-button class="toolbar-icon-btn" circle :loading="loading" @click="loadData" title="刷新">
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="tableData"
       
        style="width: 100%"
        size="small"
        max-height="calc(100vh - 300px)"
      >
        <el-table-column v-if="!hostKey" prop="host_key" label="主机" min-width="150" />
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

    <!-- 分页器区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
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
/* 此组件使用全局的 ops-page-layout 样式 */
</style>
