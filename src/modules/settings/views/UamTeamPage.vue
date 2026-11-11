<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :model="filters" inline size="small" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索团队名称/编码"
            clearable
            style="width: 200px"
            @input="handleSearch"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item> -->
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreateTeam">
        <i class="fa fa-plus"></i>
        创建团队
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

    <!-- 团队列表表格 -->
    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" :loading="loading" @click="loadData">重试</el-button>
    </el-alert>
    <div class="ops-table-wrapper" v-loading="loading">
      <el-table
        :data="loading || loadError ? [] : filteredData"
        style="width: 100%"
        max-height="calc(100vh - 314px)"
      >
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="code" label="编码" min-width="120">
          <template #default="{ row }">
            {{ row.code || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="tenantName" label="租户" min-width="120">
          <template #default="{ row }">
            {{ row.tenantName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="left">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button
              size="small"
              text
              type="danger"
              @click="handleDelete(row)"
              :loading="deletingTeamId === row.id"
              :disabled="deletingTeamId === row.id"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <span v-if="loading">正在读取团队列表…</span>
          <span v-else-if="loadError">读取失败，请重试</span>
          <span v-else>{{ appliedFilters.keyword ? '没有匹配的团队' : '暂无团队' }}</span>
        </template>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div v-if="!loadError" class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        :disabled="loading || Boolean(loadError)"
        @size-change="pagination.page = 1"
      />
    </div>

    <!-- 团队编辑对话框 -->
    <TeamEditDialog
      v-model="dialogVisible"
      :team="selectedTeam"
      :mode="dialogMode"
      @saved="loadData"
    />
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated
} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as teamApi from '@/modules/settings/api/team'
import TeamEditDialog from '../components/team/TeamEditDialog.vue'

const loading = ref(false)
const loadError = ref('')
let active = true
let readRequestId = 0
const tableData = ref([])
const filters = reactive({
  keyword: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

// 已应用的筛选条件（输入、回车或清除时更新）
const appliedFilters = reactive({
  keyword: ''
})

// 过滤后的数据（使用已应用的筛选条件）
const filteredRows = computed(() => {
  let result = tableData.value

  if (appliedFilters.keyword) {
    const keyword = appliedFilters.keyword.toLowerCase()
    result = result.filter(
      item =>
        String(item.name ?? '')
          .toLowerCase()
          .includes(keyword) ||
        String(item.code ?? '')
          .toLowerCase()
          .includes(keyword)
    )
  }

  return result
})
watch(
  () => filteredRows.value.length,
  total => {
    pagination.value.total = total
    pagination.value.page = Math.min(
      pagination.value.page,
      Math.max(1, Math.ceil(total / pagination.value.pageSize))
    )
  },
  { immediate: true }
)
const filteredData = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredRows.value.slice(start, end)
})

// 对话框相关
const dialogVisible = ref(false)
const selectedTeam = ref(null)
const dialogMode = ref('edit') // 'edit' | 'create'

// 删除中状态
const deletingTeamId = ref(null)

onMounted(() => {
  loadData()
})

async function loadData() {
  if (!active) return
  const request = ++readRequestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await teamApi.getTeams()
    if (!active || request !== readRequestId) return
    tableData.value = response?.data || response || []
  } catch (error) {
    if (!active || request !== readRequestId) return
    console.error('Failed to load teams:', error)
    loadError.value = '加载团队列表失败，请重试'
    ElMessage.error('加载团队列表失败')
  } finally {
    if (active && request === readRequestId) loading.value = false
  }
}

// 搜索 - 将筛选条件应用到 appliedFilters
function handleSearch() {
  appliedFilters.keyword = String(filters.keyword || '').trim()
  pagination.value.page = 1
}

function handleReset() {
  filters.keyword = ''
  appliedFilters.keyword = ''
  pagination.value.page = 1
  pagination.value.pageSize = 20
}

function formatTime(time) {
  if (time == null || time === '') return '-'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleCreateTeam() {
  selectedTeam.value = null
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function handleEdit(row) {
  selectedTeam.value = row
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function handleDelete(row) {
  if (deletingTeamId.value) return

  try {
    await ElMessageBox.confirm(`确定要删除团队 "${row.name}" 吗？`, '确认删除', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    deletingTeamId.value = row.id
    await teamApi.deleteTeam(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete team:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deletingTeamId.value = null
  }
}

function pauseReading() {
  active = false
  readRequestId += 1
  if (loading.value) loadError.value = '团队列表读取已中断，请刷新重试'
  loading.value = false
}
onDeactivated(pauseReading)
onBeforeUnmount(pauseReading)
onActivated(() => {
  if (active) return
  active = true
  loadData()
})
</script>

<style scoped lang="scss">
// 使用全局布局类，无需额外样式
</style>
