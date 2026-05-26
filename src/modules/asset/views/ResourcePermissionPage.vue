<template>
  <div class="ops-page-layout">
    <div class="content-view-area">
      <!-- 筛选区域 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="关键词">
            <el-input
              v-model="searchKeyword"
              placeholder="资源路径 / 资产类型..."
              clearable
              style="width: 240px"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item class="filter-actions">
            <el-button type="primary" @click="handleSearch">
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

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <div class="action-left">
          <el-tag :type="hasPendingChanges ? 'warning' : 'success'" size="small" class="sync-tag-indicator">
            <i class="fa" :class="hasPendingChanges ? 'fa-exclamation-circle' : 'fa-check-circle'"></i>
            <span style="margin-left: 4px">
              {{ hasPendingChanges ? `当前待保存 ${changedRowCount} 项变更` : '所有权限配置已同步' }}
            </span>
          </el-tag>
          <el-button
            type="primary"
            size="small"
            :disabled="!hasPendingChanges"
            :loading="saving"
            @click="handleSave"
          >
            <i class="fa fa-save" style="margin-right: 4px"></i>
            保存权限更改
          </el-button>
          <el-button size="small" :disabled="!hasPendingChanges || saving" @click="handleResetPending" plain>
            <i class="fa fa-undo" style="margin-right: 4px"></i>
            撤销修改
          </el-button>
        </div>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="handleRefresh"
          title="刷新"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper card-table">
        <el-table
          :data="paginatedData"
          v-loading="loading"
          height="100%"
          :row-class-name="getRowClassName"
        >
          <!-- 1. 资源信息 -->
          <el-table-column
            prop="groupInfo"
            label="资源信息与路径"
            min-width="260"
            show-overflow-tooltip
            sortable
          >
            <template #default="{ row }">
              <span class="resource-info-bold">
                <i class="fa fa-shield-alt path-decorator-icon"></i>
                {{ row.groupInfo }}
              </span>
            </template>
          </el-table-column>

          <!-- 2. 资产类型 -->
          <el-table-column
            prop="assets_type"
            label="适用资产类型"
            min-width="150"
            align="left"
            sortable
          >
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain" class="asset-type-badge">
                {{ row.assets_type || '所有类型' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 3. 动态团队权限列 -->
          <el-table-column
            v-for="teamName in teamNames"
            :key="teamName"
            :label="teamName"
            width="185"
            align="center"
          >
            <template #default="{ row }">
              <div class="permission-buttons-group">
                <el-button
                  v-for="perm in ['r', 'w', 'x']"
                  :key="perm"
                  :type="hasPermission(row, teamName, perm) ? 'primary' : 'default'"
                  size="small"
                  class="perm-toggle-btn"
                  :class="{ 'is-active': hasPermission(row, teamName, perm) }"
                  @click="togglePermission(row, teamName, perm)"
                >
                  {{ perm.toUpperCase() }}
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
          :page-sizes="[10, 25, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { permissionApi } from '../api'
import _ from 'lodash'

// 表格数据
const loading = ref(false)
const saving = ref(false)
const tableData = ref([])
const permissionData = ref([])
const originalPermissionData = ref([])
const searchKeyword = ref('')
const appliedSearch = ref('')
const teamNames = ref([])
const changedRowIds = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// 过滤后的数据
const filteredData = computed(() => {
  let data = tableData.value

  if (appliedSearch.value) {
    const keyword = appliedSearch.value.toLowerCase()
    data = data.filter(
      item =>
        item.groupInfo?.toLowerCase().includes(keyword) ||
        item.assets_type?.toLowerCase().includes(keyword)
    )
  }

  return data
})

const total = computed(() => filteredData.value.length)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const changedRowCount = computed(() => changedRowIds.value.length)

const hasPendingChanges = computed(() => changedRowIds.value.length > 0)

onMounted(() => {
  loadData()
})

function buildTableState(data) {
  const teams = new Set()
  const rows = data.map(item => {
    const row = {
      id: item.id,
      groupInfo: item.groupInfo,
      teamInfo: item.teamInfo || []
    }

    if (item.extra_param && Array.isArray(item.extra_param)) {
      item.extra_param.forEach(param => {
        row[param.name] = param.data
      })
    }

    if (item.teamInfo && Array.isArray(item.teamInfo)) {
      item.teamInfo.forEach(team => {
        teams.add(team.teamName)
        row[team.teamName] = team.permission || []
      })
    }

    return row
  })

  tableData.value = rows
  teamNames.value = Array.from(teams)

  const maxPage = Math.max(1, Math.ceil(filteredData.value.length / pageSize.value) || 1)
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
}

function getPermissionSignature(teamInfo = []) {
  return JSON.stringify(
    [...teamInfo]
      .map(team => ({
        teamName: team.teamName,
        permission: [...(team.permission || [])].sort()
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName))
  )
}

function updateRowDirtyState(rowId) {
  const currentRow = permissionData.value.find(item => item.id === rowId)
  const originalRow = originalPermissionData.value.find(item => item.id === rowId)
  const isDirty = getPermissionSignature(currentRow?.teamInfo) !== getPermissionSignature(originalRow?.teamInfo)
  const dirtySet = new Set(changedRowIds.value)

  if (isDirty) {
    dirtySet.add(rowId)
  } else {
    dirtySet.delete(rowId)
  }

  changedRowIds.value = Array.from(dirtySet)
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const response = await permissionApi.getTablePermission()
    const data = Array.isArray(response) ? response : response?.data || []
    originalPermissionData.value = _.cloneDeep(data)
    permissionData.value = _.cloneDeep(data)
    changedRowIds.value = []
    buildTableState(permissionData.value)
  } catch (error) {
    console.error('加载权限数据失败:', error)
    ElMessage.error('加载权限数据失败')
  } finally {
    loading.value = false
  }
}

// 检查是否有权限
function hasPermission(row, teamName, perm) {
  const teamPermissions = row[teamName]
  return Array.isArray(teamPermissions) && teamPermissions.includes(perm)
}

// 切换权限
function togglePermission(row, teamName, perm) {
  const rowData = permissionData.value.find(item => item.id === row.id)
  if (!rowData) return

  // 找到或创建团队权限
  let teamInfo = rowData.teamInfo.find(t => t.teamName === teamName)
  if (!teamInfo) {
    teamInfo = { teamName, permission: [] }
    rowData.teamInfo.push(teamInfo)
  }

  const currentlyHas = hasPermission(row, teamName, perm)

  if (currentlyHas) {
    // 取消权限
    if (perm === 'r') {
      // 取消 R 时，同时取消 W 和 X
      teamInfo.permission = teamInfo.permission.filter(p => !['r', 'w', 'x'].includes(p))
    } else if (perm === 'w') {
      teamInfo.permission = teamInfo.permission.filter(p => p !== 'w')
    } else {
      teamInfo.permission = teamInfo.permission.filter(p => p !== 'x')
    }
  } else {
    // 添加权限
    if (perm === 'r') {
      if (!teamInfo.permission.includes('r')) {
        teamInfo.permission.push('r')
      }
    } else if (perm === 'w') {
      // 添加 W 时，自动添加 R
      if (!teamInfo.permission.includes('r')) {
        teamInfo.permission.push('r')
      }
      if (!teamInfo.permission.includes('w')) {
        teamInfo.permission.push('w')
      }
    } else {
      // 添加 X 时，自动添加 R
      if (!teamInfo.permission.includes('r')) {
        teamInfo.permission.push('r')
      }
      if (!teamInfo.permission.includes('x')) {
        teamInfo.permission.push('x')
      }
    }
  }

  // 更新表格显示
  row[teamName] = [...teamInfo.permission]
  updateRowDirtyState(row.id)
}

async function handleSave() {
  if (!hasPendingChanges.value) return

  saving.value = true
  try {
    await permissionApi.saveTablePermission('ACM', permissionData.value)
    originalPermissionData.value = _.cloneDeep(permissionData.value)
    changedRowIds.value = []
    ElMessage.success('权限变更已保存')
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error('保存权限失败')
  } finally {
    saving.value = false
  }
}

function handleResetPending() {
  if (!hasPendingChanges.value) return

  permissionData.value = _.cloneDeep(originalPermissionData.value)
  changedRowIds.value = []
  buildTableState(permissionData.value)
}

async function handleRefresh() {
  if (!hasPendingChanges.value) {
    loadData()
    return
  }

  try {
    await ElMessageBox.confirm('当前有未保存的权限变更，刷新后将丢失这些修改。是否继续？', '确认刷新', {
      type: 'warning'
    })
    loadData()
  } catch {
    // ignore cancel
  }
}

// 搜索
const handleSearch = () => {
  appliedSearch.value = searchKeyword.value
  currentPage.value = 1
}

// 重置
const handleReset = () => {
  searchKeyword.value = ''
  appliedSearch.value = ''
  currentPage.value = 1
}

function getRowClassName({ row }) {
  let classes = 'modern-table-row'
  if (changedRowIds.value.includes(row.id)) {
    classes += ' is-dirty-row'
  }
  return classes
}

// 分页变化
function handlePageChange() {
  // 分页由 computed 处理
}

function handlePageSizeChange() {
  currentPage.value = 1
}
</script>

<style scoped lang="scss">


.action-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.sync-tag-indicator {
  padding: 4px 10px;
  height: 28px;
  line-height: 20px;
  border-radius: 6px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.resource-info-bold {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.path-decorator-icon {
  color: var(--el-color-primary);
  font-size: 12px;
}

.asset-type-badge {
  border-radius: 4px;
  font-weight: 500;
}

.permission-buttons-group {
  display: flex;
  gap: 6px;
  justify-content: center;

  .perm-toggle-btn {
    min-width: 32px;
    height: 28px;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    border-color: var(--el-border-color-light);
    background: var(--el-bg-color-page);
    color: var(--el-text-color-regular);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-7);
      color: var(--el-color-primary);
    }

    &.is-active {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(64, 158, 255, 0.25);
    }
  }
}

/* Dirty row high-end warning tone */
:deep(.el-table__row.is-dirty-row) {
  td.el-table__cell {
    background: var(--el-color-warning-light-9);
    border-bottom: 1px solid var(--el-color-warning-light-8);
  }
}
</style>
