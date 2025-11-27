<template>
  <el-dialog
    v-model="dialogVisible"
    title="Git库"
    width="900px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <!-- 顶部操作栏 -->
    <div class="repo-list-header">
      <div class="header-actions">
        <el-button type="danger" text @click="handleReset">
          <i class="fa fa-fw fa-undo" /> 初始化
        </el-button>
        <el-button type="primary" text @click="handleAddRepo">
          <i class="fa fa-cogs" /> 新增
        </el-button>
        <el-button :disabled="!selectedRepos.length" text @click="handleBatchDelete">
          <i class="fa fa-trash" /> 删除
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索"
        clearable
        style="width: 300px"
      >
        <template #prefix>
          <i class="fa fa-search" />
        </template>
      </el-input>
      <el-button @click="loadRepoList">
        <i class="fa fa-sync-alt" />
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredRepoList"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column label="仓库类型" prop="repoType" width="120" sortable>
        <template #default="{ row }">
          <span
            v-if="row.externalRepo"
            class="repo-type-badge external"
            @click="handleGoRepo(row.repoName)"
          >
            <i class="fab fa-gitlab" /> 外部Git库
          </span>
          <span
            v-else
            class="repo-type-badge builtin"
            @click="handleGoRepo('')"
          >
            <i class="fa fa-code-branch" /> 内置Git库
          </span>
        </template>
      </el-table-column>
      <el-table-column label="仓库名" prop="repoName" min-width="100" sortable>
        <template #default="{ row }">
          <span class="repo-name">{{ row.repoName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="仓库地址" prop="repoUrl" min-width="300">
        <template #default="{ row }">
          <span class="repo-url" :title="row.repoUrl">{{ row.repoUrl || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="修改人" prop="updatedBy" width="100" sortable>
        <template #default="{ row }">
          {{ row.updatedBy || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="修改时间" prop="updatedAt" width="160" sortable>
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.externalRepo"
            type="primary"
            text
            size="small"
            @click="handleEditRepo(row)"
          >
            <i class="fa fa-pencil" />
          </el-button>
          <el-button
            v-if="row.externalRepo"
            type="danger"
            text
            size="small"
            @click="handleDeleteRepo(row)"
          >
            <i class="fa fa-trash-alt" />
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="repoList.length"
        layout="sizes, slot, prev, pager, next"
        small
      >
        <span class="pagination-info">{{ paginationInfo }}</span>
      </el-pagination>
    </div>

    <!-- 仓库设置弹窗 -->
    <GitRepoSettingsDialog
      v-model="settingsDialogVisible"
      :repo-type="repoType"
      :repo="repo"
      :edit-data="editRepoData"
      @success="handleRepoSaved"
      @closed="editRepoData = null"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'
import GitRepoSettingsDialog from './GitRepoSettingsDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = ref(false)
const loading = ref(false)
const repoList = ref([])
const selectedRepos = ref([])
const settingsDialogVisible = ref(false)
const editRepoData = ref(null)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 同步 v-model
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    loadRepoList()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 过滤后的仓库列表
const filteredRepoList = computed(() => {
  let list = repoList.value
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    list = list.filter(r =>
      r.repoName?.toLowerCase().includes(search) ||
      r.repoUrl?.toLowerCase().includes(search) ||
      r.updatedBy?.toLowerCase().includes(search)
    )
  }
  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

// 分页信息
const paginationInfo = computed(() => {
  const total = repoList.value.length
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, total)
  return `${start} - ${end} / ${total}`
})

// 加载仓库列表
async function loadRepoList() {
  loading.value = true
  try {
    const response = await gfsApi.loadCurrentRepo(props.repoType, props.repo)
    // API 返回的是 axios response，需要从 data 中获取实际数据
    const data = response?.data || response || []
    repoList.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取Git库列表失败:', error)
    ElMessage.error(error?.message || '获取Git库列表失败')
    repoList.value = []
  } finally {
    loading.value = false
  }
}

// 选择变化
function handleSelectionChange(selection) {
  selectedRepos.value = selection
}

// 添加仓库
function handleAddRepo() {
  editRepoData.value = null
  settingsDialogVisible.value = true
}

// 编辑仓库
function handleEditRepo(row) {
  editRepoData.value = { ...row, canEdit: false }
  settingsDialogVisible.value = true
}

// 删除单个仓库
async function handleDeleteRepo(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除仓库 "${row.repoName}" 吗？`,
      '删除确认',
      { type: 'warning' }
    )
    await gfsApi.delExternalRepo(props.repoType, props.repo, row.repoName)
    ElMessage.success('删除成功')
    loadRepoList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedRepos.value.length) return
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRepos.value.length} 个仓库吗？`,
      '批量删除确认',
      { type: 'warning' }
    )
    const repoIds = selectedRepos.value.map(r => r.id)
    await gfsApi.delBatchExternalRepo(props.repoType, props.repo, repoIds)
    ElMessage.success('批量删除成功')
    selectedRepos.value = []
    loadRepoList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '批量删除失败')
    }
  }
}

// 重置
async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '确认重置当前脚本库为Oplus内置脚本库？该操作会清空当前脚本库中所有内容！',
      '重置Git库确认',
      { type: 'warning' }
    )
    await gfsApi.resetGitRepo(props.repo)
    ElMessage.success('重置Oplus内置脚本库成功')
    loadRepoList()
    emit('success')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '重置Oplus内置脚本库失败')
    }
  }
}

// 仓库保存成功
function handleRepoSaved() {
  loadRepoList()
  emit('success')
}

// 跳转到仓库目录
function handleGoRepo(dir) {
  dialogVisible.value = false
  emit('success', { action: 'goRepo', dir })
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const pad = (n) => n < 10 ? `0${n}` : String(n)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 弹窗关闭
function handleClosed() {
  selectedRepos.value = []
  searchText.value = ''
}
</script>

<style scoped>
.repo-list-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.header-actions :deep(.el-button) {
  font-size: 14px;
}

.header-actions :deep(.el-button.is-text) {
  color: #606266;
}

.header-actions :deep(.el-button--danger.is-text) {
  color: #f56c6c;
}

.header-actions :deep(.el-button--primary.is-text) {
  color: #409eff;
}

.search-bar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.repo-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
}

.repo-type-badge.external {
  background: #e6f7ff;
  color: #1890ff;
}

.repo-type-badge.builtin {
  background: #f5f5f5;
  color: #666;
}

.repo-type-badge:hover {
  opacity: 0.8;
}

.repo-name {
  font-weight: 500;
  color: #1e293b;
}

.repo-url {
  color: #64748b;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.pagination-info {
  color: #606266;
  font-size: 13px;
  margin: 0 12px;
}
</style>
