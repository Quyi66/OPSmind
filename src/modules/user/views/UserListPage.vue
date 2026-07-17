<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="用户类型">
          <el-select v-model="filters.types" multiple placeholder="请选择" style="width: 200px" @change="handleSearch">
            <el-option label="系统用户" value="0" />
            <el-option label="普通用户" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="锁定状态">
          <el-select
            v-model="filters.lockStatus"
            multiple
            placeholder="请选择"
            style="width: 200px" @change="handleSearch">
            <el-option label="锁定" value="1" />
            <el-option label="未锁定" value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="主机/IP/用户名/用户组"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          @clear="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon>
              <Search />
            </el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon>
              <RefreshRight />
            </el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleScanHost">
        <i class="fa fa-redo-alt"></i>
        扫描主机
      </el-button>
      <el-button type="default" size="small" @click="handleCreateUser">
        <i class="fa fa-user-plus"></i>
        创建用户
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
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 用户列表表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="tableData" v-loading="loading" max-height="calc(100vh - 264px)">
        <el-table-column prop="host_key" label="IP" width="130" />

        <el-table-column prop="hostname" label="主机名" width="120" show-overflow-tooltip />

        <el-table-column prop="username" label="用户名" width="140">
          <template #default="{ row }">
            <el-tag
              :type="getUserBadgeType(row.uid)"
              size="small"
              class="clickable-tag"
              @click="handleEditUser(row)"
            >
              <i :class="['fa', getUserIcon(row.uid)]"></i>
              {{ row.username }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="锁定状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getLockStatusType(row.lock_status)"
              size="small"
              class="clickable-tag"
              @click="handleEditUser(row, 'lock')"
            >
              <i :class="['fa', getLockStatusIcon(row.lock_status)]"></i>
              {{ getLockStatusText(row.lock_status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="primary_group" label="主用户组" width="140" show-overflow-tooltip />

        <el-table-column
          prop="secondary_group"
          label="附加用户组"
          min-width="180"
          show-overflow-tooltip
        />

        <el-table-column prop="shell" label="Shell" width="130" show-overflow-tooltip />

        <el-table-column prop="last_login_time" label="最后登录" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.last_login_time) }}
          </template>
        </el-table-column>

        <el-table-column label="登录错误" width="90">
          <template #default="{ row }">
            <el-tag
              v-if="row.login_fail_message"
              type="warning"
              size="small"
              class="clickable-tag"
              @click="handleLoginErrorDetail(row)"
            >
              <i class="fa fa-list-alt"></i>
              详情
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="updated_at" label="更新时间" width="180" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="left" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEditUser(row)">
              修改
            </el-button>
            <el-button text type="danger" size="small" @click="handleDeleteUser(row)">
              删除
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

    <!-- 扫描主机对话框 -->
    <ScanHostDialog v-model:visible="showScanHostDialog" @success="loadData" />

    <!-- 创建用户对话框 -->
    <CreateUserDialog v-model:visible="showCreateUserDialog" @success="loadData" />

    <!-- 编辑单个用户对话框 -->
    <EditUserDialog
      v-model:visible="showEditUserDialog"
      :user="editingUser"
      :initial-operate="editOperate"
      @success="loadData"
    />

    <DeleteUserDialog
      v-model:visible="showDeleteUserDialog"
      :user="deletingUser"
      @success="loadData"
    />

    <LoginErrorDialog v-model:visible="showLoginErrorDialog" :user-id="loginErrorUserId" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import ScanHostDialog from '@/modules/user/components/dialogs/ScanHostDialog.vue'
import CreateUserDialog from '@/modules/user/components/dialogs/CreateUserDialog.vue'
import DeleteUserDialog from '@/modules/user/components/dialogs/DeleteUserDialog.vue'
import EditUserDialog from '@/modules/user/components/dialogs/EditUserDialog.vue'
import LoginErrorDialog from '@/modules/user/components/dialogs/LoginErrorDialog.vue'

const filters = ref({
  types: ['0', '1'],
  lockStatus: ['2'],
  host_key: '',
  username: '',
  keyword: ''
})

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const showScanHostDialog = ref(false)
const showCreateUserDialog = ref(false)
const showEditUserDialog = ref(false)
const editingUser = ref({})
const editOperate = ref('modify_base')
const showDeleteUserDialog = ref(false)
const deletingUser = ref({})
const showLoginErrorDialog = ref(false)
const loginErrorUserId = ref('')

function getUserBadgeType(uid) {
  if (uid === 0) return 'primary'
  if (uid > 0 && uid < 1000) return 'info'
  return 'info'
}

function getUserIcon(uid) {
  if (uid === 0) return 'fa-user-secret'
  if (uid > 0 && uid < 1000) return 'fa-user-shield'
  return 'fa-user-tie'
}

function getLockStatusType(status) {
  const types = { 0: 'info', 1: 'danger', 2: 'success' }
  return types[status] || 'info'
}

function getLockStatusIcon(status) {
  const icons = { 0: 'fa-question-circle', 1: 'fa-lock', 2: 'fa-unlock-alt' }
  return icons[status] || 'fa-question-circle'
}

function getLockStatusText(status) {
  const texts = { 0: '未知', 1: '锁定', 2: '未锁定' }
  return texts[status] || ''
}

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

async function loadData() {
  loading.value = true
  try {
    const response = await userApi.getUsers({
      types: filters.value.types.join(','),
      lockStatus: filters.value.lockStatus.join(','),
      page: currentPage.value,
      size: pageSize.value,
      filter: filters.value.keyword
        ? `host_key|hostname|primary_group|secondary_group|comment|shell|home|username:*${filters.value.keyword}*`
        : undefined
    })
    tableData.value = response?.records || response?.data?.records || []
    total.value = response?.total || response?.data?.total || 0
  } catch (error) {
    console.error('Failed to load users:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function handleScanHost() {
  showScanHostDialog.value = true
}

function handleCreateUser() {
  showCreateUserDialog.value = true
}

function handleEditUser(row, operate = 'modify_base') {
  editingUser.value = { ...row }
  editOperate.value = operate
  showEditUserDialog.value = true
}

function handleDeleteUser(row) {
  deletingUser.value = { ...row }
  showDeleteUserDialog.value = true
}

function handleLoginErrorDetail(row) {
  loginErrorUserId.value = row.id || ''
  showLoginErrorDialog.value = true
}

function handleSearch() {
  currentPage.value = 1
  loadData()
}

function handleReset() {
  filters.value = {
    types: ['0', '1'],
    lockStatus: ['2'],
    host_key: '',
    username: '',
    keyword: ''
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
:deep(.el-tag i) {
  margin-right: 4px;
}

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}
</style>
