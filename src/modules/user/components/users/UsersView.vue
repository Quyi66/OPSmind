<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <div class="filter-bar__item">
        <span class="filter-label">用户类型:</span>
        <el-checkbox-group v-model="filters.types" size="small" @change="loadData">
          <el-checkbox label="0">
            <el-tag type="info" size="small">系统用户</el-tag>
          </el-checkbox>
          <el-checkbox label="1">
            <el-tag size="small">普通用户</el-tag>
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="filter-bar__item">
        <span class="filter-label">锁定状态:</span>
        <el-checkbox-group v-model="filters.lockStatus" size="small" @change="loadData">
          <el-checkbox label="1">
            <el-tag type="danger" size="small"><i class="fa fa-lock"></i> 锁定</el-tag>
          </el-checkbox>
          <el-checkbox label="2">
            <el-tag type="success" size="small"><i class="fa fa-unlock-alt"></i> 未锁定</el-tag>
          </el-checkbox>
        </el-checkbox-group>
      </div>
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
        <span class="filter-label">用户名:</span>
        <el-input
          v-model="filters.username"
          size="small"
          placeholder="输入用户名"
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
      <el-button type="primary" plain size="small" @click="handleScanHost">
        <i class="fa fa-redo-alt"></i> 扫描主机
      </el-button>
      <el-button type="default" plain size="small" @click="handleCreateUser">
        <i class="fa fa-user-plus"></i> 创建用户
      </el-button>
      <el-button type="default" plain size="small" @click="handleModifyUser">
        <i class="fa fa-user-edit"></i> 修改用户
      </el-button>
      <el-button size="small" :icon="Refresh" @click="loadData" title="刷新" />
    </div>

    <!-- 用户列表表格 -->
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
      <el-table-column prop="hostname" label="主机名" width="140" show-overflow-tooltip />
      <el-table-column prop="username" label="用户名" width="140">
        <template #default="{ row }">
          <el-tag
            :type="getUserBadgeType(row.uid)"
            size="small"
            class="clickable-tag"
            @click="handleUserDetail(row)"
          >
            <i :class="['fa', getUserIcon(row.uid)]"></i>
            {{ row.username }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lock_status" label="锁定状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getLockStatusType(row.lock_status)" size="small">
            <i :class="['fa', getLockStatusIcon(row.lock_status)]"></i>
            {{ getLockStatusText(row.lock_status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="uid" label="UID" width="70" />
      <el-table-column prop="gid" label="GID" width="70" />
      <el-table-column prop="primary_group" label="主用户组" width="100" show-overflow-tooltip />
      <el-table-column prop="secondary_group" label="附加用户组" min-width="120" show-overflow-tooltip />
      <el-table-column prop="comment" label="备注" width="100" show-overflow-tooltip />
      <el-table-column prop="shell" label="Shell" width="120" show-overflow-tooltip />
      <el-table-column prop="home" label="主目录" min-width="150" show-overflow-tooltip />
      <el-table-column prop="password_last_modify_time" label="密码修改时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.password_last_modify_time) }}
        </template>
      </el-table-column>
      <el-table-column prop="expired_date" label="过期时间" width="100" />
      <el-table-column prop="sudo_command" label="sudo权限" min-width="150" show-overflow-tooltip />
      <el-table-column prop="crontab" label="定时任务" width="90">
        <template #default="{ row }">
          <el-tag
            v-if="row.crontab"
            type="info"
            size="small"
            class="clickable-tag"
            @click="handleCrontabDetail(row)"
          >
            <i class="fa fa-list-alt"></i> 详情
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="home_size" label="主目录大小" width="100">
        <template #default="{ row }">
          {{ row.home_size ? row.home_size + 'M' : '' }}
        </template>
      </el-table-column>
      <el-table-column prop="last_login_time" label="最后登录" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.last_login_time) }}
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
        :page-sizes="[15, 30, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 扫描主机对话框 -->
    <ScanHostDialog
      v-model:visible="showScanHostDialog"
      @success="loadData"
    />

    <!-- 创建用户对话框 -->
    <CreateUserDialog
      v-model:visible="showCreateUserDialog"
      @success="loadData"
    />

    <!-- 修改用户对话框 -->
    <ModifyUserDialog
      v-model:visible="showModifyUserDialog"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import ScanHostDialog from '@/modules/user/components/dialogs/ScanHostDialog.vue'
import CreateUserDialog from '@/modules/user/components/dialogs/CreateUserDialog.vue'
import ModifyUserDialog from '@/modules/user/components/dialogs/ModifyUserDialog.vue'

// 筛选条件
const filters = ref({
  types: ['0', '1'],       // 用户类型: 0=系统用户, 1=普通用户
  lockStatus: ['2'],       // 锁定状态: 1=锁定, 2=未锁定
  host_key: '',            // IP地址
  username: ''             // 用户名
})

const loading = ref(false)
const tableData = ref([])
const selectedRows = ref([])
const currentPage = ref(1)
const pageSize = ref(15)
const total = ref(0)

// 对话框显示状态
const showScanHostDialog = ref(false)
const showCreateUserDialog = ref(false)
const showModifyUserDialog = ref(false)

// 获取用户徽章类型 (根据UID判断用户类型)
function getUserBadgeType(uid) {
  if (uid === 0) return 'primary'      // admin (root)
  if (uid > 0 && uid < 1000) return 'info'  // 系统用户
  return ''  // 普通用户
}

// 获取用户图标
function getUserIcon(uid) {
  if (uid === 0) return 'fa-user-secret'
  if (uid > 0 && uid < 1000) return 'fa-user-shield'
  return 'fa-user-tie'
}

// 获取锁定状态样式
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
    const response = await userApi.getUsers({
      host_key: filters.value.host_key,
      username: filters.value.username,
      types: filters.value.types.join(','),
      lockStatus: filters.value.lockStatus.join(','),
      page: currentPage.value,
      size: pageSize.value
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

// 表格选择变化
function handleSelectionChange(selection) {
  selectedRows.value = selection
}

// 按钮事件
function handleScanHost() {
  showScanHostDialog.value = true
}

function handleCreateUser() {
  showCreateUserDialog.value = true
}

function handleModifyUser() {
  showModifyUserDialog.value = true
}

function handleUserDetail(row) {
  console.log('用户详情:', row)
}

function handleCrontabDetail(row) {
  console.log('定时任务详情:', row)
}

function handleReset() {
  filters.value = {
    types: ['0', '1'],
    lockStatus: ['2'],
    host_key: '',
    username: ''
  }
  currentPage.value = 1
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.users-view {
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

.clickable-tag {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
}

:deep(.el-checkbox-group) {
  display: flex;
  gap: 8px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}
</style>
