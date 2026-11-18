<template>
  <div class="ops-page-layout">
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small">
        <el-form-item :label="t('settings.user.keyword')">
          <el-input
            v-model="filters.keyword"
            :placeholder="t('settings.user.search')"
            clearable
            :style="{ width: currentLocale === 'en-US' ? '280px' : '200px' }" @keyup.enter="handleSearch" @clear="handleSearch">
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

    <div class="ops-action-bar">
      <el-button size="small" @click="handleCleanExpired">
        <i class="fa fa-broom"></i>
        {{ t('settings.patchAssignment.clean') }}
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
        <!-- <el-table-column prop="authMode" label="认证方式" width="120" align="left">
          <template #default="{ row }">
            <el-tag :type="getAuthModeType(row.authMode)" size="small">
              {{ getAuthModeLabel(row.authMode) }}
            </el-tag>
          </template>
        </el-table-column> -->
        <el-table-column prop="roles" :label="t('settings.user.roles')" min-width="250">
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
        <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 252 : 152" class-name="assignment-actions" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleAssignPatch(row)">
              {{ t('settings.patchAssignment.assign') }}
            </el-button>
            <el-button size="small" text type="primary" @click="handleViewPatchRecords(row)">
              {{ t('settings.patchAssignment.records') }}
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

    <AssignPatchDialog v-model:visible="assignDialogVisible" :username="currentPatchUserLogin" />

    <PatchRecordsDialog v-model:visible="recordsDialogVisible" :username="currentPatchUserLogin" />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
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
    result = result.filter(
      item =>
        item.login?.toLowerCase().includes(keyword) ||
        item.fullName?.toLowerCase().includes(keyword)
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
  cleanExpired: () => apiService.post('/secops/api/secops/v2/patch/assignment/clean-expired')
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
    ElMessage.error(t('settings.user.loadFailed'))
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

function resolvePatchUserLogin(row) {
  return row?.login || row?.username || ''
}

async function handleCleanExpired() {
  try {
    await ElMessageBox.confirm(t('settings.patchAssignment.cleanConfirm'), t('settings.patchAssignment.cleanWarning'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    const res = await patchAssignmentApi.cleanExpired()
    const count = res?.data?.cleaned || 0
    ElMessage.success(t('settings.patchAssignment.cleaned', { count }))
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to clean expired patch assignments:', error)
      ElMessage.error(t('settings.patchAssignment.cleanFailed'))
    }
  }
}

function handleAssignPatch(row) {
  const login = resolvePatchUserLogin(row)
  if (!login) {
    ElMessage.warning(t('settings.patchAssignment.noLoginAssign'))
    return
  }

  currentPatchUserLogin.value = login
  assignDialogVisible.value = true
}

function handleViewPatchRecords(row) {
  const login = resolvePatchUserLogin(row)
  if (!login) {
    ElMessage.warning(t('settings.patchAssignment.noLoginRecords'))
    return
  }

  currentPatchUserLogin.value = login
  recordsDialogVisible.value = true
}
</script>

<style scoped lang="scss">
:deep(td.assignment-actions .cell) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 8px;
  white-space: nowrap;

  > .el-button {
    margin-left: 0;
  }
}

.roles-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  margin: 0;
}
</style>
