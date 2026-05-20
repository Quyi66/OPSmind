<template>
  <div class="ops-page-layout asset-overview">
    <header class="workbench-header">
      <div class="workbench-header__main">
        <h2 class="workbench-header__title">资产总览</h2>
      </div>

      <div class="workbench-header__actions">
        <div class="status-mini-list">
          <span v-for="item in heroChips" :key="item.label" class="status-mini">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </span>
          <span class="status-mini status-mini--muted">
            <span>更新于</span>
            <strong>{{ refreshedAtText }}</strong>
          </span>
        </div>

        <button
          type="button"
          class="refresh-button"
          :class="{ 'is-loading': overviewRefreshing }"
          :disabled="overviewRefreshing"
          @click="loadAllData"
        >
          <el-icon><Refresh /></el-icon>
          <span>{{ overviewRefreshing ? '刷新中' : '刷新' }}</span>
        </button>
      </div>
    </header>

    <section class="workbench-summary-grid">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        class="summary-card"
        :class="[
          `summary-card--${card.tone}`,
          {
            'summary-card--textual': card.valueMode === 'text',
            'is-active': card.targetTab && analyticsTab === card.targetTab,
            'is-static': !card.clickable && !card.targetTab
          }
        ]"
        :disabled="!card.clickable && !card.targetTab"
        @click="handleSummaryCardClick(card)"
      >
        <div class="summary-card__head">
          <span class="summary-card__label">{{ card.label }}</span>
          <span class="summary-card__badge">
            <el-icon><component :is="card.icon" /></el-icon>
            {{ card.badge }}
          </span>
        </div>
        <div class="summary-card__body">
          <strong class="summary-card__value" :title="card.value">{{ card.value }}</strong>
          <span class="summary-card__meta">{{ card.meta }}</span>
        </div>
        <span v-if="card.actionText" class="summary-card__action">{{ card.actionText }}</span>
      </button>
    </section>

    <section class="workbench-main-grid">
      <article class="workbench-panel workbench-panel--wide analytics-panel">
        <div class="workbench-panel__header">
          <div class="workbench-panel__header-main">
            <h3 class="workbench-panel__title">趋势与分布</h3>
            <span class="workbench-panel__pill">{{ activeAnalyticsLabel }}</span>
          </div>
          <div class="analytics-tabs">
            <button
              v-for="item in analyticsTabs"
              :key="item.key"
              type="button"
              class="analytics-tab"
              :class="{ 'is-active': analyticsTab === item.key }"
              @click="analyticsTab = item.key"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div class="analytics-stage">
          <div class="chart-frame" :class="`chart-frame--${analyticsTab}`">
            <AssetTrendChart
              v-if="analyticsTab === 'trend'"
              :data="newAssetData"
              :loading="newAssetLoading"
              :show-controls="false"
            />
            <AssetTypeChart
              v-else-if="analyticsTab === 'type'"
              :data="assetTypeData"
              :loading="assetTypeLoading"
              :show-controls="false"
              @click="handleAssetTypeClick"
            />
            <OsDistributionChart
              v-else-if="analyticsTab === 'os'"
              :data="osDistributionData"
              :loading="osDistributionLoading"
              :show-controls="false"
              @click="handleOsClick"
            />
            <GroupAssetChart
              v-else
              :data="groupAssetData"
              :loading="groupAssetLoading"
              :show-controls="false"
              @click="handleGroupClick"
            />
          </div>
        </div>
      </article>

      <article class="workbench-panel insight-panel">
        <div class="workbench-panel__header">
          <div class="workbench-panel__header-main">
            <h3 class="workbench-panel__title">异常与日志</h3>
            <span class="workbench-panel__pill">处置视图</span>
          </div>
        </div>

        <div class="metric-grid">
          <div v-for="item in insightMetrics" :key="item.label" class="metric-card">
            <span class="metric-card__label">{{ item.label }}</span>
            <strong class="metric-card__value">{{ item.value }}</strong>
            <span class="metric-card__meta">{{ item.meta }}</span>
          </div>
        </div>

        <div class="insight-stream">
          <ExceptionDevicePreviewList
            :items="exceptionPreviewItems"
            :total="exceptionDeviceTotal"
            :loading="exceptionPreviewLoading"
            @select="handleExceptionDeviceClick"
            @view-all="openExceptionDevicePage"
          />

          <FailedLogPreviewList
            :items="failedLogPreviewItems"
            :total="failedLogTotal"
            :loading="failedLogLoading"
            @select="handleFailedLogClick"
            @view-all="openFailedLogPage"
          />
        </div>

        <div class="signal-strip">
          <div v-for="item in signalItems" :key="item.label" class="signal-item" :class="`signal-item--${item.tone}`">
            <span class="signal-item__dot"></span>
            <span class="signal-item__label">{{ item.label }}</span>
            <strong class="signal-item__value">{{ item.value }}</strong>
          </div>
        </div>
      </article>
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
import { CircleCheck, Connection, Cpu, Monitor, Refresh } from '@element-plus/icons-vue'
import { translateI18nKey } from '@/utils/i18n'
import { exceptionApi, operationLogApi, overviewApi } from '../api'
import AssetTypeChart from '../components/charts/AssetTypeChart.vue'
import OsDistributionChart from '../components/charts/OsDistributionChart.vue'
import AssetTrendChart from '../components/charts/AssetTrendChart.vue'
import GroupAssetChart from '../components/charts/GroupAssetChart.vue'
import ExceptionDevicePreviewList from '../components/overview/ExceptionDevicePreviewList.vue'
import FailedLogPreviewList from '../components/overview/FailedLogPreviewList.vue'
import OsVersionDialog from '../components/overview/OsVersionDialog.vue'

const router = useRouter()

const analyticsTabs = [
  { key: 'trend', label: '新增趋势' },
  { key: 'type', label: '资产类型' },
  { key: 'os', label: '系统分布' },
  { key: 'group', label: '分组分布' }
]

const analyticsTab = ref('trend')
const activeAnalyticsLabel = computed(
  () => analyticsTabs.find(item => item.key === analyticsTab.value)?.label || '分析视图'
)

const assetTypeData = ref([])
const assetTypeLoading = ref(false)

const osDistributionData = ref([])
const osDistributionLoading = ref(false)

const newAssetData = ref([])
const newAssetLoading = ref(false)

const groupAssetData = ref([])
const groupAssetLoading = ref(false)

const connectionData = ref([])
const connectionLoading = ref(false)
const exceptionPreviewRows = ref([])
const exceptionPreviewLoading = ref(false)
const exceptionDeviceTotal = ref(0)
const failedLogRows = ref([])
const failedLogLoading = ref(false)
const failedLogTotal = ref(0)
const refreshedAt = ref(null)

const osVersionVisible = ref(false)
const osVersionLoading = ref(false)
const osVersionData = ref([])
const osVersionTitle = ref('')

const totalAssets = computed(() => sumField(assetTypeData.value, 'count'))
const assetTypeCount = computed(() => assetTypeData.value.length)
const groupTotal = computed(() => sumField(sortedGroups.value, 'count'))
const osTotal = computed(() => sumField(osDistributionData.value, 'count'))
const groupCount = computed(() => sortedGroups.value.length)
const failedLogLatest = computed(() => failedLogRows.value[0] || null)
const overviewRefreshing = computed(
  () =>
    assetTypeLoading.value ||
    osDistributionLoading.value ||
    newAssetLoading.value ||
    groupAssetLoading.value ||
    connectionLoading.value ||
    exceptionPreviewLoading.value ||
    failedLogLoading.value
)

const sortedAssetTypes = computed(() =>
  [...assetTypeData.value]
    .map(item => ({
      ...item,
      count: toNumber(item?.count)
    }))
    .sort((first, second) => second.count - first.count)
)

const sortedOsDistribution = computed(() =>
  [...osDistributionData.value]
    .map(item => ({
      ...item,
      count: toNumber(item?.count)
    }))
    .sort((first, second) => second.count - first.count)
)

const sortedGroups = computed(() =>
  [...groupAssetData.value]
    .map(item => ({
      name: item?.groupName || item?.name || item?.path || '未命名分组',
      count: toNumber(item?.count ?? item?.total)
    }))
    .sort((first, second) => second.count - first.count)
)

const topAssetType = computed(() => sortedAssetTypes.value[0] || null)
const topOs = computed(() => sortedOsDistribution.value[0] || null)
const topGroup = computed(() => sortedGroups.value[0] || null)
const latestTrendPoint = computed(() => newAssetData.value[newAssetData.value.length - 1] || null)
const peakTrendPoint = computed(() => findTopRecord(newAssetData.value, item => item?.total ?? item?.count))

const connectionStats = computed(() => {
  const statsMap = connectionData.value.reduce((result, item) => {
    if (item?.condi) {
      result[item.condi] = toNumber(item?.c ?? item?.count)
    }
    return result
  }, {})

  const successCount = statsMap.recently_ok || 0
  const failureCount = statsMap.recently || 0
  const totalConnection = successCount + failureCount

  return {
    successCount,
    failureCount,
    anomalyCount: statsMap.oplus_all || failureCount,
    todayCount: statsMap.today || 0,
    lowCount: statsMap.low || 0,
    totalConnection,
    successRate: totalConnection ? Math.round((successCount / totalConnection) * 100) : 0
  }
})

const refreshedAtText = computed(() => {
  if (!refreshedAt.value) return '--'
  const hour = String(refreshedAt.value.getHours()).padStart(2, '0')
  const minute = String(refreshedAt.value.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
})

const heroChips = computed(() => [
  {
    label: '资产总量',
    value: `${formatCount(totalAssets.value)} 台`
  },
  {
    label: '结构',
    value: `${formatCount(assetTypeCount.value)} 类 / ${formatCount(groupCount.value)} 组`
  },
  {
    label: '异常设备',
    value: `${formatCount(exceptionDeviceTotal.value)} 台`
  }
])

const summaryCards = computed(() => [
  {
    key: 'totalAssets',
    label: '资产盘点',
    value: `${formatCount(totalAssets.value)} 台`,
    meta: assetTypeCount.value
      ? `当前已覆盖 ${formatCount(assetTypeCount.value)} 类资产`
      : '等待资产类型统计返回',
    actionText: totalAssets.value > 0 ? '查看资产列表' : '暂无可查看数据',
    valueMode: 'metric',
    tone: 'blue',
    icon: Monitor,
    badge: '总览',
    clickable: totalAssets.value > 0
  },
  {
    key: 'assetType',
    label: '类型焦点',
    value: topAssetType.value?.title || '暂无数据',
    meta: topAssetType.value
      ? `${formatCount(topAssetType.value.count)} 台 · 占比 ${formatShare(topAssetType.value.count, totalAssets.value)}`
      : '等待资产类型聚合结果',
    actionText: topAssetType.value?.code ? '查看该类型资产' : '暂无可跳转对象',
    valueMode: 'text',
    tone: 'cyan',
    icon: Connection,
    badge: '类型',
    clickable: Boolean(topAssetType.value?.code)
  },
  {
    key: 'os',
    label: '系统热点',
    value: topOs.value?.os_distro || '暂无数据',
    meta: topOs.value
      ? `${formatCount(topOs.value.count)} 台 · 占比 ${formatShare(topOs.value.count, osTotal.value)}`
      : '等待操作系统分布结果',
    actionText: topOs.value?.os_distro ? '查看版本分布' : '暂无可查看版本',
    valueMode: 'text',
    tone: 'green',
    icon: Cpu,
    badge: '系统',
    clickable: Boolean(topOs.value?.os_distro)
  },
  {
    key: 'group',
    label: '分组承载',
    value: topGroup.value?.name || '暂无数据',
    meta: topGroup.value
      ? `${formatCount(topGroup.value.count)} 台 · 覆盖 ${formatShare(topGroup.value.count, groupTotal.value)}`
      : '等待分组聚合结果',
    actionText: topGroup.value?.name ? '查看该分组资产' : '暂无可跳转对象',
    valueMode: 'text',
    tone: 'gold',
    icon: CircleCheck,
    badge: '分组',
    clickable: Boolean(topGroup.value?.name)
  }
])

const insightMetrics = computed(() => [
  {
    label: '异常设备',
    value: `${formatCount(exceptionDeviceTotal.value)} 台`,
    meta: exceptionDeviceTotal.value ? '最近一次连通失败设备' : '当前无异常设备样本'
  },
  {
    label: '失败日志',
    value: `${formatCount(failedLogTotal.value)} 条`,
    meta: failedLogLatest.value ? `${formatDateTimeShort(failedLogLatest.value.start_time)} 最近失败` : '近7天无失败日志'
  },
  {
    label: '低频连接',
    value: `${formatCount(connectionStats.value.lowCount)} 台`,
    meta: connectionStats.value.lowCount ? '连通率小于 50%' : '当前无低频连接主机'
  },
  {
    label: '连通率',
    value: connectionStats.value.totalConnection ? `${connectionStats.value.successRate}%` : '暂无数据',
    meta: connectionStats.value.totalConnection
      ? `${formatCount(connectionStats.value.successCount)} 正常 · ${formatCount(connectionStats.value.failureCount)} 异常`
      : '等待连通性统计结果'
  }
])

const exceptionPreviewItems = computed(() =>
  exceptionPreviewRows.value.map(row => ({
    key: row.IP || row.ci_name || `${row.updated_at || ''}-${row.CONN_RATE || ''}`,
    title: row.IP || '未识别 IP',
    badge: formatConnRate(row.CONN_RATE),
    desc: row.ci_name || '未命名资产',
    meta: `${getConnStatusText(row.CONN_LATEST_STATUS)} · ${formatDateTimeShort(row.updated_at)}`,
    raw: row
  }))
)

const failedLogPreviewItems = computed(() =>
  failedLogRows.value.map(row => ({
    key: row.run_id || `${row.start_time || ''}-${row.action || ''}`,
    title: getOperationActionLabel(row.action),
    badge: formatDateTimeShort(row.start_time),
    desc: formatOperationMessage(row.message),
    meta: `${row.ata_node || '未标记执行节点'} · ${row.username || '未知用户'}`,
    raw: row
  }))
)

const signalItems = computed(() => [
  {
    label: '最近新增',
    value: latestTrendPoint.value
      ? `${formatShortDate(latestTrendPoint.value.times)} · ${formatCount(getTrendValue(latestTrendPoint.value))} 台`
      : '--',
    tone: 'trend'
  },
  {
    label: '新增峰值',
    value: peakTrendPoint.value
      ? `${formatShortDate(peakTrendPoint.value.times)} · ${formatCount(getTrendValue(peakTrendPoint.value))} 台`
      : '--',
    tone: 'neutral'
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

function getTrendValue(record) {
  return toNumber(record?.total ?? record?.count)
}

function sumField(list, field) {
  return list.reduce((sum, item) => sum + toNumber(item?.[field]), 0)
}

function findTopRecord(list, resolver) {
  if (!list.length) return null

  return [...list].sort((first, second) => toNumber(resolver(second)) - toNumber(resolver(first)))[0]
}

function formatCount(value) {
  return toNumber(value).toLocaleString('zh-CN')
}

function formatShare(part, total) {
  const totalValue = toNumber(total)
  if (!totalValue) return '0%'
  return `${Math.round((toNumber(part) / totalValue) * 100)}%`
}

function formatShortDate(value) {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function formatDateTimeShort(value) {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function formatConnRate(value) {
  if (value === null || value === undefined || value === '') return '--'
  const rate = toNumber(value)
  return `${rate}%`
}

function getConnStatusText(status) {
  if (status === null || status === 'null' || status === undefined) return '未测试'
  if (status === 0 || status === '0' || status === '0.0') return '最近失败'
  if (status === 1 || status === '1') return '最近成功'
  return '状态未知'
}

function getOperationActionLabel(action) {
  if (!action) return '未知操作'
  return translateI18nKey(action)
}

function formatOperationMessage(message) {
  if (!message) return '无失败详情'

  try {
    const payload = typeof message === 'string' ? JSON.parse(message) : message
    if (payload?.exception?.message) return payload.exception.message
    if (payload?.message) return payload.message
    if (payload?.msg_id) return payload.msg_id
    return JSON.stringify(payload)
  } catch {
    return String(message)
  }
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
    newAssetData.value = [...(data.records || [])].sort(
      (first, second) => toTimestamp(first.times) - toTimestamp(second.times)
    )
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

async function loadConnection() {
  connectionLoading.value = true
  try {
    const response = await overviewApi.getConnectionCount()
    const data = response?.data || response || {}
    connectionData.value = data.records || []
  } catch (error) {
    console.error('加载连通性统计失败:', error)
  } finally {
    connectionLoading.value = false
  }
}

async function loadExceptionPreview() {
  exceptionPreviewLoading.value = true
  try {
    const response = await exceptionApi.getExceptionDevices(
      {
        cit: 'oplus_all',
        conditions: 'recently',
        param: 'rwx'
      },
      {
        page: 1,
        size: 3
      }
    )
    exceptionPreviewRows.value = response?.records || []
    exceptionDeviceTotal.value = response?.total || exceptionPreviewRows.value.length
  } catch (error) {
    console.error('加载异常设备预览失败:', error)
    exceptionPreviewRows.value = []
    exceptionDeviceTotal.value = 0
  } finally {
    exceptionPreviewLoading.value = false
  }
}

async function loadFailedLogPreview() {
  failedLogLoading.value = true
  try {
    const response = await operationLogApi.getOperationLogs(
      {
        module: 'acm',
        action: 'all',
        status: 'ERROR',
        day: 7
      },
      {
        page: 1,
        size: 5
      }
    )
    failedLogRows.value = response?.records || []
    failedLogTotal.value = response?.total || failedLogRows.value.length
  } catch (error) {
    console.error('加载失败日志预览失败:', error)
    failedLogRows.value = []
    failedLogTotal.value = 0
  } finally {
    failedLogLoading.value = false
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
  const groupName = params?.groupName || params?.name
  if (!groupName) return

  router.push({
    path: '/acm/data',
    query: {
      tab: 'group',
      keyword: groupName
    }
  })
}

function openExceptionDevicePage() {
  router.push({
    path: '/acm/exception',
    query: {
      conditions: 'recently'
    }
  })
}

function handleExceptionDeviceClick(row) {
  router.push({
    path: '/acm/exception',
    query: {
      conditions: 'recently',
      keyword: row?.IP || ''
    }
  })
}

function openFailedLogPage() {
  router.push({
    path: '/acm/log',
    query: {
      day: '7',
      status: 'ERROR'
    }
  })
}

function handleFailedLogClick(row) {
  const query = {
    day: '7',
    status: 'ERROR'
  }

  if (row?.action) {
    query.action = row.action
  }

  if (row?.run_id) {
    query.runId = row.run_id
  }

  router.push({
    path: '/acm/log',
    query
  })
}

function handleSummaryCardClick(card) {
  if (card?.key === 'totalAssets' && card.clickable) {
    router.push({ path: '/acm/info' })
    return
  }
  if (card?.key === 'assetType' && card.clickable) {
    handleAssetTypeClick(topAssetType.value)
    return
  }
  if (card?.key === 'os' && card.clickable) {
    handleOsClick(topOs.value)
    return
  }
  if (card?.key === 'group' && card.clickable) {
    handleGroupClick(topGroup.value)
  }
}

async function loadAllData() {
  await Promise.all([
    loadAssetType(),
    loadOsDistribution(),
    loadNewAsset(),
    loadGroupAsset(),
    loadConnection(),
    loadExceptionPreview(),
    loadFailedLogPreview()
  ])
  refreshedAt.value = new Date()
}

onMounted(() => {
  loadAllData()
})
</script>

<style scoped lang="scss">
.asset-overview {
  --workbench-panel-bg: #ffffff;
  --workbench-panel-border: #e2e8f0;
  --workbench-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 20px -6px rgba(0, 0, 0, 0.07);
  --workbench-card-bg: #f8fafc;
  --workbench-card-border: #e2e8f0;
  --workbench-card-hover-border: rgba(13, 148, 136, 0.5);
  --workbench-card-hover-shadow: 0 8px 24px -6px rgba(13, 148, 136, 0.2);
  --workbench-muted-bg: #f1f5f9;
  --workbench-info: #3b82f6;
  --workbench-accent: #0d9488;
  --workbench-danger: #ef4444;
  --workbench-warning: #f59e0b;
  --workbench-success: #10b981;
  --workbench-violet: #8b5cf6;
  --asset-text-primary: var(--el-text-color-primary);
  --asset-text-secondary: var(--el-text-color-regular);
  --asset-text-muted: var(--el-text-color-secondary);
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  min-height: 100%;
  height: auto;
  padding: 16px;
  overflow: auto;
  background:
    radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.08), transparent 40%),
    radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08), transparent 40%),
    var(--el-bg-color-page);
}

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
}

.workbench-header__main {
  min-width: 0;
}

.workbench-header__title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.workbench-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.status-mini-list {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.status-mini {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.status-mini strong {
  color: var(--workbench-accent);
  font-size: 13px;
}

.status-mini--muted {
  background: transparent;
  box-shadow: none;
}

.status-mini--muted strong {
  color: var(--el-text-color-primary);
}

.refresh-button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 78px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--workbench-panel-border);
  border-radius: 999px;
  background: var(--workbench-panel-bg);
  color: var(--workbench-accent);
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}

.refresh-button:hover:not(:disabled) {
  border-color: var(--workbench-accent);
  background: var(--workbench-panel-bg);
  transform: translateY(-1px);
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.refresh-button.is-loading :deep(.el-icon) {
  animation: asset-spin 0.9s linear infinite;
}

.workbench-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.workbench-summary-grid .summary-card {
  --summary-accent: var(--workbench-info);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  min-height: 132px;
  padding: 16px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--workbench-panel-bg);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  box-shadow: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.4s ease both;
}

.workbench-summary-grid .summary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.workbench-summary-grid .summary-card::after {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: var(--summary-accent);
  opacity: 0.85;
  transition: height 0.2s ease;
}

.workbench-summary-grid .summary-card:hover:not(:disabled),
.workbench-summary-grid .summary-card.is-active {
  border-color: var(--workbench-card-hover-border);
  box-shadow: var(--workbench-card-hover-shadow);
  transform: translateY(-3px);
}

.workbench-summary-grid .summary-card:hover::before {
  opacity: 1;
}

.workbench-summary-grid .summary-card:hover::after,
.workbench-summary-grid .summary-card.is-active::after {
  height: 6px;
}

.workbench-summary-grid .summary-card:disabled {
  cursor: default;
}

.summary-card--blue {
  --summary-accent: var(--workbench-info);
}

.summary-card--cyan {
  --summary-accent: #0ea5e9;
}

.summary-card--green {
  --summary-accent: var(--workbench-success);
}

.summary-card--gold {
  --summary-accent: var(--workbench-warning);
}

.summary-card--violet {
  --summary-accent: var(--workbench-violet);
}

.summary-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.summary-card__label {
  color: var(--el-text-color-regular);
  font-size: 13px;
  font-weight: 600;
}

.summary-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  background: var(--workbench-muted-bg);
  color: var(--summary-accent);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.summary-card__body {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
}

.summary-card__value {
  color: var(--el-text-color-primary);
  font-size: clamp(32px, 2vw, 38px);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.summary-card--textual .summary-card__value {
  font-size: clamp(22px, 1.5vw, 30px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.summary-card__meta {
  color: var(--summary-accent);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  opacity: 0.82;
  text-align: left;
  overflow: hidden;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}

.summary-card__action {
  position: relative;
  z-index: 1;
  margin-top: auto;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  color: var(--summary-accent);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  opacity: 0.92;
}

.summary-card:disabled .summary-card__action {
  color: var(--el-text-color-secondary);
}

.workbench-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(340px, 1fr);
  gap: 12px;
  align-items: stretch;
}

.workbench-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 18px 20px;
  border: 1px solid var(--workbench-panel-border);
  border-radius: 20px;
  background: var(--workbench-panel-bg);
  backdrop-filter: blur(12px);
  box-shadow: var(--workbench-panel-shadow);
  animation: fadeInUp 0.5s ease both;
}

.workbench-panel--wide {
  min-height: 520px;
}

.workbench-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.workbench-panel__header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.workbench-panel__title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 17px;
  font-weight: 700;
}

.workbench-panel__pill {
  padding: 4px 12px;
  border: 1px solid var(--workbench-panel-border);
  border-radius: 20px;
  background: var(--workbench-muted-bg);
  color: var(--workbench-accent);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.analytics-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.analytics-tab {
  appearance: none;
  padding: 6px 12px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 20px;
  background: var(--workbench-muted-bg);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.analytics-tab:hover,
.analytics-tab.is-active {
  border-color: rgba(13, 148, 136, 0.32);
  background: rgba(13, 148, 136, 0.1);
  color: var(--workbench-accent);
}

.analytics-stage {
  flex: 1;
  min-height: 0;
}

.chart-frame {
  height: 100%;
  min-height: 420px;
  padding: 0;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--workbench-card-bg);
  box-shadow: none;
}

.chart-frame::before {
  display: none;
}

.chart-frame :deep(.chart-card) {
  height: 100%;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  box-shadow: none;
}

.chart-frame :deep(.chart-header) {
  margin-bottom: 10px;
}

.chart-frame :deep(.chart-container) {
  min-height: 340px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  --metric-accent: var(--workbench-info);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 12px 16px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--workbench-card-bg);
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--metric-accent);
  opacity: 0.75;
}

.metric-card:nth-child(2) {
  --metric-accent: var(--workbench-success);
}

.metric-card:nth-child(3) {
  --metric-accent: var(--workbench-warning);
}

.metric-card:nth-child(4) {
  --metric-accent: var(--workbench-violet);
}

.metric-card__label,
.signal-item__label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 600;
}

.metric-card__value {
  color: var(--el-text-color-primary);
  font-size: 22px;
  font-weight: 700;
}

.metric-card__meta,
.empty-state {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.insight-stream {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.signal-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.signal-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 12px;
  background: var(--workbench-card-bg);
}

.signal-item__dot {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.signal-item__label {
  flex: 1;
}

.signal-item__value {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signal-item--success .signal-item__dot {
  background: var(--workbench-success);
}

.signal-item--warning .signal-item__dot {
  background: var(--workbench-danger);
}

.signal-item--trend .signal-item__dot {
  background: var(--workbench-violet);
}

.signal-item--neutral .signal-item__dot {
  background: var(--workbench-warning);
}

.empty-state {
  padding: 14px 12px;
  border: 1px dashed var(--workbench-card-border);
  border-radius: 12px;
  background: var(--workbench-card-bg);
  text-align: center;
}

html.dark .asset-overview {
  --workbench-panel-bg: linear-gradient(180deg, rgba(20, 28, 40, 0.94), rgba(16, 23, 34, 0.9));
  --workbench-panel-border: rgba(71, 85, 105, 0.48);
  --workbench-panel-shadow: 0 22px 40px rgba(0, 0, 0, 0.26);
  --workbench-card-bg: rgba(15, 23, 42, 0.84);
  --workbench-card-border: rgba(71, 85, 105, 0.46);
  --workbench-card-hover-border: rgba(94, 234, 212, 0.36);
  --workbench-card-hover-shadow: 0 18px 30px rgba(0, 0, 0, 0.26);
  --workbench-muted-bg: rgba(30, 41, 59, 0.84);
  --workbench-info: #60a5fa;
  --workbench-accent: #5eead4;
  --workbench-danger: #f87171;
  --workbench-warning: #fbbf24;
  --workbench-success: #34d399;
  --workbench-violet: #a78bfa;
  background:
    radial-gradient(circle at top left, rgba(45, 212, 191, 0.16), transparent 24%),
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.12), transparent 24%),
    transparent;
}

html.dark .asset-overview .status-mini {
  border-color: rgba(71, 85, 105, 0.42);
  background: rgba(15, 23, 42, 0.74);
}

html.dark .asset-overview .status-mini--muted {
  background: transparent;
}

html.dark .asset-overview .summary-card--blue,
html.dark .asset-overview .summary-card--cyan,
html.dark .asset-overview .summary-card--violet {
  background: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(30, 41, 59, 0.84));
}

html.dark .asset-overview .summary-card--green {
  background: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(6, 95, 70, 0.48));
}

html.dark .asset-overview .summary-card--gold {
  background: linear-gradient(180deg, rgba(28, 24, 20, 0.92), rgba(120, 53, 15, 0.46));
}

html.dark .asset-overview .summary-card__badge,
html.dark .asset-overview .workbench-panel__pill {
  border-color: rgba(71, 85, 105, 0.42);
}

html.dark .asset-overview .chart-frame :deep(.chart-card),
html.dark .asset-overview .metric-card,
html.dark .asset-overview .signal-item,
html.dark .asset-overview .analytics-tab {
  background: var(--workbench-card-bg);
  border-color: var(--workbench-card-border);
}

@keyframes asset-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-card:nth-child(1) {
  animation-delay: 0s;
}

.summary-card:nth-child(2) {
  animation-delay: 0.05s;
}

.summary-card:nth-child(3) {
  animation-delay: 0.1s;
}

.summary-card:nth-child(4) {
  animation-delay: 0.15s;
}

.summary-card:nth-child(5) {
  animation-delay: 0.2s;
}

@media (max-width: 1080px) {
  .workbench-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workbench-header__actions {
    width: 100%;
    justify-content: space-between;
  }

  .workbench-main-grid {
    grid-template-columns: 1fr;
  }

  .workbench-panel--wide {
    min-height: 460px;
  }
}

@media (max-width: 768px) {
  .asset-overview {
    padding: 12px;
  }

  .workbench-header__actions,
  .status-mini-list,
  .workbench-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .status-mini-list,
  .workbench-header__actions {
    width: 100%;
  }

  .status-mini {
    width: 100%;
    justify-content: space-between;
  }

  .refresh-button {
    align-self: flex-end;
  }

  .analytics-tabs {
    justify-content: flex-start;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .signal-strip {
    grid-template-columns: 1fr;
  }

  .summary-card__meta {
    text-align: left;
  }
}
</style>
