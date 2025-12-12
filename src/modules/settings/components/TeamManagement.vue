<template>
  <div class="team-management">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleCreateTeam">
        <i class="fa fa-plus"></i> 创建团队
      </el-button>
    </div>

    <!-- 团队列表表格 -->
    <div class="table-container" v-loading="loading">
      <el-table
        :data="tableData"
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as teamApi from '@/modules/settings/api/team'
import TeamEditDialog from './TeamEditDialog.vue'

const loading = ref(false)
const tableData = ref([])

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
.team-management {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 16px 0;
  display: flex;
  gap: 12px;
}

.table-container {
  flex: 1;
  overflow: auto;
}
</style>
