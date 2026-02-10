<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键词">
          <el-input v-model="searchText" placeholder="模版名称/描述" clearable style="width: 200px" @input="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <!-- 功能按钮区 -->
    <div class="ops-action-bar">
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadData" title="刷新">
        <el-icon v-show="!loading">
          <Refresh />
        </el-icon>
      </el-button>
    </div>

    <!-- 模版列表 -->
    <div class="ops-table-wrapper">
      <el-table :data="paginatedTemplates" v-loading="loading"  style="width: 100%"
        max-height="calc(100vh - 280px)">
        <el-table-column prop="templateName" label="名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="关联团队" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row.groupId" placeholder="选择团队" clearable style="width: 100%"
              @change="handleTeamChange(row)" size="small">
              <el-option v-for="team in teams" :key="team.id" :label="team.name" :value="team.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="是否发送告警通知" width="150" align="left">
          <template #default="{ row }">
            <el-switch v-model="row.sendAlert" :disabled="!row.groupId" @change="handleAlertChange(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt || row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div class="ops-pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]" :total="filteredTemplates.length"
        layout="total, sizes, prev, pager, next, jumper" background />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'

const loading = ref(false)
const searchText = ref('')
const templates = ref([])
const teams = ref([])

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

// 已应用的筛选条件
const appliedSearchText = ref('')

const filteredTemplates = computed(() => {
  if (!appliedSearchText.value) return templates.value
  const keyword = appliedSearchText.value.toLowerCase()
  return templates.value.filter(t =>
    t.templateName?.toLowerCase().includes(keyword) ||
    t.description?.toLowerCase().includes(keyword)
  )
})

const paginatedTemplates = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredTemplates.value.slice(start, end)
})

onMounted(() => {
  loadData()
  loadTeams()
})

function handleSearch() {
  appliedSearchText.value = searchText.value
  pagination.value.page = 1
}

function handleReset() {
  searchText.value = ''
  appliedSearchText.value = ''
  pagination.value.page = 1
}

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
.text-muted {
  color: #909399;
}
</style>
