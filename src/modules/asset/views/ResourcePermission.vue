<template>
  <div class="ops-page-layout">
    <!-- 筛选区域 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
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

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table
        :data="filteredData"
        v-loading="loading"
        style="width: 100%"
        max-height="calc(100vh - 230px)"
      >
        <el-table-column
          prop="groupInfo"
          label="资源信息"
          min-width="250"
          show-overflow-tooltip
          sortable
        />
        <el-table-column
          prop="assets_type"
          label="资产类型"
          min-width="150"
          align="left"
          sortable
        />

        <!-- 动态团队权限列 -->
        <el-table-column
          v-for="teamName in teamNames"
          :key="teamName"
          :label="teamName"
          width="180"
          align="center"
        >
          <template #default="{ row }">
            <div class="permission-buttons">
              <el-button
                v-for="perm in ['r', 'w', 'x']"
                :key="perm"
                :type="hasPermission(row, teamName, perm) ? 'primary' : 'default'"
                size="small"
                class="perm-btn"
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import _ from 'lodash'

// 表格数据
const loading = ref(false)
const tableData = ref([])
const permissionData = ref([]) // 用于保存的原始数据
const searchKeyword = ref('')
const appliedSearch = ref('')
const teamNames = ref([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 计算分页信息
const pageInfo = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total.value)
  return `${start} - ${end} / ${total.value}`
})

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

  // 更新总数
  total.value = data.length

  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return data.slice(start, start + pageSize.value)
})

onMounted(() => {
  loadData()
})

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const cacheBuster = Date.now()
    const response = await apiService.get(
      `/acm/api/acm/permission/team/table?cacheBuster=${cacheBuster}`
    )

    const data = Array.isArray(response) ? response : response?.data || []
    permissionData.value = _.cloneDeep(data)

    // 处理数据，提取 extra_param 和 teamInfo
    const teams = new Set()
    tableData.value = data.map(item => {
      const row = {
        id: item.id,
        groupInfo: item.groupInfo,
        teamInfo: item.teamInfo || []
      }

      // 提取 extra_param
      if (item.extra_param && Array.isArray(item.extra_param)) {
        item.extra_param.forEach(param => {
          row[param.name] = param.data
        })
      }

      // 提取团队名称
      if (item.teamInfo && Array.isArray(item.teamInfo)) {
        item.teamInfo.forEach(team => {
          teams.add(team.teamName)
          row[team.teamName] = team.permission || []
        })
      }

      return row
    })

    teamNames.value = Array.from(teams)
    total.value = tableData.value.length
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
      // 取消 W
      teamInfo.permission = teamInfo.permission.filter(p => p !== 'w')
    } else {
      // 取消 X
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

  // 防抖保存
  debouncedSave()
}

// 防抖保存
const debouncedSave = _.debounce(async () => {
  try {
    await apiService.post('/api/team/permission/table/permission/ACM', permissionData.value)
    // 静默保存，不显示成功消息
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error('保存权限失败')
  }
}, 2000)

// 搜索
function handleSearch() {
  appliedSearch.value = searchKeyword.value
  currentPage.value = 1
}

// 重置
function handleReset() {
  searchKeyword.value = ''
  appliedSearch.value = ''
  currentPage.value = 1
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
.permission-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;

  .perm-btn {
    min-width: 32px;
    padding: 4px 8px;

    &.el-button--default {
      background: var(--el-bg-color-page);
      border-color: var(--el-border-color);
      color: var(--el-text-color-regular);

      &:hover {
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary);
        color: var(--el-color-primary);
      }
    }

    &.el-button--primary {
      background: var(--el-color-primary);
      border-color: var(--el-color-primary);
      color: #fff;
    }
  }
}
</style>
