<template>
  <div class="available-packages-table">
    <!-- 操作栏 - 左右分布 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <!-- <el-button size="small" @click="handleExport">
          <i class="fa fa-download" />
          导出
        </el-button> -->
      </div>
      <div class="action-right">
        <el-input
          v-model="filterText"
          placeholder=""
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
        <el-button
          class="toolbar-icon-btn"
          circle
          :loading="loading"
          @click="loadData"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        size="small"
        max-height="calc(100vh - 414px)"
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
            <el-tag
              v-if="row.pkg_yumstate"
              :type="row.pkg_yumstate === '可用' ? 'success' : 'info'"
              size="small"
            >
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
    </div>

    <!-- 分页器区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { packageApi } from '../../api'

const loading = ref(false)
const filterText = ref('')
const tableData = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await packageApi.getAvailableList({
      page: pagination.page,
      size: pagination.pageSize,
      filter: filterText.value || ''
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
}

// 搜索
function handleSearch() {
  pagination.page = 1
  loadData()
}

// 导出
function handleExport() {
  ElMessage.info('导出功能开发中')
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
/* 此组件使用全局的 ops-* 样式 */

.available-packages-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
}

.ops-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
