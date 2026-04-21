<template>
  <div class="ops-page-layout win-patch-page">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="仓库管理" name="repos">
        <WinPatchYumRepoSourceTable
          :configs="configList"
          :sources="sourceList"
          :loading="loadingConfigs || loadingSources"
          :selected-config-id="selectedConfigId"
          :collecting-config-id="collectingConfigId"
          @refresh="handleRefresh"
          @collect="handleCollect"
          @delete-source="handleDeleteSource"
          @open-packages="openPackagesTab"
          @open-compare="openCompareTab"
          @update:selected-config-id="selectedConfigId = $event"
        />
      </el-tab-pane>

      <el-tab-pane label="采集与清单" name="packages" lazy>
        <WinPatchYumRepoPackagesPanel
          :active="activeTab === 'packages'"
          :repos="sourceList"
          v-model:selected-repo-id="selectedRepoId"
        />
      </el-tab-pane>

      <el-tab-pane label="补丁比对" name="compare" lazy>
        <WinPatchYumRepoComparePanel
          :repos="sourceList"
          v-model:selected-repo-id="selectedRepoId"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WinPatchYumRepoComparePanel from '../components/yum-repo/WinPatchYumRepoComparePanel.vue'
import WinPatchYumRepoPackagesPanel from '../components/yum-repo/WinPatchYumRepoPackagesPanel.vue'
import WinPatchYumRepoSourceTable from '../components/yum-repo/WinPatchYumRepoSourceTable.vue'
import { yumRepoApi } from '../yumRepoApi'
import {
  buildYumRepoSourceFromConfig,
  findYumRepoSourceByConfig,
  getYumConfigLabel,
  normalizeYumConfigRecord,
  resolveYumConfigId,
  resolveYumRepoId,
  unwrapResponse
} from '../yumRepoUtils'

const activeTab = ref('repos')
const loadingConfigs = ref(false)
const loadingSources = ref(false)
const collectingConfigId = ref('')
const configList = ref([])
const sourceList = ref([])
const selectedConfigId = ref('')
const selectedRepoId = ref('')

function syncSelectedConfigId(preferredId = '') {
  const nextSelectedId = String(preferredId || selectedConfigId.value || '').trim()
  const hasCurrent = configList.value.some(item => resolveYumConfigId(item) === nextSelectedId)
  selectedConfigId.value = hasCurrent ? nextSelectedId : resolveYumConfigId(configList.value[0])
}

function syncSelectedRepoId(preferredId = '') {
  const nextSelectedId = String(preferredId || selectedRepoId.value || '').trim()
  const hasCurrent = sourceList.value.some(item => resolveYumRepoId(item) === nextSelectedId)

  if (hasCurrent) {
    selectedRepoId.value = nextSelectedId
    return
  }

  const currentConfig = configList.value.find(item => resolveYumConfigId(item) === selectedConfigId.value)
  const matchedSource = findYumRepoSourceByConfig(currentConfig, sourceList.value)
  selectedRepoId.value = resolveYumRepoId(matchedSource || sourceList.value[0])
}

function upsertSource(source) {
  const sourceId = resolveYumRepoId(source)
  if (!sourceId) return

  const currentIndex = sourceList.value.findIndex(item => resolveYumRepoId(item) === sourceId)
  if (currentIndex === -1) {
    sourceList.value = [source, ...sourceList.value]
    return
  }

  sourceList.value = sourceList.value.map((item, index) =>
    index === currentIndex ? { ...item, ...source } : item
  )
}

async function loadConfigs(preferredId = '') {
  loadingConfigs.value = true
  try {
    const response = await yumRepoApi.getConfigList()
    const data = unwrapResponse(response)
    configList.value = (Array.isArray(data) ? data : []).map(item => normalizeYumConfigRecord(item))
    syncSelectedConfigId(preferredId)
  } catch (error) {
    console.error('加载 Yum 源配置失败:', error)
    ElMessage.error('加载 Yum 源配置失败')
  } finally {
    loadingConfigs.value = false
  }
}

async function loadSources(preferredId = '') {
  loadingSources.value = true
  try {
    const response = await yumRepoApi.getRepos()
    const data = unwrapResponse(response)
    sourceList.value = Array.isArray(data) ? data : []
    syncSelectedRepoId(preferredId)
  } catch (error) {
    console.error('加载已采集 Yum 仓库失败:', error)
    ElMessage.error('加载已采集 Yum 仓库失败')
  } finally {
    loadingSources.value = false
  }
}

async function handleRefresh() {
  await loadConfigs(selectedConfigId.value)
  await loadSources(selectedRepoId.value)
}

async function handleCollect(config) {
  const configId = resolveYumConfigId(config)
  if (!configId) return

  collectingConfigId.value = configId
  selectedConfigId.value = configId

  try {
    const response = await yumRepoApi.collectPackages({ dcDataId: configId })
    const data = unwrapResponse(response)
    const sourceId = String(data?.sourceId || '').trim()

    await loadSources(sourceId)

    if (sourceId && !sourceList.value.some(item => resolveYumRepoId(item) === sourceId)) {
      upsertSource(buildYumRepoSourceFromConfig(config, sourceId))
      selectedRepoId.value = sourceId
    }

    ElMessage.success(data?.message || '采集任务已提交')

    if (sourceId) {
      activeTab.value = 'packages'
    }
  } catch (error) {
    console.error('触发 Yum 仓库采集失败:', error)
    ElMessage.error('触发 Yum 仓库采集失败')
  } finally {
    collectingConfigId.value = ''
  }
}

async function handleDeleteSource(config) {
  const source = findYumRepoSourceByConfig(config, sourceList.value)
  const sourceId = resolveYumRepoId(source)
  if (!sourceId) {
    ElMessage.warning('当前配置暂无已采集仓库可删除')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定删除配置“${getYumConfigLabel(config)}”对应的采集仓库吗？删除后会同时清理快照和包数据。`,
      '删除确认',
      { type: 'warning' }
    )
    await yumRepoApi.deleteRepo(sourceId)
    ElMessage.success('采集仓库已删除')
    await loadSources()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 Yum 采集仓库失败:', error)
      ElMessage.error('删除 Yum 采集仓库失败')
    }
  }
}

function openPackagesTab(config) {
  selectedConfigId.value = resolveYumConfigId(config)
  const source = findYumRepoSourceByConfig(config, sourceList.value)
  const sourceId = resolveYumRepoId(source)

  if (!sourceId) {
    ElMessage.warning('该配置尚未触发采集，请先执行采集')
    return
  }

  selectedRepoId.value = sourceId
  activeTab.value = 'packages'
}

function openCompareTab(config) {
  selectedConfigId.value = resolveYumConfigId(config)
  const source = findYumRepoSourceByConfig(config, sourceList.value)
  const sourceId = resolveYumRepoId(source)

  if (!sourceId) {
    ElMessage.warning('该配置尚未生成可比对仓库，请先执行采集')
    return
  }

  selectedRepoId.value = sourceId
  activeTab.value = 'compare'
}

onMounted(async () => {
  await loadConfigs()
  await loadSources()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}
</style>
