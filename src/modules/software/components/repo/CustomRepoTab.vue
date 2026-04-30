<template>
  <div class="custom-repo-tab">
    <!-- 操作按钮 -->
    <div class="ops-action-bar">
      <div class="action-left">
        <el-button type="primary" @click="handleAddRepo">
          <i class="fa fa-plus" />
          添加仓库
        </el-button>
        <el-button :disabled="selectedRows.length === 0" @click="handleConfigToHost">
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

    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        max-height="calc(100vh - 260px)"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="repo_name" label="仓库名" min-width="150" />
        <el-table-column prop="repo_file" label="仓库文件" min-width="150" />
        <el-table-column prop="repo_desc" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="repo_url" label="地址" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="ops-pagination-wrapper">
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

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRows = ref([])

// 弹窗相关
const importDialogVisible = ref(false)
const addDialogVisible = ref(false)
const editingRepo = ref(null)
const configDialogVisible = ref(false)

async function loadData() {
  loading.value = true
  try {
    const response = await repoApi.getCustomRepoList({
      page: currentPage.value,
      size: pageSize.value
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load custom repos:', error)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleDownloadTemplate() {
  // 下载模板文件（位于 public/templates/vap/ 目录）
  const link = document.createElement('a')
  link.href = '/templates/vap/vap_repo_template.xlsx'
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
  editingRepo.value = row
  addDialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确认删除选中镜像源？', '确认删除', {
      type: 'warning'
    })

    await repoApi.deleteCustomRepo(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete repo:', error)
      ElMessage.error('删除失败')
    }
  }
}

function handleConfigToHost() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要配置的仓库')
    return
  }
  configDialogVisible.value = true
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
.custom-repo-tab {
  height: 100%;
}

/* 使用全局的 ops-action-bar 和 ops-pagination-wrapper 样式 */
</style>
