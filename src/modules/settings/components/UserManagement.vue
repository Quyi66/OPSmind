<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索用户名/姓名"
        clearable
        size="small"
        style="width: 200px"
        @input="handleSearch"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="状态" clearable size="small" style="width: 120px" @change="handleSearch">
        <el-option label="已激活" value="activated" />
        <el-option label="已禁用" value="disabled" />
      </el-select>
      <el-button type="primary" size="small" @click="handleSearch">
        <i class="fa fa-search"></i> 搜索
      </el-button>
      <el-button size="small" @click="handleReset">
        <i class="fa fa-undo"></i> 重置
      </el-button>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreateUser">
        <i class="fa fa-plus"></i> 添加用户
      </el-button>
      <el-button size="small" @click="handleAllocateRole">
        <i class="fa fa-user-tag"></i> 分配角色
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="filteredData"
        v-loading="loading"
        border
        style="width: 100%"
      >
        <el-table-column prop="login" label="用户名" width="120" />
        <el-table-column prop="fullName" label="姓名" width="100" />
        <el-table-column prop="department" label="部门" width="100">
          <template #default="{ row }">
            {{ row.department || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="activated" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.activated ? 'success' : 'danger'"
              size="small"
              @click="handleToggleActivation(row)"
              style="cursor: pointer"
              :class="{ 'is-loading': togglingUserId === row.tenantUserId }"
            >
              {{ togglingUserId === row.tenantUserId ? '切换中...' : (row.activated ? '已激活' : '已禁用') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="authMode" label="认证方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getAuthModeType(row.authMode)" size="small">
              {{ getAuthModeLabel(row.authMode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="roles" label="角色" min-width="200">
          <template #default="{ row }">
            <div class="roles-cell">
              <el-tag
                v-for="role in row.roles"
                :key="role.id"
                size="small"
                type="info"
                class="role-tag"
              >
                {{ role.description || role.name }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="lastModifiedDate" label="最后修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.lastModifiedDate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="handleView(row)">
              查看
            </el-button>
            <el-button size="small" link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              @click="handleDelete(row)"
              :disabled="isCurrentUser(row) || deletingUserId === row.tenantUserId"
              :loading="deletingUserId === row.tenantUserId"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 用户编辑/查看对话框 -->
    <UserEditDialog
      v-model="dialogVisible"
      :user="selectedUser"
      :mode="dialogMode"
      @saved="loadData"
    />

    <!-- 分配角色对话框 -->
    <AllocateRoleDialog
      v-model="allocateRoleVisible"
      @saved="loadData"
    />

    <!-- 关联用户对话框 -->
    <LinkTenantUserDialog
      v-model="linkUserVisible"
      @saved="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'
import UserEditDialog from './UserEditDialog.vue'
import AllocateRoleDialog from './AllocateRoleDialog.vue'
import LinkTenantUserDialog from './LinkTenantUserDialog.vue'

const loading = ref(false)
const tableData = ref([])

// 搜索和筛选
const searchText = ref('')
const statusFilter = ref('')

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

// 过滤后的数据
const filteredData = computed(() => {
  let result = tableData.value

  // 关键词搜索
  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(item =>
      item.login?.toLowerCase().includes(keyword) ||
      item.fullName?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选
  if (statusFilter.value === 'activated') {
    result = result.filter(item => item.activated)
  } else if (statusFilter.value === 'disabled') {
    result = result.filter(item => !item.activated)
  }

  // 更新分页总数
  pagination.value.total = result.length

  // 分页
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return result.slice(start, end)
})

// 对话框相关
const dialogVisible = ref(false)
const selectedUser = ref(null)
const dialogMode = ref('edit') // 'view' | 'edit' | 'create'
const allocateRoleVisible = ref(false)
const linkUserVisible = ref(false)

// 当前登录用户
const currentUserLogin = computed(() => {
  try {
    const user = authService.getCurrentUser()
    return user?.login || ''
  } catch {
    return ''
  }
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    // 获取当前用户的 tenantId
    const user = authService.getCurrentUser()
    const tenantId = user?.tenantId || ''

    const response = await settingsApi.getUsers(tenantId)
    const result = response?.data || response
    tableData.value = Array.isArray(result) ? result : []
    pagination.value.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load users:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  pagination.value.page = 1
}

// 重置
function handleReset() {
  searchText.value = ''
  statusFilter.value = ''
  pagination.value.page = 1
}

function getAuthModeType(authMode) {
  switch (authMode) {
    case 'AD': return 'primary'
    case 'MIX': return 'warning'
    case 'UN': return 'success'
    default: return 'info'
  }
}

function getAuthModeLabel(authMode) {
  switch (authMode) {
    case 'AD': return 'Active Directory'
    case 'MIX': return '混合认证'
    case 'UN': return '统一认证'
    case 'LOCAL': return '本地认证'
    default: return authMode || '本地'
  }
}

function formatTime(time) {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return time
  }
}

function isCurrentUser(row) {
  return row.login === currentUserLogin.value
}

// 状态切换中
const togglingUserId = ref(null)

async function handleToggleActivation(row) {
  if (isCurrentUser(row)) {
    ElMessage.warning('不能修改当前登录用户的状态')
    return
  }

  // 防抖：如果正在切换则返回
  if (togglingUserId.value) {
    return
  }

  const newStatus = !row.activated
  const action = newStatus ? '激活' : '禁用'

  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 "${row.fullName || row.login}" 吗？`,
      '确认操作',
      { type: 'warning' }
    )

    togglingUserId.value = row.tenantUserId
    await settingsApi.toggleUserActivation(row, newStatus)
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to toggle user activation:', error)
      ElMessage.error(`${action}失败`)
    }
  } finally {
    togglingUserId.value = null
  }
}

function handleAllocateRole() {
  allocateRoleVisible.value = true
}

function handleCreateUser() {
  linkUserVisible.value = true
}

function handleView(row) {
  selectedUser.value = row
  dialogMode.value = 'view'
  dialogVisible.value = true
}

function handleEdit(row) {
  selectedUser.value = row
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

// 删除中状态
const deletingUserId = ref(null)

async function handleDelete(row) {
  if (isCurrentUser(row)) {
    ElMessage.warning('不能删除当前登录用户')
    return
  }

  // 防抖：如果正在删除则返回
  if (deletingUserId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${row.fullName || row.login}" 吗？`,
      '确认删除',
      { type: 'warning' }
    )

    deletingUserId.value = row.tenantUserId
    await settingsApi.deleteUser(row.tenantUserId)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete user:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deletingUserId.value = null
  }
}
</script>

<style scoped lang="scss">
// 仅保留组件特定样式，布局类由全局 element-ui.scss 提供
.roles-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  margin: 0;
}
</style>
