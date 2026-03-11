<template>
  <div class="ops-page-layout asset-overview">
    <section class="summary-grid">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="summary-card"
        :class="[`summary-card--${card.tone}`, { 'is-disabled': !card.clickable }]"
        role="button"
        :tabindex="card.clickable ? 0 : -1"
        :aria-disabled="!card.clickable"
        @click="card.clickable && handleSummaryCardClick(card.key)"
        @keydown.enter.prevent="card.clickable && handleSummaryCardClick(card.key)"
        @keydown.space.prevent="card.clickable && handleSummaryCardClick(card.key)"
      >
        <div class="summary-card__main">
          <div class="summary-card__icon">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
          <div class="summary-card__content">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__meta">{{ card.meta }}</span>
          </div>
        </div>
        <span class="summary-card__action" :class="`summary-card__action--${card.tone}`">
          {{ card.actionText }}
        </span>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="panel-shell panel-shell--trend">
        <AssetTrendChart :data="newAssetData" :loading="newAssetLoading" :show-controls="false" />
      </div>
      <div class="panel-shell panel-shell--type">
        <AssetTypeChart
          :data="assetTypeData"
          :loading="assetTypeLoading"
          :show-controls="false"
          @click="handleAssetTypeClick"
        />
      </div>
      <div class="panel-shell panel-shell--group">
        <GroupAssetChart
          :data="groupAssetData"
          :loading="groupAssetLoading"
          :show-controls="false"
          @click="handleGroupClick"
        />
      </div>
      <div class="panel-shell panel-shell--os">
        <OsDistributionChart
          :data="osDistributionData"
          :loading="osDistributionLoading"
          :show-controls="false"
          @click="handleOsClick"
        />
      </div>
    </section>

    <OsVersionDialog
      v-model="osVersionVisible"
      :title="osVersionTitle"
      :data="osVersionData"
      :loading="osVersionLoading"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Cpu, Monitor } from '@element-plus/icons-vue'
import { overviewApi } from '../api'
import AssetTypeChart from '../components/charts/AssetTypeChart.vue'
import OsDistributionChart from '../components/charts/OsDistributionChart.vue'
import AssetTrendChart from '../components/charts/AssetTrendChart.vue'
import GroupAssetChart from '../components/charts/GroupAssetChart.vue'
import OsVersionDialog from '../components/OsVersionDialog.vue'

const router = useRouter()

const assetTypeData = ref([])
const assetTypeLoading = ref(false)

const osDistributionData = ref([])
const osDistributionLoading = ref(false)

const newAssetData = ref([])
const newAssetLoading = ref(false)

const groupAssetData = ref([])
const groupAssetLoading = ref(false)

const osVersionVisible = ref(false)
const osVersionLoading = ref(false)
const osVersionData = ref([])
const osVersionTitle = ref('')

const totalAssets = computed(() => sumField(assetTypeData.value, 'count'))
const assetTypeCount = computed(() => assetTypeData.value.length)

const topAssetType = computed(() => findTopRecord(assetTypeData.value, 'count'))
const topOs = computed(() => findTopRecord(osDistributionData.value, 'count'))

const summaryCards = computed(() => [
  {
    key: 'totalAssets',
    label: '资产盘点',
    value: formatCount(totalAssets.value),
    meta: assetTypeCount.value
      ? `已覆盖 ${assetTypeCount.value} 类资产，进入列表查看明细`
      : '等待资产类型数据返回',
    actionText: totalAssets.value > 0 ? '查看资产列表' : '暂无可查看数据',
    tone: 'blue',
    icon: Monitor,
    clickable: totalAssets.value > 0
  },
  {
    key: 'assetType',
    label: '类型焦点',
    value: topAssetType.value?.title || '暂无数据',
    meta: topAssetType.value
      ? `当前最多 ${formatCount(topAssetType.value.count)} 台，点击按类型筛选`
      : '等待资产类型聚合结果',
    actionText: topAssetType.value?.code ? '查看该类型资产' : '暂无可跳转对象',
    tone: 'cyan',
    icon: Connection,
    clickable: Boolean(topAssetType.value?.code)
  },
  {
    key: 'os',
    label: '系统热点',
    value: topOs.value?.os_distro || '暂无数据',
    meta: topOs.value
      ? `${formatCount(topOs.value.count)} 台，占比 ${formatShare(topOs.value.count, totalAssets.value)}，点击看版本结构`
      : '等待操作系统分布结果',
    actionText: topOs.value?.os_distro ? '查看版本分布' : '暂无可查看版本',
    tone: 'green',
    icon: Cpu,
    clickable: Boolean(topOs.value?.os_distro)
  }
])

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toTimestamp(value) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sumField(list, field) {
  return list.reduce((sum, item) => sum + toNumber(item?.[field]), 0)
}

function findTopRecord(list, field) {
  if (!list.length) return null
  return [...list].sort((a, b) => toNumber(b?.[field]) - toNumber(a?.[field]))[0]
}

function formatCount(value) {
  const numericValue = toNumber(value)
  return numericValue.toLocaleString('zh-CN')
}

function formatShare(part, total) {
  const totalValue = toNumber(total)
  if (!totalValue) return '0%'
  return `${Math.round((toNumber(part) / totalValue) * 100)}%`
}

async function loadAssetType() {
  assetTypeLoading.value = true
  try {
    const response = await overviewApi.getAssetTypeCount()
    const data = response?.data || response || {}
    assetTypeData.value = data.records || []
  } catch (error) {
    console.error('加载资产类型统计失败:', error)
  } finally {
    assetTypeLoading.value = false
  }
}

async function loadOsDistribution() {
  osDistributionLoading.value = true
  try {
    const response = await overviewApi.getOsDistribution()
    const data = response?.data || response || {}
    osDistributionData.value = data.records || []
  } catch (error) {
    console.error('加载操作系统分布失败:', error)
  } finally {
    osDistributionLoading.value = false
  }
}

async function loadNewAsset() {
  newAssetLoading.value = true
  try {
    const response = await overviewApi.getNewAssetCount()
    const data = response?.data || response || {}
    newAssetData.value = [...(data.records || [])].sort((a, b) => toTimestamp(a.times) - toTimestamp(b.times))
  } catch (error) {
    console.error('加载资产新增统计失败:', error)
  } finally {
    newAssetLoading.value = false
  }
}

async function loadGroupAsset() {
  groupAssetLoading.value = true
  try {
    const response = await overviewApi.getGroupAssetCount()
    const data = response?.data || response || {}
    groupAssetData.value = data.records || []
  } catch (error) {
    console.error('加载分组资产分布失败:', error)
  } finally {
    groupAssetLoading.value = false
  }
}

function handleAssetTypeClick(params) {
  if (!params?.code) return
  router.push({
    path: '/acm/info',
    query: { type: params.code }
  })
}

async function handleOsClick(params) {
  const osDistro = params?.os_distro
  if (!osDistro) return

  osVersionTitle.value = `${osDistro} 版本分布`
  osVersionVisible.value = true
  osVersionLoading.value = true
  osVersionData.value = []

  try {
    const response = await overviewApi.getOsVersionDistribution(osDistro)
    const data = response?.data || response || {}
    osVersionData.value = data.records || []
  } catch (error) {
    console.error('获取操作系统版本分布失败:', error)
    ElMessage.error('获取版本分布失败')
  } finally {
    osVersionLoading.value = false
  }
}

function handleGroupClick(params) {
  if (!params?.groupName) return
  ElMessage.info(`重点分组: ${params.groupName}`)
}

function handleSummaryCardClick(key) {
  if (key === 'totalAssets') {
    router.push({ path: '/acm/info' })
    return
  }
  if (key === 'assetType') {
    handleAssetTypeClick(topAssetType.value)
    return
  }
  if (key === 'os') {
    handleOsClick(topOs.value)
    return
  }
}

async function loadAllData() {
  await Promise.all([loadAssetType(), loadOsDistribution(), loadNewAsset(), loadGroupAsset()])
}

onMounted(() => {
  loadAllData()
})
</script>

<style scoped lang="scss">
.asset-overview {
  --asset-page-bg: transparent;
  --asset-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
  --asset-card-border: rgba(148, 163, 184, 0.14);
  --asset-card-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
  --asset-card-shadow-hover: 0 16px 28px rgba(15, 23, 42, 0.07);
  --asset-panel-bg: var(--el-bg-color);
  --asset-panel-border: transparent;
  --asset-panel-trend-accent: rgba(45, 212, 191, 0.16);
  --asset-panel-type-accent: rgba(59, 130, 246, 0.16);
  --asset-panel-group-accent: rgba(245, 158, 11, 0.16);
  --asset-panel-os-accent: rgba(34, 197, 94, 0.16);
  --asset-inner-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
  --asset-inner-card-border: transparent;
  --asset-inner-card-shadow: none;
  --asset-action-bg: rgba(255, 255, 255, 0.42);
  --asset-action-border: rgba(148, 163, 184, 0.14);
  --asset-text-primary: #0f172a;
  --asset-text-secondary: #64748b;
  --asset-text-muted: #94a3b8;
  height: 100%;
  padding: clamp(12px, 1vw, 18px);
  gap: clamp(10px, 0.9vw, 14px);
  overflow: hidden;
  background: var(--asset-page-bg);
}

html.dark .asset-overview {
  --asset-card-bg: linear-gradient(180deg, rgba(24, 31, 44, 0.96), rgba(17, 24, 39, 0.94));
  --asset-card-border: rgba(71, 85, 105, 0.5);
  --asset-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.28), 0 14px 28px rgba(0, 0, 0, 0.18);
  --asset-card-shadow-hover: 0 16px 30px rgba(0, 0, 0, 0.24);
  --asset-panel-bg: linear-gradient(180deg, rgba(19, 27, 38, 0.96), rgba(16, 23, 34, 0.94));
  --asset-panel-border: rgba(71, 85, 105, 0.34);
  --asset-panel-trend-accent: rgba(45, 212, 191, 0.18);
  --asset-panel-type-accent: rgba(96, 165, 250, 0.18);
  --asset-panel-group-accent: rgba(251, 191, 36, 0.16);
  --asset-panel-os-accent: rgba(74, 222, 128, 0.16);
  --asset-inner-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.012));
  --asset-inner-card-border: rgba(148, 163, 184, 0.08);
  --asset-inner-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  --asset-action-bg: rgba(255, 255, 255, 0.05);
  --asset-action-border: rgba(148, 163, 184, 0.14);
  --asset-text-primary: #e5edf7;
  --asset-text-secondary: #cbd5e1;
  --asset-text-muted: #94a3b8;
}

html.dark .asset-overview .summary-card {
  border-color: rgba(71, 85, 105, 0.52) !important;
  background: linear-gradient(180deg, rgba(24, 31, 44, 0.96), rgba(17, 24, 39, 0.94)) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28), 0 14px 28px rgba(0, 0, 0, 0.18) !important;
  color: #e5edf7;
}

html.dark .asset-overview .summary-card:hover:not(:disabled) {
  border-color: rgba(96, 165, 250, 0.36) !important;
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.24) !important;
}

html.dark .asset-overview .panel-shell {
  border-color: var(--asset-panel-border);
  box-shadow: var(--asset-card-shadow);
}

html.dark .asset-overview .panel-shell :deep(.chart-card) {
  background: var(--asset-inner-card-bg);
  border-color: var(--asset-inner-card-border);
  box-shadow: var(--asset-inner-card-shadow);
}

// html.dark .asset-overview .summary-card__action {
//   background: rgba(255, 255, 255, 0.05) !important;
//   box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14) !important;
// }

html.dark .asset-overview .summary-card.is-disabled {
  background: linear-gradient(180deg, rgba(24, 31, 44, 0.96), rgba(17, 24, 39, 0.94)) !important;
  border-color: rgba(71, 85, 105, 0.52) !important;
}

html.dark .asset-overview .summary-card__label {
  color: #cbd5e1 !important;
}

html.dark .asset-overview .summary-card__value {
  color: #f8fafc !important;
}

html.dark .asset-overview .summary-card__meta {
  color: #94a3b8 !important;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(10px, 0.9vw, 14px);
}

.summary-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: clamp(12px, 0.9vw, 16px);
  min-width: 0;
  min-height: clamp(88px, 11vh, 108px);
  padding: clamp(14px, 1vw, 18px) clamp(16px, 1.2vw, 20px);
  text-align: left;
  border: 1px solid var(--asset-card-border);
  border-radius: 20px;
  background: var(--asset-card-bg);
  box-shadow: var(--asset-card-shadow);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.summary-card:hover:not(.is-disabled) {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.22);
  box-shadow: var(--asset-card-shadow-hover);
}

.summary-card.is-disabled {
  cursor: default;
}

.summary-card__main {
  display: flex;
  align-items: center;
  gap: clamp(12px, 0.9vw, 14px);
  min-width: 0;
  flex: 1;
  padding-right: clamp(104px, 9vw, 140px);
}

.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(40px, 2.5vw, 44px);
  height: clamp(40px, 2.5vw, 44px);
  border-radius: 16px;
  color: #fff;
  font-size: clamp(16px, 1.1vw, 18px);
  flex-shrink: 0;
}

.summary-card__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.summary-card__label {
  color: var(--asset-text-secondary);
  font-size: clamp(11px, 0.75vw, 12px);
  font-weight: 600;
}

.summary-card__value {
  color: var(--asset-text-primary);
  font-size: clamp(18px, 1.2vw, 20px);
  line-height: 1.2;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-card__meta {
  color: var(--asset-text-muted);
  font-size: clamp(11px, 0.75vw, 12px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.summary-card__action {
  position: absolute;
  right: clamp(16px, 1.2vw, 20px);
  bottom: clamp(14px, 1vw, 18px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  max-width: clamp(110px, 9vw, 136px);
  padding: 6px 0;
  // background: var(--asset-action-bg);
  // box-shadow: inset 0 0 0 1px var(--asset-action-border);
  // border-radius: 12px;
  font-size: clamp(11px, 0.8vw, 12px);
  font-weight: 700;
  line-height: 1.35;
  text-align: right;
  white-space: nowrap;
}

.summary-card__action::after {
  content: '→';
  margin-left: 6px;
  font-size: 12px;
}

.summary-card.is-disabled .summary-card__action::after {
  opacity: 0.35;
}

.summary-card__action--blue {
  color: #2563eb;
}

.summary-card__action--cyan {
  color: #0891b2;
}

.summary-card__action--green {
  color: #059669;
}

.summary-card--blue .summary-card__icon {
  background: linear-gradient(135deg, #2563eb, #60a5fa);
}

// .summary-card--blue::before {
//   background: linear-gradient(90deg, #2563eb, #60a5fa);
// }

.summary-card--cyan .summary-card__icon {
  background: linear-gradient(135deg, #0891b2, #22d3ee);
}

// .summary-card--cyan::before {
//   background: linear-gradient(90deg, #0891b2, #22d3ee);
// }

.summary-card--green .summary-card__icon {
  background: linear-gradient(135deg, #059669, #4ade80);
}

// .summary-card--green::before {
//   background: linear-gradient(90deg, #059669, #4ade80);
// }

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 0.9vw, 14px);
  min-height: 0;
  flex: 1;
}

.panel-shell {
  position: relative;
  min-height: 0;
  padding: clamp(8px, 0.7vw, 10px);
  border: 1px solid var(--asset-panel-border);
  border-radius: 24px;
  background: var(--asset-panel-bg);
  box-shadow: var(--asset-card-shadow);
  overflow: hidden;
}

.panel-shell::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 56px;
  pointer-events: none;
}

.panel-shell--trend::before {
  background: linear-gradient(180deg, var(--asset-panel-trend-accent), transparent);
}

.panel-shell--type::before {
  background: linear-gradient(180deg, var(--asset-panel-type-accent), transparent);
}

.panel-shell--group::before {
  background: linear-gradient(180deg, var(--asset-panel-group-accent), transparent);
}

.panel-shell--os::before {
  background: linear-gradient(180deg, var(--asset-panel-os-accent), transparent);
}

.panel-shell :deep(.chart-card) {
  position: relative;
  height: 100%;
  padding: clamp(10px, 0.8vw, 14px);
  border-radius: 20px;
  border: 1px solid var(--asset-inner-card-border);
  background: var(--asset-inner-card-bg);
  box-shadow: var(--asset-inner-card-shadow);
  backdrop-filter: none;
}

html.dark .asset-overview .panel-shell {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), rgba(255, 255, 255, 0)) padding-box,
    linear-gradient(180deg, rgba(19, 27, 38, 0.96), rgba(16, 23, 34, 0.94));
}

html.dark .asset-overview .panel-shell :deep(.chart-card) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.008)) !important;
  border-color: rgba(148, 163, 184, 0.06) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
  backdrop-filter: blur(6px);
}

.panel-shell :deep(.chart-header) {
  margin-bottom: 10px;
}

.panel-shell :deep(.header-left) {
  gap: 10px;
}

.panel-shell :deep(.header-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(28px, 2vw, 32px);
  height: clamp(28px, 2vw, 32px);
  border-radius: 12px;
  color: #fff;
  font-size: clamp(13px, 1vw, 15px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.panel-shell--trend :deep(.header-icon) {
  background: linear-gradient(135deg, #0f766e, #2dd4bf);
}

.panel-shell--type :deep(.header-icon) {
  background: linear-gradient(135deg, #2563eb, #60a5fa);
}

.panel-shell--os :deep(.header-icon) {
  background: linear-gradient(135deg, #059669, #4ade80);
}

.panel-shell--group :deep(.header-icon) {
  background: linear-gradient(135deg, #d97706, #fbbf24);
}

.panel-shell :deep(.chart-title) {
  font-size: clamp(14px, 0.95vw, 15px);
  font-weight: 700;
  color: var(--asset-text-primary);
}

.panel-shell :deep(.chart-container) {
  min-height: 0;
  border-radius: 16px;
}

@media (max-width: 1600px), (max-height: 900px) {
  .summary-card {
    min-height: 82px;
    padding: 14px 16px;
  }

  .summary-card__main {
    padding-right: 100px;
  }

  .summary-card__action {
    right: 16px;
    bottom: 14px;
    max-width: 110px;
  }

  .panel-shell {
    border-radius: 20px;
  }

  .panel-shell :deep(.chart-card) {
    border-radius: 18px;
  }
}

@media (max-width: 1200px), (max-height: 820px) {
  .asset-overview {
    padding: 12px;
    gap: 10px;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .summary-card {
    min-height: 76px;
    padding: 12px 14px;
  }

  .summary-card__content {
    gap: 3px;
  }

  .summary-card__main {
    gap: 10px;
    padding-right: 88px;
  }

  .summary-card__action {
    right: 14px;
    bottom: 12px;
    max-width: 92px;
    font-size: 11px;
  }

  .dashboard-grid {
    gap: 10px;
  }

  .panel-shell :deep(.chart-header) {
    margin-bottom: 8px;
  }
}

@media (max-width: 1440px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .summary-card__value {
    font-size: 18px;
  }
}

@media (max-width: 900px) {
  .asset-overview {
    padding: 16px;
    overflow: auto;
  }

  .summary-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .summary-card {
    min-height: 82px;
  }

  .summary-card__main {
    padding-right: 96px;
  }
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-card__main {
    width: 100%;
    padding-right: 0;
  }

  .summary-card__action {
    position: static;
    max-width: none;
    width: auto;
    margin-left: auto;
  }
}
</style>
