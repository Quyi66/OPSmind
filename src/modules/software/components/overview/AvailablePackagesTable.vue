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
          :disabled="!!readError && !canRetry"
          @click="refresh"
          :title="readError ? '重试读取' : '刷新'"
          :aria-label="readError ? '重试读取可用软件包' : '刷新可用软件包'"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="readError"
      :title="readErrorMessage"
      type="warning"
      :closable="false"
      show-icon
      style="flex-shrink: 0"
    />

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        :empty-text="emptyText"
        style="width: 100%"
        size="small"
        height="100%"
      >
        <el-table-column prop="pkg_name" label="名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button
              class="software-cell-link"
              :title="row.pkg_name"
              type="primary"
              link
              @click="handlePackageClick(row)"
            >
              {{ row.pkg_name }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="pkg_envra" label="软件包" min-width="200" show-overflow-tooltip />
        <el-table-column prop="pkg_arch" label="架构" width="100" />
        <el-table-column prop="pkg_release" label="发行号" width="120" show-overflow-tooltip />
        <el-table-column prop="pkg_version" label="版本号" width="120" show-overflow-tooltip />
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
        <el-table-column prop="repo_id" label="仓库ID" width="120" show-overflow-tooltip />
        <el-table-column prop="scan_date" label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.scan_date) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器区域 -->
    <div v-if="hasResult" class="ops-pagination-wrapper">
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
import { useSoftwareListRead } from '../../composables/useSoftwareListRead'

const {
  rows: tableData,
  total,
  loading,
  hasResult,
  error: readError,
  errorMessage: readErrorMessage,
  emptyText,
  canRetry,
  load,
  retry
} = useSoftwareListRead(params => packageApi.getAvailableList(params))
const filterText = ref('')
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total
})

// 加载数据
function loadData() {
  return load({
    page: pagination.page,
    size: pagination.pageSize,
    filter: filterText.value || ''
  })
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
  return readError.value ? retry() : loadData()
}

defineExpose({ refresh })

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.available-packages-table {
  @include software-layout.table-tab;
}
</style>
