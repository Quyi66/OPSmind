<template>
  <div class="ops-page-layout user-list-page">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item label="用户类型">
          <el-select
            v-model="filters.types"
            multiple
            placeholder="请选择"
            style="width: 200px"
            @change="handleFilterChange"
          >
            <el-option label="系统用户" value="0" />
            <el-option label="普通用户" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="锁定状态">
          <el-select
            v-model="filters.lockStatus"
            multiple
            placeholder="请选择"
            style="width: 200px"
            @change="handleFilterChange"
          >
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
            @clear="handleSearch"
          />
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

    <div v-if="readError" class="read-feedback" role="status">
      <el-alert :title="readError" type="warning" :closable="false" show-icon />
      <el-button v-if="!authError" size="small" :loading="loading" @click="loadData">
        重试读取
      </el-button>
    </div>

    <!-- 用户列表表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="paginatedData" v-loading="loading" height="100%" :empty-text="emptyText">
        <el-table-column prop="host_key" label="IP" min-width="140" show-overflow-tooltip />

        <el-table-column prop="hostname" label="主机名" min-width="140" show-overflow-tooltip />

        <el-table-column prop="username" label="用户名" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag
              :type="getUserBadgeType(row.uid)"
              size="small"
              class="clickable-tag"
              :class="{ 'is-disabled': !canUseRows }"
              :title="row.username"
              role="button"
              :tabindex="canUseRows ? 0 : -1"
              :aria-disabled="!canUseRows"
              @click="handleEditUser(row)"
              @keydown.enter="handleEditUser(row)"
              @keydown.space.prevent="handleEditUser(row)"
            >
              <i :class="['fa', getUserIcon(row.uid)]"></i>
              <span class="username-text">{{ row.username }}</span>
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="锁定状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getLockStatusType(row.lock_status)"
              size="small"
              class="clickable-tag"
              :class="{ 'is-disabled': !canUseRows }"
              title="修改锁定状态，需确认后执行"
              role="button"
              :tabindex="canUseRows ? 0 : -1"
              :aria-disabled="!canUseRows"
              @click="handleEditUser(row, 'lock')"
              @keydown.enter="handleEditUser(row, 'lock')"
              @keydown.space.prevent="handleEditUser(row, 'lock')"
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
              :class="{ 'is-disabled': !canUseRows }"
              role="button"
              :tabindex="canUseRows ? 0 : -1"
              :aria-disabled="!canUseRows"
              @click="handleLoginErrorDetail(row)"
              @keydown.enter="handleLoginErrorDetail(row)"
              @keydown.space.prevent="handleLoginErrorDetail(row)"
            >
              <i class="fa fa-list-alt"></i>
              详情
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="updated_at" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updated_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" align="left" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!canUseRows"
                @click="handleEditUser(row)"
              >
                修改
              </el-button>
              <el-button
                text
                type="danger"
                size="small"
                :disabled="!canUseRows"
                @click="handleDeleteUser(row)"
              >
                删除
              </el-button>
            </div>
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
        @size-change="handleSizeChange"
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
import { ref, computed, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import ScanHostDialog from '@/modules/user/components/dialogs/ScanHostDialog.vue'
import CreateUserDialog from '@/modules/user/components/dialogs/CreateUserDialog.vue'
import DeleteUserDialog from '@/modules/user/components/dialogs/DeleteUserDialog.vue'
import EditUserDialog from '@/modules/user/components/dialogs/EditUserDialog.vue'
import LoginErrorDialog from '@/modules/user/components/dialogs/LoginErrorDialog.vue'

const defaultFilters = () => ({
  types: ['0', '1'],
  lockStatus: ['1', '2'],
  host_key: '',
  username: '',
  keyword: ''
})
const filters = ref(defaultFilters())
const appliedFilters = ref(defaultFilters())

const loading = ref(false)
const filteredData = ref([])
const readError = ref('')
const authError = ref(false)
const active = ref(true)
let requestVersion = 0
let successfulQuery = null
const currentPage = ref(1)
const pageSize = ref(10)
const canUseRows = computed(() => active.value && !loading.value && !readError.value)
const emptyText = computed(() =>
  loading.value ? '正在读取…' : readError.value || '暂无符合条件的用户'
)

// 总条数：基于筛选后的数据计算
const total = computed(() => filteredData.value.length)

// 当前页数据：基于前端分页切片
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

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

/**
 * 保留原八字段本地匹配，始终使用本次请求的快照。
 */
function applyFrontendFilter(records, queryKeyword) {
  const keyword = (queryKeyword || '').trim().toLowerCase()
  if (!keyword) return records
  const searchFields = [
    'host_key',
    'hostname',
    'username',
    'primary_group',
    'secondary_group',
    'comment',
    'shell',
    'home'
  ]
  return records.filter(row =>
    searchFields.some(field => {
      const val = row[field]
      return val && String(val).toLowerCase().includes(keyword)
    })
  )
}

/**
 * 沿原 GET 参数读取；未假定后台分页/全量契约，不更改共享 API 默认值。
 */
async function loadData() {
  if (!active.value) return
  const snapshot = {
    types: [...appliedFilters.value.types],
    lockStatus: [...appliedFilters.value.lockStatus],
    keyword: appliedFilters.value.keyword
  }
  const query = JSON.stringify(snapshot)
  const version = ++requestVersion
  if (query !== successfulQuery) {
    filteredData.value = []
    successfulQuery = null
    readError.value = ''
    authError.value = false
  }
  loading.value = true
  const isCurrent = () => active.value && version === requestVersion
  try {
    const response = await userApi.getUsers({
      types: snapshot.types.join(','),
      lockStatus: snapshot.lockStatus.join(','),
      filter: snapshot.keyword
        ? `host_key|hostname|primary_group|secondary_group|comment|shell|home|username:*${snapshot.keyword}*`
        : undefined
    })
    if (!isCurrent()) return
    const records = response?.records ?? response?.data?.records
    if (!Array.isArray(records)) throw new Error('Invalid user records')
    filteredData.value = applyFrontendFilter(records, snapshot.keyword)
    successfulQuery = query
    readError.value = ''
    authError.value = false
    currentPage.value = Math.min(
      currentPage.value,
      Math.max(1, Math.ceil(total.value / pageSize.value))
    )
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to load users:', error)
    const status = error?.response?.status
    authError.value =
      status === 401 ||
      status === 403 ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    if (authError.value) {
      filteredData.value = []
      successfulQuery = null
    }
    readError.value = authError.value
      ? '读取失败：登录已失效或无权访问，请重新登录或联系管理员。'
      : filteredData.value.length
        ? '刷新失败，当前显示上次成功结果，可能已过期；请重试后再修改或删除。'
        : '用户列表读取失败，请重试。'
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function handleScanHost() {
  showScanHostDialog.value = true
}

function handleCreateUser() {
  showCreateUserDialog.value = true
}

function handleEditUser(row, operate = 'modify_base') {
  if (!canUseRows.value || !filteredData.value.includes(row)) return
  editingUser.value = { ...row }
  editOperate.value = operate
  showEditUserDialog.value = true
}

function handleDeleteUser(row) {
  if (!canUseRows.value || !filteredData.value.includes(row)) return
  deletingUser.value = { ...row }
  showDeleteUserDialog.value = true
}

function handleLoginErrorDetail(row) {
  if (!canUseRows.value || !filteredData.value.includes(row)) return
  loginErrorUserId.value = row.id || ''
  showLoginErrorDialog.value = true
}

function handleSearch() {
  applyFilters(filters.value.keyword)
}

function handleFilterChange() {
  applyFilters(appliedFilters.value.keyword)
}

function applyFilters(keyword) {
  const defaults = defaultFilters()
  for (const field of ['types', 'lockStatus']) {
    const selected = defaults[field].filter(value => filters.value[field].includes(value))
    filters.value[field] = selected.length ? selected : defaults[field]
  }
  appliedFilters.value = {
    types: [...filters.value.types],
    lockStatus: [...filters.value.lockStatus],
    keyword
  }
  currentPage.value = 1
  return loadData()
}

function handleSizeChange() {
  currentPage.value = 1
}

function handleReset() {
  filters.value = defaultFilters()
  appliedFilters.value = defaultFilters()
  currentPage.value = 1
  pageSize.value = 10
  loadData()
}

onMounted(() => {
  loadData()
})

onActivated(() => {
  active.value = true
})
function invalidateRead() {
  active.value = false
  requestVersion += 1
  if (loading.value) {
    readError.value = filteredData.value.length
      ? '读取已中断，当前显示上次成功结果，可能已过期；请刷新后再修改或删除。'
      : '用户列表读取已中断，请重试。'
  }
  loading.value = false
}
onDeactivated(invalidateRead)
onBeforeUnmount(invalidateRead)
</script>

<style scoped lang="scss">
.ops-filter-bar,
.ops-action-bar,
.read-feedback {
  flex-shrink: 0;
}

.read-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  .el-alert {
    flex: 1;
    min-width: 0;
  }
}

.ops-table-wrapper {
  overflow: hidden;
}

.row-actions {
  display: inline-flex;
  gap: 12px;
  white-space: nowrap;

  :deep(.el-button) {
    margin-left: 0;
  }
}

.username-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-tag__content) {
  min-width: 0;
}

:deep(.el-tag i) {
  margin-right: 4px;
}

.clickable-tag {
  max-width: 100%;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
</style>
