<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索用户名/姓名"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px">
            <el-option label="已激活" value="activated" />
            <el-option label="已禁用" value="disabled" />
          </el-select>
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

    <div class="ops-action-bar">
      <el-button size="small" @click="handleCleanExpired">
        <i class="fa fa-broom"></i> 清理过期分配
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table
        :data="filteredData"
        v-loading="loading"
        style="width: 100%"
        max-height="calc(100vh - 280px)"
      >
        <el-table-column prop="login" label="用户名" width="120" />
        <el-table-column prop="fullName" label="姓名" min-width="120" />
        <el-table-column prop="department" label="部门" min-width="120">
          <template #default="{ row }">
            {{ row.department || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="activated" label="状态" width="100" align="left">
          <template #default="{ row }">
            <el-tag :type="row.activated ? 'success' : 'danger'" size="small">
              {{ row.activated ? '已激活' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- <el-table-column prop="authMode" label="认证方式" width="120" align="left">
          <template #default="{ row }">
            <el-tag :type="getAuthModeType(row.authMode)" size="small">
              {{ getAuthModeLabel(row.authMode) }}
            </el-tag>
          </template>
        </el-table-column> -->
        <el-table-column prop="roles" label="角色" min-width="250">
          <template #default="{ row }">
            <div class="roles-cell">
              <el-tag
                v-for="role in row.roles || []"
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
        <!-- <el-table-column prop="lastModifiedDate" label="最后修改时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.lastModifiedDate) }}
          </template>
        </el-table-column> -->
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleAssignPatch(row)">
              分配补丁
            </el-button>
            <el-button size="small" text type="primary" @click="handleViewPatchRecords(row)">
              分配记录
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

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

    <AssignPatchDialog
      v-model:visible="assignDialogVisible"
      :username="currentPatchUserLogin"
    />

    <PatchRecordsDialog
      v-model:visible="recordsDialogVisible"
      :username="currentPatchUserLogin"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { authService } from '@/core/auth'
import * as settingsApi from '@/modules/settings/api'
import AssignPatchDialog from '@/modules/user/components/dialogs/AssignPatchDialog.vue'
import PatchRecordsDialog from '@/modules/user/components/dialogs/PatchRecordsDialog.vue'

const loading = ref(false)
const tableData = ref([])

const filters = reactive({
  keyword: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const appliedKeyword = ref('')
const appliedStatus = ref('')
const assignDialogVisible = ref(false)
const recordsDialogVisible = ref(false)
const currentPatchUserLogin = ref('')

const filteredData = computed(() => {
  let result = tableData.value

  if (appliedKeyword.value) {
    const keyword = appliedKeyword.value.toLowerCase()
    result = result.filter(item =>
      item.login?.toLowerCase().includes(keyword)
      || item.fullName?.toLowerCase().includes(keyword)
    )
  }

  if (appliedStatus.value === 'activated') {
    result = result.filter(item => item.activated)
  } else if (appliedStatus.value === 'disabled') {
    result = result.filter(item => !item.activated)
  }

  pagination.total = result.length

  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return result.slice(start, end)
})

const patchAssignmentApi = {
  cleanExpired: () => apiService.post('/vap/api/vap/v2/patch/assignment/clean-expired')
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const tenantId = authService.getCurrentUser()?.tenantId || ''
    const response = await settingsApi.getUsers(tenantId)
    const result = response?.data || response
    tableData.value = Array.isArray(result) ? result : []
    pagination.total = tableData.value.length
  } catch (error) {
    console.error('Failed to load users:', error)
    ElMessage.error('加载用户列表失败')
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  appliedKeyword.value = filters.keyword
  appliedStatus.value = filters.status
  pagination.page = 1
}

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

function resolvePatchUserLogin(row) {
  return row?.login || row?.username || ''
}

async function handleCleanExpired() {
  try {
    await ElMessageBox.confirm(
      '确认要清理系统中所有已经过期的补丁分配记录吗？',
      '清理警告',
      { type: 'warning' }
    )

    const res = await patchAssignmentApi.cleanExpired()
    const count = res?.data?.cleaned || 0
    ElMessage.success(`清理成功，共清理了 ${count} 条记录`)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to clean expired patch assignments:', error)
      ElMessage.error('清理失败')
    }
  }
}

function handleAssignPatch(row) {
  const login = resolvePatchUserLogin(row)
  if (!login) {
    ElMessage.warning('当前用户缺少登录名，无法分配补丁')
    return
  }

  currentPatchUserLogin.value = login
  assignDialogVisible.value = true
}

function handleViewPatchRecords(row) {
  const login = resolvePatchUserLogin(row)
  if (!login) {
    ElMessage.warning('当前用户缺少登录名，无法查看补丁分配记录')
    return
  }

  currentPatchUserLogin.value = login
  recordsDialogVisible.value = true
}
</script>

<style scoped lang="scss">
.roles-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  margin: 0;
}
</style>
