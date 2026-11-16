<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item :label="t('settings.user.keyword')">
          <el-input
            v-model="filters.keyword"
            :placeholder="t('settings.user.search')"
            clearable
            style="width: 200px" @keyup.enter="handleSearch" @clear="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item :label="t('common.status')">
          <el-select v-model="filters.status" :placeholder="t('common.status')" clearable style="width: 120px" @change="handleSearch">
            <el-option :label="t('settings.user.activated')" value="activated" />
            <el-option :label="t('settings.user.disabled')" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            {{ t('common.search') }}
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            {{ t('common.reset') }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreateUser">
        <i class="fa fa-plus"></i>
        {{ t('settings.user.add') }}
      </el-button>
      <el-button size="small" @click="handleAllocateRole">
        <i class="fa fa-user-tag"></i>
        {{ t('settings.roles.assign') }}
      </el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadData"
        :title="t('common.refresh')"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="filteredData"
        v-loading="loading"
        style="width: 100%"
        max-height="calc(100vh - 314px)"
      >
        <el-table-column prop="login" :label="t('common.username')" width="120" />
        <el-table-column prop="fullName" :label="t('settings.user.fullName')" min-width="120" />
        <el-table-column prop="department" :label="t('settings.user.department')" min-width="120">
          <template #default="{ row }">
            {{ row.department || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="activated" :label="t('common.status')" width="100" align="left">
          <template #default="{ row }">
            <el-tag :type="row.activated ? 'success' : 'danger'" size="small">
              {{ row.activated ? t('settings.user.activated') : t('settings.user.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="authMode" :label="t('settings.user.authMode')" width="120" align="left">
          <template #default="{ row }">
            <el-tag :type="getAuthModeType(row.authMode)" size="small">
              {{ getAuthModeLabel(row.authMode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="roles" :label="t('settings.user.roles')" min-width="250">
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
        <el-table-column prop="lastModifiedDate" :label="t('settings.user.modifiedAt')" width="180">
          <template #default="{ row }">
            {{ formatTime(row.lastModifiedDate) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" min-width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleView(row)">{{ t('common.view') }}</el-button>
            <el-button size="small" text type="primary" @click="handleEdit(row)">{{ t('common.edit') }}</el-button>
            <el-button
              size="small"
              text
              type="primary"
              @click="handleToggleActivation(row)"
              :disabled="isCurrentUser(row) || togglingUserId === row.tenantUserId"
              :loading="togglingUserId === row.tenantUserId"
            >
              {{ row.activated ? t('settings.user.disable') : t('settings.user.enable') }}
            </el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="handleDelete(row)"
              :disabled="isCurrentUser(row) || deletingUserId === row.tenantUserId"
              :loading="deletingUserId === row.tenantUserId"
            >
              {{ t('common.delete') }}
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
    <AllocateRoleDialog v-model="allocateRoleVisible" @saved="loadData" />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'
import UserEditDialog from '../components/user/UserEditDialog.vue'
import AllocateRoleDialog from '../components/user/AllocateRoleDialog.vue'

const loading = ref(false)
const tableData = ref([])

// 搜索和筛选
const filters = reactive({
  keyword: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 已应用的筛选条件（只在点击搜索按钮时更新）
const appliedKeyword = ref('')
const appliedStatus = ref('')

// 过滤后的数据（使用已应用的筛选条件）
const filteredData = computed(() => {
  let result = tableData.value

  // 关键词搜索
  if (appliedKeyword.value) {
    const keyword = appliedKeyword.value.toLowerCase()
    result = result.filter(
      item =>
        item.login?.toLowerCase().includes(keyword) ||
        item.fullName?.toLowerCase().includes(keyword)
    )
  }

  // 状态筛选
  if (appliedStatus.value === 'activated') {
    result = result.filter(item => item.activated)
  } else if (appliedStatus.value === 'disabled') {
    result = result.filter(item => !item.activated)
  }

  // 更新分页总数
  pagination.total = result.length

  // 分页
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return result.slice(start, end)
})

// 对话框相关
const dialogVisible = ref(false)
const selectedUser = ref(null)
const dialogMode = ref('edit') // 'view' | 'edit' | 'create'
const allocateRoleVisible = ref(false)

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
    pagination.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load users:', error)
    ElMessage.error(t('settings.user.loadFailed'))
  } finally {
    loading.value = false
  }
}

// 搜索 - 将筛选条件应用到 appliedFilters
function handleSearch() {
  appliedKeyword.value = filters.keyword
  appliedStatus.value = filters.status
  pagination.page = 1
}

// 重置
function handleReset() {
  filters.keyword = ''
  filters.status = ''
  appliedKeyword.value = ''
  appliedStatus.value = ''
  pagination.page = 1
  pagination.pageSize = 10
}

function getAuthModeType(authMode) {
  switch (authMode) {
    case 'AD':
      return 'primary'
    case 'MIX':
      return 'warning'
    case 'UN':
      return 'success'
    default:
      return 'info'
  }
}

function getAuthModeLabel(authMode) {
  switch (authMode) {
    case 'AD':
      return 'Active Directory'
    case 'MIX':
      return t('settings.user.mixedAuth')
    case 'UN':
      return t('settings.user.unifiedAuth')
    case 'LOCAL':
      return t('settings.user.localAuth')
    default:
      return authMode || t('settings.user.local')
  }
}

function formatTime(time) {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString(currentLocale.value, {
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
    ElMessage.warning(t('settings.user.cannotChangeSelf'))
    return
  }

  // 防抖：如果正在切换则返回
  if (togglingUserId.value) {
    return
  }

  const newStatus = !row.activated

  try {
    await ElMessageBox.confirm(
      t(newStatus ? 'settings.user.activateConfirm' : 'settings.user.disableConfirm', { name: row.fullName || row.login }),
      t('settings.user.confirmAction'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning'
      }
    )

    togglingUserId.value = row.tenantUserId
    await settingsApi.toggleUserActivation(row, newStatus)
    ElMessage.success(t(newStatus ? 'settings.user.activationSucceeded' : 'settings.user.disableSucceeded'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to toggle user activation:', error)
      ElMessage.error(t(newStatus ? 'settings.user.activationFailed' : 'settings.user.disableFailed'))
    }
  } finally {
    togglingUserId.value = null
  }
}

function handleAllocateRole() {
  allocateRoleVisible.value = true
}

function handleCreateUser() {
  selectedUser.value = null
  dialogMode.value = 'create'
  dialogVisible.value = true
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
    ElMessage.warning(t('settings.user.cannotDeleteSelf'))
    return
  }

  // 防抖：如果正在删除则返回
  if (deletingUserId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(t('settings.user.deleteConfirm', { name: row.fullName || row.login }), t('settings.user.confirmDelete'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    deletingUserId.value = row.tenantUserId
    await settingsApi.deleteUser(row.tenantUserId)
    ElMessage.success(t('settings.user.deleted'))
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete user:', error)
      ElMessage.error(t('settings.user.deleteFailed'))
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
