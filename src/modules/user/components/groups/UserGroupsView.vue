<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <div class="filter-bar__item">
        <span class="filter-label">IP:</span>
        <el-input
          v-model="filters.host_key"
          size="small"
          placeholder="输入IP地址"
          clearable
          style="width: 150px"
          @keyup.enter="loadData"
        />
      </div>
      <div class="filter-bar__item">
        <span class="filter-label">组名:</span>
        <el-input
          v-model="filters.group_name"
          size="small"
          placeholder="输入组名"
          clearable
          style="width: 150px"
          @keyup.enter="loadData"
        />
      </div>
      <el-button type="primary" size="small" @click="loadData">
        <i class="fa fa-search"></i> 搜索
      </el-button>
      <el-button size="small" @click="handleReset">
        <i class="fa fa-undo"></i> 重置
      </el-button>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" plain size="small" @click="handleCreateGroup">
        <i class="fa fa-plus-circle"></i> 创建用户组
      </el-button>
      <el-button type="danger" plain size="small" @click="handleDeleteGroup">
        <i class="fa fa-minus-circle"></i> 删除用户组
      </el-button>
      <el-button size="small" :icon="Refresh" @click="loadData" title="刷新" />
    </div>

    <!-- 用户组列表表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="host_key" label="IP" width="130" />
        <el-table-column prop="hostname" label="主机名" width="150" show-overflow-tooltip />
        <el-table-column prop="group_name" label="组名" width="140" />
        <el-table-column prop="gid" label="GID" width="80" />
        <el-table-column prop="users" label="用户" min-width="200" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              plain
              size="small"
              @click="handleDeleteSingleGroup(row)"
            >
              <i class="fa fa-minus-circle"></i> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 创建用户组对话框 -->
    <CreateGroupDialog
      v-model:visible="showCreateGroupDialog"
      @success="loadData"
    />

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
import { Refresh } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import CreateGroupDialog from '@/modules/user/components/dialogs/CreateGroupDialog.vue'
import DeleteGroupDialog from '@/modules/user/components/dialogs/DeleteGroupDialog.vue'

// 筛选条件
const filters = ref({
  host_key: '',
  group_name: ''
})

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 对话框
const showCreateGroupDialog = ref(false)
const showDeleteGroupDialog = ref(false)
const currentGroupData = ref(null)

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

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await userApi.getUserGroups({
      host_key: filters.value.host_key || null,
      group_name: filters.value.group_name || null,
      hostObject: '@@(linux)',
      page: currentPage.value,
      size: pageSize.value
    })
    tableData.value = response?.records || response?.data?.records || []
    total.value = response?.total || response?.data?.total || 0
  } catch (error) {
    console.error('Failed to load groups:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// 表格选择变化
function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 创建用户组
function handleCreateGroup() {
  showCreateGroupDialog.value = true
}

// 批量删除用户组
function handleDeleteGroup() {
  currentGroupData.value = null
  showDeleteGroupDialog.value = true
}

// 删除单个用户组
function handleDeleteSingleGroup(row) {
  currentGroupData.value = {
    hostId: row.host_id,
    group_name: row.group_name,
    host_key: row.host_key,
    hostname: row.hostname
  }
  showDeleteGroupDialog.value = true
}

function handleReset() {
  filters.value = {
    host_key: '',
    group_name: ''
  }
  currentPage.value = 1
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
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.filter-label {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}

.view-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}
</style>
