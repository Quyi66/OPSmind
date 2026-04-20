<template>
  <div class="ops-page-layout win-patch-page">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="仓库管理" name="repos">
        <WinPatchYumRepoSourceTable
          :repos="repoList"
          :loading="loading"
          :selected-repo-id="selectedRepoId"
          @create="openCreateDialog"
          @edit="openEditDialog"
          @delete="handleDelete"
          @refresh="loadRepos()"
          @open-packages="openPackagesTab"
          @open-compare="openCompareTab"
          @update:selected-repo-id="selectedRepoId = $event"
        />
      </el-tab-pane>

      <el-tab-pane label="包采集与清单" name="packages" lazy>
        <WinPatchYumRepoPackagesPanel
          :active="activeTab === 'packages'"
          :repos="repoList"
          v-model:selected-repo-id="selectedRepoId"
        />
      </el-tab-pane>

      <el-tab-pane label="补丁比对" name="compare" lazy>
        <WinPatchYumRepoComparePanel
          :repos="repoList"
          v-model:selected-repo-id="selectedRepoId"
        />
      </el-tab-pane>
    </el-tabs>

    <WinPatchYumRepoFormDialog
      v-model="dialogVisible"
      :repo-data="editingRepo"
      @saved="handleRepoSaved"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WinPatchYumRepoComparePanel from '../components/yum-repo/WinPatchYumRepoComparePanel.vue'
import WinPatchYumRepoFormDialog from '../components/yum-repo/WinPatchYumRepoFormDialog.vue'
import WinPatchYumRepoPackagesPanel from '../components/yum-repo/WinPatchYumRepoPackagesPanel.vue'
import WinPatchYumRepoSourceTable from '../components/yum-repo/WinPatchYumRepoSourceTable.vue'
import { yumRepoApi } from '../yumRepoApi'
import { resolveYumRepoId, unwrapResponse } from '../yumRepoUtils'

const activeTab = ref('repos')
const loading = ref(false)
const dialogVisible = ref(false)
const editingRepo = ref(null)
const repoList = ref([])
const selectedRepoId = ref('')

async function loadRepos(preferredId = '') {
  loading.value = true
  try {
    const response = await yumRepoApi.getRepos()
    const data = unwrapResponse(response)
    repoList.value = Array.isArray(data) ? data : []

    const nextSelectedId = String(preferredId || selectedRepoId.value || '').trim()
    const hasCurrent = repoList.value.some(item => resolveYumRepoId(item) === nextSelectedId)
    selectedRepoId.value = hasCurrent ? nextSelectedId : resolveYumRepoId(repoList.value[0])
  } catch (error) {
    console.error('加载 Yum 仓库列表失败:', error)
    ElMessage.error('加载 Yum 仓库列表失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingRepo.value = null
  dialogVisible.value = true
}

function openEditDialog(repo) {
  editingRepo.value = repo
  dialogVisible.value = true
}

async function handleDelete(repo) {
  const repoId = resolveYumRepoId(repo)
  if (!repoId) return

  try {
    await ElMessageBox.confirm('确定删除该仓库吗？删除后会同时清理采集记录和包数据。', '删除确认', {
      type: 'warning'
    })
    await yumRepoApi.deleteRepo(repoId)
    ElMessage.success('仓库已删除')
    await loadRepos()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 Yum 仓库失败:', error)
      ElMessage.error('删除 Yum 仓库失败')
    }
  }
}

function openPackagesTab(repo) {
  selectedRepoId.value = resolveYumRepoId(repo)
  activeTab.value = 'packages'
}

function openCompareTab(repo) {
  selectedRepoId.value = resolveYumRepoId(repo)
  activeTab.value = 'compare'
}

async function handleRepoSaved(repo) {
  await loadRepos(resolveYumRepoId(repo))
}

onMounted(() => {
  loadRepos()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}
</style>
