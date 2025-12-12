<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索团队名称/编码"
        clearable
        style="width: 200px"
        @input="handleSearch"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
      <el-button type="primary" @click="handleSearch">
        <i class="fa fa-search"></i> 搜索
      </el-button>
      <el-button @click="handleReset">
        <i class="fa fa-undo"></i> 重置
      </el-button>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <el-button type="primary" @click="handleCreateTeam">
        <i class="fa fa-plus"></i> 创建团队
      </el-button>
    </div>

    <!-- 团队列表表格 -->
    <div class="ops-table-wrapper" v-loading="loading">
      <el-table
        :data="filteredData"
        border
        stripe
        style="width: 100%"
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
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              @click="handleDelete(row)"
              :loading="deletingTeamId === row.id"
              :disabled="deletingTeamId === row.id"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as teamApi from '@/modules/settings/api/team'
import TeamEditDialog from './TeamEditDialog.vue'

const loading = ref(false)
const tableData = ref([])
const searchText = ref('')

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

// 过滤后的数据
const filteredData = computed(() => {
  let result = tableData.value

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    result = result.filter(item =>
      item.name?.toLowerCase().includes(keyword) ||
      item.code?.toLowerCase().includes(keyword)
    )
  }

  pagination.value.total = result.length

  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return result.slice(start, end)
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
  loading.value = true
  try {
    const response = await teamApi.getTeams()
    tableData.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load teams:', error)
    ElMessage.error('加载团队列表失败')
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.page = 1
}

function handleReset() {
  searchText.value = ''
  pagination.value.page = 1
}

function formatTime(time) {
  if (!time) return '-'
  const date = new Date(time)
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
    await ElMessageBox.confirm(
      `确定要删除团队 "${row.name}" 吗？`,
      '确认删除',
      { type: 'warning' }
    )

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
</script>

<style scoped lang="scss">
// 使用全局布局类，无需额外样式
</style>

