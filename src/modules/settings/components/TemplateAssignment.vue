<template>
  <div class="template-assignment">
    <div class="page-header">
      <h3>巡检模版分配</h3>
    </div>

    <div class="template-content" v-loading="loading">
      <!-- 搜索栏 -->
      <div class="toolbar">
        <el-input
          v-model="searchText"
          placeholder="搜索模版"
          clearable
          style="width: 250px"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-button @click="loadData" :loading="loading">
          <i class="fas fa-sync"></i>
        </el-button>
      </div>

      <!-- 模版列表 -->
      <el-table :data="filteredTemplates" border style="width: 100%">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <div class="template-name">
              <i v-if="row.icon" :class="['fa', row.icon]" style="margin-right: 8px; color: #409eff;"></i>
              {{ row.templateName }}
            </div>
            <div class="sub-text">{{ row.description }}</div>
          </template>
        </el-table-column>
        <el-table-column label="关联团队" min-width="200">
          <template #default="{ row }">
            <el-select
              v-model="row.groupId"
              placeholder="选择团队"
              clearable
              style="width: 100%"
              @change="handleTeamChange(row)"
            >
              <el-option
                v-for="team in teams"
                :key="team.id"
                :label="team.name"
                :value="team.id"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="是否发送告警通知" width="150" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.sendAlert"
              @change="handleAlertChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt || row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <span class="pagination-info">{{ paginationInfo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const loading = ref(false)
const searchText = ref('')
const templates = ref([])
const teams = ref([])

const paginationInfo = computed(() => {
  const filtered = filteredTemplates.value
  return `${filtered.length} / ${templates.value.length}`
})

const filteredTemplates = computed(() => {
  if (!searchText.value) return templates.value
  const keyword = searchText.value.toLowerCase()
  return templates.value.filter(t =>
    t.templateName?.toLowerCase().includes(keyword) ||
    t.description?.toLowerCase().includes(keyword)
  )
})

onMounted(() => {
  loadData()
  loadTeams()
})

async function loadData() {
  loading.value = true
  try {
    const res = await apiService.get('/cac/api/cac/v2/templates', {
      params: { cacheBuster: Date.now() }
    })
    templates.value = (res?.data || res || []).map(item => ({
      ...item,
      sendAlert: item.sendAlert || false
    }))
  } catch (error) {
    console.error('Failed to load templates:', error)
    ElMessage.error('加载模版列表失败')
  } finally {
    loading.value = false
  }
}

async function loadTeams() {
  try {
    const res = await apiService.get('/api/team', {
      params: { cacheBuster: Date.now() }
    })
    teams.value = res?.data || res || []
  } catch (error) {
    console.error('Failed to load teams:', error)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateStr
  }
}

async function handleTeamChange(row) {
  // 找到选中的团队
  const team = teams.value.find(t => t.id === row.groupId)

  try {
    await apiService.post('/cac/api/cac/v2/save/teams-info', {
      templateId: row.id,
      teamId: row.groupId || null,
      teamName: team?.name || null
    }, {
      params: { cacheBuster: Date.now() }
    })
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('Failed to save:', error)
    ElMessage.error('保存失败')
  }
}

async function handleAlertChange(row) {
  try {
    await apiService.put(`/cac/api/cac/v2/templates/${row.id}/send-sms`, null, {
      params: { cacheBuster: Date.now(), sendSms: row.sendAlert }
    })
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('Failed to save:', error)
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped lang="scss">
.template-assignment {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
  }
}

.template-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.template-name {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.sub-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
  padding: 8px 0;
}

.pagination-info {
  font-size: 13px;
  color: #606266;
}
</style>
