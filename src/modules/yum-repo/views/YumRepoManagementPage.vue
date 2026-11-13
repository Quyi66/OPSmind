<template>
  <div class="ops-page-layout ops-page-layout--page-scroll yum-repo-page">
    <YumRepoOverviewSection
      :overview-data="overviewData"
      :loading="overviewLoading"
      v-model:selected-repo-id="selectedRepoId"
    />

    <el-tabs v-model="activeTab" class="yum-repo-tabs">
      <el-tab-pane :label="t('yumRepo.management')" name="repos">
        <YumRepoSourceTable
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

      <el-tab-pane :label="t('yumRepo.collectionInventory')" name="packages" lazy>
        <YumRepoPackagesPanel
          :active="activeTab === 'packages'"
          :configs="configList"
          :repos="sourceList"
          v-model:selected-repo-id="selectedRepoId"
        />
      </el-tab-pane>

      <el-tab-pane :label="t('yumRepo.patchComparison')" name="compare" lazy>
        <YumRepoComparePanel
          :active="activeTab === 'compare'"
          :configs="configList"
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
import { t } from '@/core/i18n'

import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import YumRepoComparePanel from '../components/YumRepoComparePanel.vue'
import YumRepoOverviewSection from '../components/YumRepoOverviewSection.vue'
import YumRepoPackagesPanel from '../components/YumRepoPackagesPanel.vue'
import YumRepoSourceTable from '../components/YumRepoSourceTable.vue'
import { yumRepoApi } from '../api'
import {
  buildCollectedYumRepoSources,
  isYumRepoCollectSucceeded,
  normalizeYumConfigRecord,
  resolveYumConfigId,
  unwrapResponse
} from '../utils'

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

function isConfigCollectSucceeded(config) {
  return isYumRepoCollectSucceeded(normalizeYumConfigRecord(config))
}

async function fetchConfigList() {
  const response = await yumRepoApi.getConfigList()
  const data = unwrapResponse(response)
  return (Array.isArray(data) ? data : []).map(item => normalizeYumConfigRecord(item))
}

async function loadOverview(options = {}) {
  overviewLoading.value = !options.silent
  try {
    const response = await yumRepoApi.getCompareOverview()
    overviewData.value = unwrapResponse(response)
  } catch (error) {
    if (!options.silent) {
      console.error('加载 Yum 仓库补丁比对总览失败:', error)
      ElMessage.error(t('yumRepo.overviewFailed'))
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
  const nextSelectedId = String(
    preferredId || selectedRepoId.value || selectedConfigId.value || ''
  ).trim()
  const hasCurrent = configList.value.some(item => resolveYumConfigId(item) === nextSelectedId)
  selectedRepoId.value = hasCurrent ? nextSelectedId : resolveYumConfigId(configList.value[0])
}

function syncSourceList(preferredId = '') {
  sourceList.value = buildCollectedYumRepoSources(configList.value)
  syncSelectedRepoId(preferredId)
}

async function loadConfigs(preferredConfigId = '', preferredRepoId = '') {
  loadingConfigs.value = true
  try {
    configList.value = await fetchConfigList()
    syncSelectedConfigId(preferredConfigId)
    syncSourceList(preferredRepoId)
    await loadOverview({ silent: true })
  } catch (error) {
    console.error('加载 Yum 源配置失败:', error)
    ElMessage.error(t('yumRepo.configsFailed'))
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
    const data = unwrapResponse(response) || {}
    selectedRepoId.value = configId

    ElMessage.info(data?.message || t('yumRepo.collectionSubmitted'))

    await pollCollectThenCompare(configId)
  } catch (error) {
    console.error('触发 Yum 仓库采集失败:', error)
    ElMessage.error(t('yumRepo.collectFailed'))
    await loadConfigs(configId, selectedRepoId.value)
  } finally {
    collectingConfigId.value = ''
  }
}

async function pollCollectThenCompare(configId) {
  const MAX_ATTEMPTS = 120
  const INTERVAL = 2500

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(resolve => setTimeout(resolve, INTERVAL))

    let currentConfig = null
    try {
      const configs = await fetchConfigList()
      currentConfig = configs.find(item => resolveYumConfigId(item) === configId) || null
    } catch {
      continue
    }

    if (!currentConfig) {
      continue
    }

    const cs = String(currentConfig.collectStatus || '').trim()
    if (!cs || cs === 'RUNNING' || cs === 'PENDING') continue

    if (isConfigCollectSucceeded(currentConfig)) {
      try {
        const compareResp = await yumRepoApi.compareScannedPatches({ dcDataId: configId })
        const compareData = unwrapResponse(compareResp)
        if (compareData?.success === false) {
          const bizMsg = String(compareData?.message || '').trim()
          ElMessage.warning(t('yumRepo.collectCompareFailed', { reason: bizMsg || t('yumRepo.compareManually') }))
          await loadConfigs(configId, configId)
          return
        }
      } catch (err) {
        console.error('触发补丁比对失败:', err)
        const errMsg = String(err?.response?.data?.message || err?.message || '').trim()
        ElMessage.warning(t('yumRepo.collectCompareStartFailed', { reason: errMsg || t('yumRepo.compareManually') }))
        await loadConfigs(configId, configId)
        return
      }
      await loadConfigs(configId, configId)
      ElMessage.success(t('yumRepo.autoCompared'))
      return
    }

    if (cs === 'FAILED') {
      const errMsg = String(currentConfig.errorMessage || '').trim()
      ElMessage.error(t('yumRepo.collectionFailedReason', { reason: errMsg || t('yumRepo.inaccessibleRepo') }))
      await loadConfigs(configId, configId)
      return
    }
  }

  ElMessage.warning(t('yumRepo.collectionTimeout'))
  await loadConfigs(configId, configId)
}

async function handleCollectAll() {
  const dcDataIds = configList.value.map(item => resolveYumConfigId(item)).filter(Boolean)
  if (dcDataIds.length === 0) {
    ElMessage.warning(t('yumRepo.noCollectableConfigs'))
    return
  }

  batchCollecting.value = true

  try {
    const response = await yumRepoApi.collectPackagesBatch({ dcDataIds })
    const data = unwrapResponse(response) || {}
    await loadConfigs(selectedConfigId.value, selectedRepoId.value)

    const successCount = Number(data.successCount || 0)
    const failCount = Number(data.failCount || 0)

    if (successCount > 0) {
      ElMessage.success(
        failCount > 0
          ? t('yumRepo.batchSubmittedWithFailures', { succeeded: successCount, failed: failCount })
          : t('yumRepo.batchSubmitted', { count: successCount })
      )
      return
    }

    ElMessage.warning(
      failCount > 0 ? t('yumRepo.batchFailed', { count: failCount }) : t('yumRepo.noCollectionSubmitted')
    )
  } catch (error) {
    console.error('批量触发 Yum 仓库采集失败:', error)
    ElMessage.error(t('yumRepo.batchCollectFailed'))
  } finally {
    batchCollecting.value = false
  }
}

function openPackagesTab(config) {
  const configId = resolveYumConfigId(config)
  selectedConfigId.value = configId

  if (!configId || !normalizeYumConfigRecord(config).sourceIds.length) {
    ElMessage.warning(t('yumRepo.collectFirst'))
    return
  }

  selectedRepoId.value = configId
  activeTab.value = 'packages'
}

function openCompareTab(config) {
  const configId = resolveYumConfigId(config)
  selectedConfigId.value = configId
  if (!isConfigCollectSucceeded(config)) {
    ElMessage.warning(t('yumRepo.collectAllReposFirst'))
    return
  }

  if (!configId) {
    ElMessage.warning(t('yumRepo.noComparableRepo'))
    return
  }

  selectedRepoId.value = configId
  activeTab.value = 'compare'
}

onMounted(async () => {
  await loadConfigs()
})
</script>

<style scoped lang="scss">
.yum-repo-page {
  gap: 12px;
}

.yum-repo-tabs {
  :deep(.el-tabs__content),
  :deep(.el-tab-pane) {
    overflow: visible;
  }
}
</style>
