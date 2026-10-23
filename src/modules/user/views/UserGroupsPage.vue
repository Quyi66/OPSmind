<template>
  <div class="ops-page-layout user-groups-page">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.hostname"
            placeholder="主机名/IP/用户组"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
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
      <el-button
        size="small"
        title="另选主机并输入组名，不使用列表行选择"
        @click="handleDeleteGroup"
      >
        <i class="fa fa-user-minus"></i>
        按主机批量删除
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

    <div v-if="readError" class="read-feedback" role="status">
      <el-alert :title="readError" type="warning" :closable="false" show-icon />
      <el-button v-if="!authError" size="small" :loading="loading" @click="loadData">
        重试读取
      </el-button>
    </div>
    <div v-else-if="!loading && !totalKnown" class="read-feedback" role="status">
      <el-alert title="未返回可确认的用户组总数，暂不可翻页。" type="info" :closable="false" />
    </div>
    <!-- 用户组列表表格 -->
    <div class="ops-table-wrapper">
      <el-table :data="tableData" v-loading="loading" height="100%" :empty-text="emptyText">
        <el-table-column prop="host_key" label="IP" min-width="140" show-overflow-tooltip />
        <el-table-column prop="hostname" label="主机名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="group_name" label="组名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="gid" label="GID" width="90" />
        <el-table-column prop="users" label="用户" min-width="200" show-overflow-tooltip />
        <el-table-column prop="created_at" label="创建时间" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="left" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="danger"
              size="small"
              :disabled="!canDeleteRow(row)"
              :title="
                !row.host_id || !row.group_name
                  ? '缺少主机标识或组名，无法删除'
                  : '核对主机和组名后删除'
              "
              @click="handleDeleteSingleGroup(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-if="totalKnown"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :disabled="loading || !!readError || !totalKnown"
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
import { ref, computed, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { Refresh, Search, RefreshRight, Plus } from '@element-plus/icons-vue'
import * as userApi from '@/modules/user/api'
import CreateGroupDialog from '@/modules/user/components/dialogs/CreateGroupDialog.vue'
import DeleteGroupDialog from '@/modules/user/components/dialogs/DeleteGroupDialog.vue'
const filters = ref({ hostname: '' })
const appliedKeyword = ref('')
const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalKnown = ref(false)
const readError = ref('')
const authError = ref(false)
const active = ref(true)
let requestVersion = 0
let successfulQuery = null
let totalKeyword = null
const showCreateGroupDialog = ref(false)
const showDeleteGroupDialog = ref(false)
const currentGroupData = ref(null)
const canUseRows = computed(() => active.value && !loading.value && !readError.value)
const emptyText = computed(() =>
  loading.value ? '正在读取…' : readError.value || '暂无符合条件的用户组'
)
function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
function loadData() {
  return readQuery({ keyword: appliedKeyword.value, page: currentPage.value, size: pageSize.value })
}
async function readQuery(snapshot, canCorrectPage = true) {
  if (!active.value) return
  const version = ++requestVersion
  const key = JSON.stringify(snapshot)
  if (key !== successfulQuery) {
    tableData.value = []
    successfulQuery = null
    readError.value = ''
    authError.value = false
  }
  if (snapshot.keyword !== totalKeyword) {
    total.value = 0
    totalKnown.value = false
  }
  loading.value = true
  const isCurrent = () => active.value && version === requestVersion
  try {
    const response = await userApi.getUserGroups({
      hostObject: '@@(linux)',
      page: snapshot.page,
      size: snapshot.size,
      filter: snapshot.keyword ? `hostname|host_key|group_name:*${snapshot.keyword}*` : ''
    })
    if (!isCurrent()) return
    const records = response?.records ?? response?.data?.records
    const count = response?.total ?? response?.data?.total
    if (!Array.isArray(records)) throw new Error('Invalid group records')
    const known = Number.isSafeInteger(count) && count >= 0
    if (known && snapshot.page > Math.max(1, Math.ceil(count / snapshot.size))) {
      if (!canCorrectPage) throw new Error('Group page changed again')
      const page = Math.max(1, Math.ceil(count / snapshot.size))
      total.value = count
      totalKnown.value = true
      totalKeyword = snapshot.keyword
      currentPage.value = page
      return await readQuery({ ...snapshot, page }, false)
    }
    if (known && count < (snapshot.page - 1) * snapshot.size + records.length)
      throw new Error('Inconsistent group total')
    tableData.value = records
    total.value = known ? count : 0
    totalKnown.value = known
    totalKeyword = snapshot.keyword
    successfulQuery = key
    readError.value = ''
    authError.value = false
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to load groups:', error)
    authError.value =
      [401, 403].includes(error?.response?.status) ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    if (authError.value) {
      tableData.value = []
      total.value = 0
      totalKnown.value = false
      totalKeyword = null
      successfulQuery = null
    }
    readError.value = authError.value
      ? '读取失败：登录已失效或无权访问，请重新登录或联系管理员。'
      : tableData.value.length
        ? '刷新失败，当前显示上次成功结果，可能已过期；请重试后再删除。'
        : totalKnown.value
          ? '用户组读取失败，分页总数沿上次同条件结果；请重试。'
          : '用户组读取失败，请重试。'
  } finally {
    if (isCurrent()) loading.value = false
  }
}
function handlePageSizeChange(size) {
  if (![10, 20, 50, 100].includes(size) || pageSize.value === size) return
  pageSize.value = size
  currentPage.value = 1
  loadData()
}
function handleCurrentPageChange(page) {
  if (
    !totalKnown.value ||
    readError.value ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page === currentPage.value
  )
    return
  currentPage.value = page
  loadData()
}
function handleSearch() {
  appliedKeyword.value = filters.value.hostname
  currentPage.value = 1
  loadData()
}
function handleReset() {
  filters.value = { hostname: '' }
  appliedKeyword.value = ''
  currentPage.value = 1
  pageSize.value = 10
  loadData()
}
function handleCreateGroup() {
  showCreateGroupDialog.value = true
}
function handleDeleteGroup() {
  currentGroupData.value = null
  showDeleteGroupDialog.value = true
}
function canDeleteRow(row) {
  return canUseRows.value && tableData.value.includes(row) && !!row.host_id && !!row.group_name
}
function handleDeleteSingleGroup(row) {
  if (!canDeleteRow(row)) return
  currentGroupData.value = {
    hostId: row.host_id,
    group_name: row.group_name,
    host_key: row.host_key,
    hostname: row.hostname
  }
  showDeleteGroupDialog.value = true
}
onMounted(loadData)
onActivated(() => {
  active.value = true
})
function invalidateRead() {
  active.value = false
  requestVersion += 1
  if (loading.value)
    readError.value = tableData.value.length
      ? '读取已中断，当前显示上次成功结果，可能已过期；请重试后再删除。'
      : '用户组读取已中断，请重试。'
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
.ops-table-wrapper {
  overflow: hidden;
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
</style>
