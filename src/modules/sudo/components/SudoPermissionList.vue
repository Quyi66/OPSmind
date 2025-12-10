<template>
  <div class="sudo-permission-list">
    <!-- 头部工具栏 -->
    <div class="list-header">
      <h3 class="list-title">sudo权限列表</h3>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索"
          clearable
          style="width: 200px"
        >
          <template #suffix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-button size="small" @click="loadData">
          <i class="fa fa-refresh"></i>
        </el-button>
        <el-button type="primary" size="small" plain @click="handleScanHosts">
          <i class="fa fa-redo"></i> 扫描主机
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="list-table">
      <el-table
        :data="filteredData"
        v-loading="loading"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column label="主机" prop="$data_owner" min-width="150" sortable>
          <template #default="{ row }">
            {{ row.$data_owner || row.host || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="用户/用户组" prop="user" min-width="120">
          <template #default="{ row }">
            {{ row.user || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="sudo文件" prop="file" min-width="150">
          <template #default="{ row }">
            {{ row.file || '-----' }}
          </template>
        </el-table-column>
        <el-table-column label="sudo配置" prop="user_spec" min-width="200">
          <template #default="{ row }">
            <div class="cell-ellipsis" :title="row.user_spec">
              {{ row.user_spec || '-----' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="$update_time" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.$update_time) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="list-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        small
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
.sudo-permission-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;

  .list-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
}

.list-table {
  flex: 1;
  min-height: 0;
  padding: 0 16px;
  overflow: auto;

  .cell-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.list-footer {
  padding: 12px 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-start;
}
</style>
