<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.hostname"
            placeholder="主机名/IP/用户组"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreateGroup">
        <el-icon><Plus /></el-icon>
        创建用户组
      </el-button>
      <el-button size="small" @click="handleDeleteGroup">
        <i class="fa fa-user-minus"></i>
        批量删除
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        title="刷新"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 用户组列表表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="tableData" v-loading="loading" max-height="calc(100vh - 230px)">
        <el-table-column prop="host_key" label="IP" width="130" />
        <el-table-column prop="hostname" label="主机名" width="150" show-overflow-tooltip />
        <el-table-column prop="group_name" label="组名" min-width="140" />
        <el-table-column prop="gid" label="GID" width="80" />
        <el-table-column prop="users" label="用户" min-width="200" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" size="small" @click="handleDeleteSingleGroup(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @update:current-page="handleCurrentPageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>

    <!-- 创建用户组对话框 -->
    <CreateGroupDialog v-model:visible="showCreateGroupDialog" @success="loadData" />

    <!-- 删除用户组对话框 -->
    <DeleteGroupDialog
      v-model:visible="showDeleteGroupDialog"
      :group-data="currentGroupData"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh, Search, RefreshRight, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as userApi from '@/modules/user/api'
import CreateGroupDialog from '@/modules/user/components/dialogs/CreateGroupDialog.vue'
import DeleteGroupDialog from '@/modules/user/components/dialogs/DeleteGroupDialog.vue'

const filters = ref({
  host_key: '',
  group_name: '',
  hostname: ''
})

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const showCreateGroupDialog = ref(false)
const showDeleteGroupDialog = ref(false)
const currentGroupData = ref(null)

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

let isLoadingData = false
async function loadData() {
  if (isLoadingData) return
  isLoadingData = true
  loading.value = true

  const page = currentPage.value
  const size = pageSize.value

  try {
    const response = await userApi.getUserGroups({
      hostObject: '@@(linux)',
      page,
      size,
      filter: filters.value.hostname
        ? `hostname|host_key|group_name:*${filters.value.hostname}*`
        : ''
    })
    tableData.value = response?.records || response?.data?.records || []

    const newTotal = response?.total || response?.data?.total || 0
    const minExpectedTotal = (page - 1) * size + tableData.value.length
    if (newTotal >= minExpectedTotal || page === 1) {
      total.value = newTotal
    }
  } catch (error) {
    console.error('Failed to load groups:', error)
    tableData.value = []
  } finally {
    loading.value = false
    setTimeout(() => {
      isLoadingData = false
    }, 0)
  }
}

function handlePageSizeChange(val) {
  if (isLoadingData) return
  if (pageSize.value === val) return
  pageSize.value = val
  currentPage.value = 1
  loadData()
}

function handleCurrentPageChange(val) {
  if (isLoadingData) return
  if (currentPage.value === val) return
  currentPage.value = val
  loadData()
}

function handleCreateGroup() {
  showCreateGroupDialog.value = true
}

function handleDeleteGroup() {
  currentGroupData.value = null
  showDeleteGroupDialog.value = true
}

function handleDeleteSingleGroup(row) {
  currentGroupData.value = {
    hostId: row.host_id,
    group_name: row.group_name,
    host_key: row.host_key,
    hostname: row.hostname
  }
  showDeleteGroupDialog.value = true
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function handleReset() {
  filters.value = {
    host_key: '',
    group_name: '',
    hostname: ''
  }
  currentPage.value = 1
  pageSize.value = 10
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.groups-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.filter-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.view-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}
</style>
