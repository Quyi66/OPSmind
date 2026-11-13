<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('automation.library.gitRepos')"
    width="900px"
    :close-on-click-modal="selectedRepos.length === 0"
    @closed="handleClosed"
    class="git-repo-dialog"
    :close-on-press-escape="selectedRepos.length === 0"
  >
    <div class="ops-page-layout dialog-layout">
      <!-- 筛选栏 -->
      <div class="ops-filter-bar">
        <el-input
          v-model="searchText"
          :placeholder="t('common.search')"
          clearable
          size="small"
          style="width: 240px"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button type="danger" size="small" @click="handleReset">
          <i class="fa fa-fw fa-undo" />
          {{ t('automation.library.initialize') }}
        </el-button>
        <el-button type="primary" size="small" @click="handleAddRepo">
          <i class="fa fa-cogs" />
          {{ t('automation.library.add') }}
        </el-button>
        <el-button size="small" :disabled="!selectedRepos.length" @click="handleBatchDelete">
          <i class="fa fa-trash" />
          {{ t('common.delete') }}
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <!-- 刷新按钮在表格右上角 -->
        <div class="table-toolbar-icons">
          <el-button
            class="toolbar-icon-btn"
            circle
            :loading="loading"
            @click="loadRepoList"
            :title="t('common.refresh')"
          >
            <i class="fa fa-sync-alt" />
          </el-button>
        </div>
        <el-table
          v-loading="loading"
          :data="paginatedRepoList"
          @selection-change="handleSelectionChange"
          max-height="400px"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column :label="t('automation.library.repoType')" prop="repoType" width="130">
            <template #default="{ row }">
              <span
                v-if="row.externalRepo"
                class="repo-type-badge external"
                @click="handleGoRepo(row.repoName)"
              >
                <i class="fab fa-gitlab" />
                {{ t('automation.library.externalRepo') }}
              </span>
              <span v-else class="repo-type-badge builtin" @click="handleGoRepo('')">
                <i class="fa fa-code-branch" />
                {{ t('automation.library.builtinRepo') }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.repoName')" prop="repoName" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="repo-name">{{ row.repoName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.repoAddress')" prop="repoUrl" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="repo-url">{{ row.repoUrl || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.list.updatedBy')" prop="updatedBy" width="100">
            <template #default="{ row }">
              {{ row.updatedBy || '-' }}
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.list.modifiedAt')" prop="updatedAt" width="120">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          <el-table-column :label="t('common.actions')" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.externalRepo"
                type="primary"
                text
                size="small"
                @click="handleEditRepo(row)"
              >
                {{ t('automation.workbench.edit') }}
              </el-button>
              <el-button
                v-if="row.externalRepo"
                type="danger"
                text
                size="small"
                @click="handleDeleteRepo(row)"
              >
                {{ t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页器 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredTotal"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
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
import { t } from '@/core/i18n'

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
watch(
  () => props.modelValue,
  val => {
    dialogVisible.value = val
    if (val) {
      loadRepoList()
    }
  }
)

watch(dialogVisible, val => {
  emit('update:modelValue', val)
})

// 过滤后的仓库列表
const filteredRepoList = computed(() => {
  let list = repoList.value
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    list = list.filter(
      r =>
        r.repoName?.toLowerCase().includes(search) ||
        r.repoUrl?.toLowerCase().includes(search) ||
        r.updatedBy?.toLowerCase().includes(search)
    )
  }
  return list
})

// 过滤后的总数
const filteredTotal = computed(() => filteredRepoList.value.length)

// 分页后的列表
const paginatedRepoList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRepoList.value.slice(start, start + pageSize.value)
})

// 加载仓库列表
async function loadRepoList() {
  loading.value = true
  try {
    const response = await gfsApi.loadCurrentRepo(props.repoType, props.repo)
    const data = response?.data || response || []
    repoList.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('获取Git库列表失败:', error)
    ElMessage.error(error?.message || t('automation.library.reposFailed'))
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
    await ElMessageBox.confirm(t('automation.library.deleteRepoConfirm', { name: row.repoName }), t('automation.library.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
    await gfsApi.delExternalRepo(props.repoType, props.repo, row.repoName)
    ElMessage.success(t('automation.workbench.deleted'))
    loadRepoList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.workbench.deleteFailed'))
    }
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedRepos.value.length) return
  try {
    await ElMessageBox.confirm(
      t('automation.library.deleteReposConfirm', { count: selectedRepos.value.length }),
      t('automation.library.batchDeleteTitle'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning'
      }
    )
    const repoIds = selectedRepos.value.map(r => r.id)
    await gfsApi.delBatchExternalRepo(props.repoType, props.repo, repoIds)
    ElMessage.success(t('automation.library.batchDeleted'))
    selectedRepos.value = []
    loadRepoList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.library.batchDeleteFailed'))
    }
  }
}

// 重置
async function handleReset() {
  try {
    await ElMessageBox.confirm(
      t('automation.library.builtinInitConfirm'),
      t('automation.library.initTitle'),
      { closeOnClickModal: false, closeOnPressEscape: false, type: 'warning' }
    )
    await gfsApi.initCurrentGitRepo(props.repo)
    ElMessage.success(t('automation.library.builtinInitialized'))
    loadRepoList()
    emit('success')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.library.builtinInitFailed'))
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
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 弹窗关闭
function handleClosed() {
  selectedRepos.value = []
  searchText.value = ''
  currentPage.value = 1
}
</script>

<style scoped lang="scss">
.git-repo-dialog {
  :deep(.el-dialog__body) {
    padding: 0 !important;
  }
}

.dialog-layout {
  padding: 16px 20px !important;
  gap: 12px !important;
}

// 表格区域需要相对定位，用于刷新按钮
.ops-table-wrapper {
  position: relative;
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
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.repo-type-badge.builtin {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
}

.repo-type-badge:hover {
  opacity: 0.8;
}

.repo-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.repo-url {
  color: var(--el-text-color-regular);
}
</style>
