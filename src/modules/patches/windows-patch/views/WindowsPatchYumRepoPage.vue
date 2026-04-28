<template>
  <div class="ops-page-layout win-patch-page">
    <WinPatchYumRepoOverviewSection
      :overview-data="overviewData"
      :loading="overviewLoading"
      v-model:selected-repo-id="selectedRepoId"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="仓库管理" name="repos">
        <WinPatchYumRepoSourceTable
          :configs="configList"
          :sources="sourceList"
          :loading="loadingConfigs || batchCollecting"
          :collecting-config-id="collectingConfigId"
          :batch-collecting="batchCollecting"
          @refresh="handleRefresh"
          @collect="handleCollect"
          @collect-all="handleCollectAll"
          @open-packages="openPackagesTab"
          @open-compare="openCompareTab"
          @created="handleConfigCreated"
          @updated="handleConfigUpdated"
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
          :active="activeTab === 'compare'"
          :repos="sourceList"
          :overview-data="overviewData"
          v-model:selected-repo-id="selectedRepoId"
          @refresh-overview="handleOverviewRefresh"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import WinPatchYumRepoComparePanel from '../components/yum-repo/WinPatchYumRepoComparePanel.vue'
import WinPatchYumRepoOverviewSection from '../components/yum-repo/WinPatchYumRepoOverviewSection.vue'
import WinPatchYumRepoPackagesPanel from '../components/yum-repo/WinPatchYumRepoPackagesPanel.vue'
import WinPatchYumRepoSourceTable from '../components/yum-repo/WinPatchYumRepoSourceTable.vue'
import { yumRepoApi } from '../yumRepoApi'
import {
  buildCollectedYumRepoSources,
  buildYumRepoSourceFromConfig,
  findYumRepoSourceByConfig,
  normalizeYumConfigRecord,
  resolveYumConfigId,
  resolveYumRepoId,
  unwrapResponse
} from '../yumRepoUtils'

const activeTab = ref('repos')
const loadingConfigs = ref(false)
const collectingConfigId = ref('')
const batchCollecting = ref(false)
const configList = ref([])
const sourceList = ref([])
const overviewLoading = ref(false)
const overviewData = ref(null)
const selectedConfigId = ref('')
const selectedRepoId = ref('')

async function loadOverview(options = {}) {
  overviewLoading.value = !options.silent
  try {
    const response = await yumRepoApi.getCompareOverview()
    overviewData.value = unwrapResponse(response)
  } catch (error) {
    if (!options.silent) {
      console.error('加载 Yum 仓库补丁比对总览失败:', error)
      ElMessage.error('加载 Yum 仓库补丁比对总览失败')
    }
  } finally {
    overviewLoading.value = false
  }
}

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

function syncSourceList(preferredId = '') {
  sourceList.value = buildCollectedYumRepoSources(configList.value)
  syncSelectedRepoId(preferredId)
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

async function loadConfigs(preferredConfigId = '', preferredRepoId = '') {
  loadingConfigs.value = true
  try {
    const response = await yumRepoApi.getConfigList()
    const data = unwrapResponse(response)
    configList.value = (Array.isArray(data) ? data : []).map(item => normalizeYumConfigRecord(item))
    syncSelectedConfigId(preferredConfigId)
    syncSourceList(preferredRepoId)
    await loadOverview({ silent: true })
  } catch (error) {
    console.error('加载 Yum 源配置失败:', error)
    ElMessage.error('加载 Yum 源配置失败')
    sourceList.value = []
  } finally {
    loadingConfigs.value = false
  }
}

async function handleRefresh() {
  await loadConfigs(selectedConfigId.value, selectedRepoId.value)
}

async function handleConfigCreated(newConfig) {
  await loadConfigs()
  await handleCollect(newConfig)
}

async function handleConfigUpdated(payload) {
  const nextConfig = payload?.config || null
  const configId = resolveYumConfigId(nextConfig)

  if (!payload?.baseurlChanged) {
    await loadConfigs(configId || selectedConfigId.value, selectedRepoId.value)
    return
  }

  await loadConfigs(configId)
  await handleCollect(nextConfig)
}

async function handleOverviewRefresh() {
  await loadOverview({ silent: true })
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

    if (sourceId && !sourceList.value.some(item => resolveYumRepoId(item) === sourceId)) {
      upsertSource(buildYumRepoSourceFromConfig(config, sourceId))
      selectedRepoId.value = sourceId
    }

    ElMessage.info(data?.message || '采集任务已提交，正在等待采集完成…')

    if (!sourceId) {
      await loadConfigs(configId)
      return
    }

    await pollCollectThenCompare(sourceId, configId)
  } catch (error) {
    console.error('触发 Yum 仓库采集失败:', error)
    ElMessage.error('触发 Yum 仓库采集失败')
    await loadConfigs(configId, selectedRepoId.value)
  } finally {
    collectingConfigId.value = ''
  }
}

async function pollCollectThenCompare(sourceId, configId) {
  const MAX_ATTEMPTS = 120
  const INTERVAL = 2500

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL))

    let statusData
    try {
      const resp = await yumRepoApi.getCollectStatus(sourceId)
      statusData = unwrapResponse(resp)
    } catch {
      continue
    }

    // Situation A: has message but no collectStatus → still running
    if (statusData?.message && !statusData?.collectStatus) continue

    const cs = String(statusData?.collectStatus || '').trim()
    if (!cs || cs === 'RUNNING' || cs === 'PENDING') continue

    if (cs === 'SUCCESS') {
      try {
        await yumRepoApi.compareScannedPatches({ sourceId })
      } catch (err) {
        console.error('触发补丁比对失败:', err)
        ElMessage.warning('采集成功，但补丁比对触发失败，请手动执行比对')
        await loadConfigs(configId, sourceId)
        return
      }
      await loadConfigs(configId, sourceId)
      ElMessage.success('采集完成，已自动继续比对并刷新列表')
      return
    }

    if (cs === 'FAILED') {
      const errMsg = String(statusData?.errorMessage || '').trim()
      ElMessage.error(`采集失败${errMsg ? '：' + errMsg : '，请检查仓库地址是否可访问'}`)
      await loadConfigs(configId, sourceId)
      return
    }
  }

  ElMessage.warning('采集等待超时，请稍后手动刷新')
  await loadConfigs(configId, selectedRepoId.value)
}

async function handleCollectAll() {
  const dcDataIds = configList.value.map(item => resolveYumConfigId(item)).filter(Boolean)
  if (dcDataIds.length === 0) {
    ElMessage.warning('当前没有可采集的 YUM 源配置')
    return
  }

  const configMap = new Map(configList.value.map(item => [resolveYumConfigId(item), item]))
  batchCollecting.value = true

  try {
    const response = await yumRepoApi.collectPackagesBatch({ dcDataIds })
    const data = unwrapResponse(response) || {}
    const results = Array.isArray(data.results) ? data.results : []
    const successResults = results.filter(item => String(item?.sourceId || '').trim())
    const preferredRepoId = String(successResults[0]?.sourceId || selectedRepoId.value || '').trim()

    await loadConfigs(selectedConfigId.value, preferredRepoId)

    successResults.forEach(result => {
      const config = configMap.get(String(result.dcDataId || '').trim())
      const sourceId = String(result.sourceId || '').trim()

      if (config && sourceId && !sourceList.value.some(item => resolveYumRepoId(item) === sourceId)) {
        upsertSource(buildYumRepoSourceFromConfig(config, sourceId))
      }
    })

    const successCount = Number(data.successCount || 0)
    const failCount = Number(data.failCount || 0)

    if (successCount > 0) {
      ElMessage.success(
        failCount > 0
          ? `批量采集已提交：成功 ${successCount} 条，失败 ${failCount} 条`
          : `批量采集已提交：成功 ${successCount} 条`
      )
      return
    }

    ElMessage.warning(
      failCount > 0 ? `批量采集提交失败：共 ${failCount} 条失败` : '批量采集未提交任何任务'
    )
  } catch (error) {
    console.error('批量触发 Yum 仓库采集失败:', error)
    ElMessage.error('批量触发 Yum 仓库采集失败')
  } finally {
    batchCollecting.value = false
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
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}
</style>
