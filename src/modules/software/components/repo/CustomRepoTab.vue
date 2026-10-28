<template>
  <div class="custom-repo-tab">
    <!-- 操作按钮 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <el-button type="primary" @click="handleAddRepo">
          <i class="fa fa-plus" />
          添加仓库
        </el-button>
        <el-button :disabled="selectedRows.length === 0 || !canUseRows" @click="handleConfigToHost">
          <i class="fa fa-angle-right" />
          配置到主机
        </el-button>
        <el-button @click="handleDownloadTemplate">
          <i class="fa fa-arrow-down" />
          模板下载
        </el-button>
        <el-button @click="handleImportRepo">
          <i class="fa fa-file-import" />
          仓库导入
        </el-button>
      </div>
    </div>

    <el-alert v-if="readError" type="warning" :closable="false" show-icon style="flex-shrink: 0">
      <template #title>
        {{ readErrorMessage }}
        <span v-if="hasResult">刷新成功前，旧仓库数据仅供查看，暂不可配置、编辑或删除。</span>
        <el-button v-if="canRetry" link type="primary" :loading="loading" @click="retry">
          重试读取
        </el-button>
      </template>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        :empty-text="emptyText"
        height="100%"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" :selectable="() => canUseRows" />
        <el-table-column prop="repo_name" label="仓库名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="repo_file" label="仓库文件" min-width="150" show-overflow-tooltip />
        <el-table-column prop="repo_desc" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="repo_url" label="地址" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作" width="128" fixed="right">
          <template #default="{ row }">
            <div class="software-row-actions">
              <el-button
                text
                type="primary"
                size="small"
                :disabled="!canUseRows"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                text
                type="danger"
                size="small"
                :disabled="!canUseRows"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="hasResult" class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 仓库导入弹窗 -->
    <RepoImportDialog v-model="importDialogVisible" @success="loadData" />

    <!-- 添加/编辑仓库弹窗 -->
    <RepoAddDialog v-model="addDialogVisible" :repo-data="editingRepo" @success="loadData" />

    <!-- 配置到主机弹窗 -->
    <ConfigRepoToHostDialog
      v-model="configDialogVisible"
      :selected-repos="selectedRows"
      @success="handleConfigSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../../api'
import RepoImportDialog from './RepoImportDialog.vue'
import RepoAddDialog from './RepoAddDialog.vue'
import ConfigRepoToHostDialog from './ConfigRepoToHostDialog.vue'
import { useSoftwareListRead } from '../../composables/useSoftwareListRead'

const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])
const {
  rows: tableData,
  total,
  loading,
  hasResult,
  error: readError,
  errorMessage: readErrorMessage,
  emptyText,
  canUseRows,
  canRetry,
  load,
  retry,
  captureReady
} = useSoftwareListRead(params => repoApi.getCustomRepoList(params), {
  onDiscard: () => {
    selectedRows.value = []
  }
})

// 弹窗相关
const importDialogVisible = ref(false)
const addDialogVisible = ref(false)
const editingRepo = ref(null)
const configDialogVisible = ref(false)

function loadData() {
  return load({ page: currentPage.value, size: pageSize.value })
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleDownloadTemplate() {
  // 下载模板文件（位于 public/templates/vap/ 目录）
  const link = document.createElement('a')
  link.href = `${import.meta.env.BASE_URL}templates/vap/vap_repo_template.xlsx`
  link.download = 'vap_repo_template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleImportRepo() {
  importDialogVisible.value = true
}

function handleAddRepo() {
  editingRepo.value = null
  addDialogVisible.value = true
}

function handleEdit(row) {
  if (!requireCurrentRows()) return
  editingRepo.value = row
  addDialogVisible.value = true
}

async function handleDelete(row) {
  if (!requireCurrentRows()) return
  const isCurrent = captureReady()
  const id = row.id
  try {
    await ElMessageBox.confirm('确认删除选中镜像源？', '确认删除', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })

    if (!isCurrent()) return
    await repoApi.deleteCustomRepo(id)
    if (!isCurrent()) return
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (!isCurrent()) return
    if (error !== 'cancel') {
      console.error('Failed to delete repo:', error)
      ElMessage.error('删除失败')
    }
  }
}

function handleConfigToHost() {
  if (!requireCurrentRows()) return
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要配置的仓库')
    return
  }
  configDialogVisible.value = true
}

function requireCurrentRows() {
  if (canUseRows.value) return true
  ElMessage.warning('请先成功刷新仓库列表，再配置、编辑或删除')
  return false
}

function handleConfigSuccess() {
  // 配置成功后刷新列表
  loadData()
  // 清空选择
  selectedRows.value = []
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.custom-repo-tab {
  @include software-layout.table-tab;
}
</style>
