<template>
  <div class="cve-detail">
    <div class="cve-detail-breadcrumb">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="goBack">Windows CVE 列表</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ cveId }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div v-if="loading" v-loading="loading" class="detail-section" style="height: 400px"></div>

    <div v-else-if="cveDetail" class="cve-content-wrapper">
      <el-tabs v-model="activeTab" class="ops-tabs">
        <el-tab-pane name="basic" label="基本信息">
          <div class="tab-scroll-box">
            <div class="modern-header mb-4">
              <div class="header-top">
                <h1 class="cve-title">{{ cveDetail.cveId }}</h1>
                <el-tag
                  :type="getSeverityType(cveDetail.severity)"
                  effect="dark"
                  :class="['severity-badge', getSeverityClass(cveDetail.severity)]"
                >
                  {{ getSeverityLabel(cveDetail.severity) }}
                </el-tag>
              </div>
              <div class="header-meta">
                <div class="meta-item">
                  <span class="label">发布时间:</span>
                  <span class="value">{{ formatDateTime(cveDetail.publicDate) }}</span>
                </div>
                <div class="meta-separator"></div>
                <div class="meta-item">
                  <span class="label">数据来源:</span>
                  <span class="value">Windows / MSRC</span>
                </div>
              </div>
            </div>

            <div class="modern-card mb-4">
              <div class="card-title">基础信息</div>
              <div class="details-grid two-col inline">
                <div class="detail-cell">
                  <span class="label">CVE 编号</span>
                  <div class="value">
                    <el-link
                      v-if="cveDetail.webUrl"
                      :href="cveDetail.webUrl"
                      target="_blank"
                      type="primary"
                      :underline="false"
                      class="cve-link"
                    >
                      {{ cveDetail.cveId }}
                      <el-icon class="ms-1"><TopRight /></el-icon>
                    </el-link>
                    <span v-else class="text-primary fw-bold">{{ cveDetail.cveId }}</span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">严重等级</span>
                  <div class="value">
                    <el-tag
                      :type="getSeverityType(cveDetail.severity)"
                      effect="dark"
                      size="small"
                      :class="['severity-badge', getSeverityClass(cveDetail.severity)]"
                    >
                      {{ getSeverityLabel(cveDetail.severity) }}
                    </el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">CVSS 评分</span>
                  <div class="value">
                    <span :class="cveDetail.cvss3Score ? 'text-danger fw-bold' : 'text-muted'">
                      {{ cveDetail.cvss3Score ? Number(cveDetail.cvss3Score).toFixed(1) : '-' }}
                    </span>
                    <span v-if="cveDetail.cvss3Vector" class="text-muted ms-2 code-font">
                      ({{ cveDetail.cvss3Vector }})
                    </span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">系统</span>
                  <div class="value">
                    <el-tag size="small" effect="plain">Windows</el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">发布日期</span>
                  <div class="value">{{ formatDateTime(cveDetail.publicDate) }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">文档 ID</span>
                  <div class="value code-font">{{ cveDetail.documentId || '-' }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">CWE 编号</span>
                  <div class="value code-font text-primary">{{ cveDetail.cwe || '-' }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">官方链接</span>
                  <div class="value">
                    <el-link
                      v-if="cveDetail.webUrl"
                      :href="cveDetail.webUrl"
                      target="_blank"
                      type="primary"
                      :underline="false"
                    >
                      查看详情
                      <el-icon class="ms-1"><TopRight /></el-icon>
                    </el-link>
                    <span v-else>-</span>
                  </div>
                </div>
                <div class="detail-cell wide">
                  <span class="label">漏洞标题</span>
                  <div class="value">{{ cveDetail.title || '-' }}</div>
                </div>
              </div>
            </div>

            <div class="modern-card mb-4">
              <div class="card-title">影响统计</div>
              <div class="impact-overview-content">
                <div class="chart-wrapper">
                  <div ref="impactChartRef" class="impact-chart"></div>
                </div>
                <div class="stats-wrapper">
                  <div
                    v-for="item in impactLegendItems"
                    :key="item.key"
                    class="modern-stat-block"
                    :class="'is-' + (item.type || 'default')"
                    @click="setProductFilter(item.filter)"
                  >
                    <div class="stat-header">
                      <div class="stat-label">{{ item.label }}</div>
                      <el-icon class="stat-icon" :class="'text-' + (item.type || 'default')">
                        <component :is="item.icon" />
                      </el-icon>
                    </div>
                    <div class="stat-number" :class="'text-' + (item.type || 'default')">
                      {{ item.value }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modern-card mb-4">
              <div class="card-title">漏洞描述</div>
              <div class="card-text description-text" v-html="renderedDescription"></div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="packages">
          <template #label>
            产品详情
            <span class="ops-tab-count" v-if="products.length">{{ products.length }}</span>
          </template>
          <div class="tab-content-container">
            <div class="ops-filter-bar compact packages-filter-bar">
              <el-radio-group v-model="productFilter" size="small">
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="affected">受影响</el-radio-button>
                <el-radio-button label="fixed">已修复</el-radio-button>
              </el-radio-group>
            </div>
            <div class="ops-table-wrapper" v-loading="productsLoading">
              <el-table :data="filteredProducts" max-height="calc(100vh - 240px)" style="width: 100%">
                <el-table-column
                  prop="productName"
                  label="产品名称"
                  min-width="220"
                  show-overflow-tooltip
                />
                <el-table-column prop="kbArticle" label="KB 编号" width="140">
                  <template #default="{ row }">
                    <el-link
                      v-if="row.kbArticle && row.kbUrl"
                      :href="row.kbUrl"
                      target="_blank"
                      type="primary"
                      :underline="false"
                    >
                      {{ row.kbArticle }}
                    </el-link>
                    <span v-else>{{ row.kbArticle || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="fixedBuild"
                  label="修复版本"
                  min-width="180"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <span v-if="row.fixedBuild" class="text-success">{{ row.fixedBuild }}</span>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
                <el-table-column label="系统" width="100">
                  <template #default>
                    <el-tag size="small" effect="plain">Windows</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="110">
                  <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)" size="small">
                      {{ getStatusLabel(row.statusLabel || row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div v-else class="detail-section error-container">
      <el-empty description="无法获取详细信息">
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'
import { TopRight, TrendCharts, Warning, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { winCveApi } from '../api'

const props = defineProps({
  cveId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['back'])

const loading = ref(true)
const productsLoading = ref(false)
const activeTab = ref('basic')
const productFilter = ref('all')
const cveDetail = ref(null)
const products = ref([])
const impactChartRef = ref(null)

const { isDark } = useTheme()

let impactChart = null

function normalizeSeverityKey(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (lower === 'critical' || raw === '严重' || raw === 'CRITICAL') return 'critical'
  if (lower === 'important' || raw === '重要' || raw === 'IMPORTANT') return 'important'
  if (lower === 'moderate' || raw === '中等' || raw === 'MODERATE') return 'moderate'
  if (lower === 'low' || raw === '低危' || raw === 'LOW') return 'low'
  return ''
}

function getSeverityType(severity) {
  const key = normalizeSeverityKey(severity)
  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }
  return typeMap[key] || 'info'
}

function getSeverityClass(severity) {
  const key = normalizeSeverityKey(severity)
  return key ? `is-${key}` : ''
}

function getSeverityLabel(severity) {
  const key = normalizeSeverityKey(severity)
  const labelMap = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return labelMap[key] || severity || '-'
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function normalizeStatusKey(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw === 'fixed' || raw === '已修复') return 'fixed'
  if (raw === 'affected' || raw === '受影响') return 'affected'
  return raw
}

function getStatusType(status) {
  const key = normalizeStatusKey(status)
  const typeMap = {
    fixed: 'success',
    affected: 'danger'
  }
  return typeMap[key] || 'info'
}

function getStatusLabel(status) {
  const key = normalizeStatusKey(status)
  const labelMap = {
    fixed: '已修复',
    affected: '受影响'
  }
  return labelMap[key] || status || '-'
}

function normalizeProduct(item, fallbackStatus = '') {
  const status = item?.status || fallbackStatus
  return {
    ...item,
    status,
    statusLabel: item?.statusLabel || getStatusLabel(status),
    source: 'windows'
  }
}

function flattenAffectedProducts(affectedProducts) {
  const list = []

  Object.entries(affectedProducts || {}).forEach(([group, items]) => {
    if (!Array.isArray(items)) return

    items.forEach(item => {
      list.push(normalizeProduct(item, group))
    })
  })

  return list
}

function normalizeDetail(detailResult) {
  const detailSummary = detailResult?.summary || {}
  return {
    ...detailResult,
    cveId: detailResult?.cveId || props.cveId,
    summary: {
      total: detailSummary.total ?? detailResult?.totalProducts ?? detailResult?.affectedCount ?? 0,
      fixed: detailSummary.fixed ?? detailResult?.fixedCount ?? 0,
      affected: detailSummary.affected ?? detailResult?.affectedCount ?? 0
    }
  }
}

function resolveProducts(result) {
  if (Array.isArray(result)) {
    return result.map(item => normalizeProduct(item))
  }

  if (Array.isArray(result?.products)) {
    return result.products.map(item => normalizeProduct(item))
  }

  if (Array.isArray(result?.items)) {
    return result.items.map(item => normalizeProduct(item))
  }

  return flattenAffectedProducts(result?.affectedProducts || result)
}

const filteredProducts = computed(() => {
  if (productFilter.value === 'all') {
    return products.value
  }

  return products.value.filter(item => normalizeStatusKey(item.status) === productFilter.value)
})

const summary = computed(() => {
  const detailSummary = cveDetail.value?.summary || {}
  const fixedFromProducts = products.value.filter(item => normalizeStatusKey(item.status) === 'fixed').length
  const affectedFromProducts = products.value.filter(item => normalizeStatusKey(item.status) === 'affected').length

  return {
    total: detailSummary.total || products.value.length,
    fixed: detailSummary.fixed ?? fixedFromProducts,
    affected: detailSummary.affected ?? affectedFromProducts
  }
})

const impactLegendItems = computed(() => [
  { key: 'all', label: '总计', value: summary.value.total, icon: TrendCharts, filter: 'all' },
  {
    key: 'affected',
    label: '受影响',
    value: summary.value.affected,
    icon: Warning,
    type: 'danger',
    filter: 'affected'
  },
  {
    key: 'fixed',
    label: '已修复',
    value: summary.value.fixed,
    icon: Check,
    type: 'success',
    filter: 'fixed'
  }
])

const renderedDescription = computed(() => renderDescriptionHtml(cveDetail.value?.description))

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeHtml(html) {
  if (!html) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')

  doc.body.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach(node => {
    node.remove()
  })

  doc.body.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value || ''

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name)
        return
      }

      if (['href', 'src', 'xlink:href'].includes(name) && /^\s*javascript:/i.test(value)) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return doc.body.innerHTML
}

function renderDescriptionHtml(description) {
  const content = String(description || '').trim()

  if (!content) {
    return '<p>暂无详细描述信息。</p>'
  }

  if (/<\/?[a-z][\s\S]*>/i.test(content)) {
    return sanitizeHtml(content)
  }

  return `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`
}

function disposeImpactChart() {
  if (impactChart) {
    impactChart.dispose()
    impactChart = null
  }
}

function handleChartResize() {
  if (impactChart) {
    impactChart.resize()
  }
}

function scheduleImpactChartRender() {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        initImpactChart()
      })
    })
  })
}

function initImpactChart() {
  if (!impactChartRef.value) return

  disposeImpactChart()
  impactChart = echarts.init(impactChartRef.value, isDark.value ? 'dark' : '')

  const total = summary.value.total || 0
  const chartData = []

  if (summary.value.affected > 0) {
    chartData.push({ value: summary.value.affected, name: '受影响', itemStyle: { color: '#F53F3F' } })
  }

  if (summary.value.fixed > 0) {
    chartData.push({ value: summary.value.fixed, name: '已修复', itemStyle: { color: '#67C23A' } })
  }

  if (chartData.length === 0) {
    chartData.push({
      value: 1,
      name: '暂无数据',
      itemStyle: { color: isDark.value ? '#4c4d4f' : '#ebeef5' }
    })
  }

  impactChart.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: params => {
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0
        return `${params.name}: ${params.value} (${percent}%)`
      }
    },
    graphic: [
      {
        type: 'group',
        left: 'center',
        top: '38%',
        children: [
          {
            type: 'text',
            style: {
              text: total.toString(),
              textAlign: 'center',
              fill: isDark.value ? '#e5eaf3' : '#212529',
              fontSize: 24,
              fontWeight: 'bold'
            },
            left: 'center',
            top: 0
          },
          {
            type: 'text',
            style: {
              text: '总计',
              textAlign: 'center',
              fill: isDark.value ? '#a3a6ad' : '#6c757d',
              fontSize: 12
            },
            left: 'center',
            top: 26
          }
        ]
      }
    ],
    series: [
      {
        type: 'pie',
        radius: ['55%', '85%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 5
        },
        data: chartData
      }
    ]
  })

  setTimeout(() => {
    if (impactChart) {
      impactChart.resize()
    }
  }, 50)
}

function setProductFilter(filter) {
  productFilter.value = filter
  activeTab.value = 'packages'
}

async function loadProductsFallback(detailResult) {
  productsLoading.value = true
  try {
    const affectedResult = await winCveApi.getAffectedProducts(props.cveId)
    const data = affectedResult?.data || affectedResult
    products.value = resolveProducts(data)
  } catch (error) {
    console.error('加载 Windows CVE 产品列表失败:', error)
    products.value = flattenAffectedProducts(detailResult?.affectedProducts)
  } finally {
    productsLoading.value = false
  }
}

async function loadDetail() {
  loading.value = true
  productFilter.value = 'all'
  activeTab.value = 'basic'
  cveDetail.value = null
  products.value = []
  disposeImpactChart()

  try {
    const response = await winCveApi.getCveDetail(props.cveId)
    const result = normalizeDetail(response?.data || response || {})
    cveDetail.value = result
    await loadProductsFallback(result)
    loading.value = false
    scheduleImpactChartRender()
  } catch (error) {
    console.error('加载 Windows CVE 详情失败:', error)
    ElMessage.error(error?.response?.data?.error || '加载详情失败')
    cveDetail.value = null
  } finally {
    if (loading.value) {
      loading.value = false
    }
  }
}

function goBack() {
  emit('back')
}

watch(
  () => props.cveId,
  value => {
    if (value) {
      loadDetail()
    }
  },
  { immediate: true }
)

watch(isDark, () => {
  if (cveDetail.value && activeTab.value === 'basic' && !loading.value) {
    scheduleImpactChartRender()
  }
})

watch(activeTab, value => {
  if (value === 'basic' && cveDetail.value && !loading.value) {
    scheduleImpactChartRender()
  }
})

onMounted(() => {
  window.addEventListener('resize', handleChartResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleChartResize)
  disposeImpactChart()
})
</script>

<style scoped lang="scss">
.cve-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color-page);
  overflow: hidden;
}

.cve-detail-breadcrumb {
  flex-shrink: 0;
  padding: 12px 20px;
  padding-top: 0;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  :deep(.el-breadcrumb) {
    font-size: 14px;

    .el-breadcrumb__item {
      .el-breadcrumb__inner {
        a {
          color: #409eff;
          font-weight: normal;
          cursor: pointer;

          &:hover {
            color: #66b1ff;
          }
        }
      }

      &:last-child .el-breadcrumb__inner {
        color: var(--el-text-color-regular);
        font-weight: 500;
      }
    }
  }
}

.cve-content-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ops-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: transparent;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
    background: var(--el-bg-color);
    padding: 0 16px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  :deep(.el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--el-bg-color);
    padding: 20px 24px;
    border-radius: 0 0 8px 8px;
    box-shadow: var(--el-box-shadow-light);
  }

  :deep(.el-tab-pane) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.tab-scroll-box {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-lighter);
    border-radius: 10px;
  }
}

.ops-tab-count {
  display: inline-block;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  padding: 0 6px;
  border-radius: 10px;
  height: 18px;
  line-height: 18px;
  margin-left: 4px;
}

.modern-header {
  margin-top: 4px;

  .header-top {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;

    .cve-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      margin: 0;
      line-height: 1.2;
    }
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 24px;

    .meta-item {
      display: flex;
      align-items: center;
      font-size: 14px;

      .label {
        color: var(--el-text-color-regular);
        margin-right: 8px;
        font-weight: 400;
      }

      .value {
        color: var(--el-text-color-primary);
        font-weight: 500;
      }
    }

    .meta-separator {
      width: 1px;
      height: 14px;
      background: var(--el-border-color-lighter);
      display: none;
    }
  }
}

.modern-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 24px;
  box-shadow: var(--el-box-shadow-light);

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 20px;
    letter-spacing: -0.2px;
  }
}

.impact-overview-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 8px;
}

.impact-chart {
  width: 190px;
  height: 190px;
}

.stats-wrapper {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  align-content: flex-start;
}

.modern-stat-block {
  width: 100%;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 72px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);

  &:hover {
    background: var(--el-bg-color);
    box-shadow: var(--el-box-shadow);
    transform: translateY(-2px);
    border-color: var(--el-border-color);
  }

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--el-border-color-lighter);
    transition: background-color 0.3s;
  }

  &.is-danger::before {
    background-color: #f53f3f;
  }

  &.is-success::before {
    background-color: #00b42a;
  }

  &.is-warning::before {
    background-color: #ff7d00;
  }

  &.is-primary::before {
    background-color: #165dff;
  }

  &.is-info::before {
    background-color: #909399;
  }

  &.is-default::before {
    background-color: #c0c4cc;
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .stat-icon {
    font-size: 14px;
    opacity: 0.8;
  }

  .stat-label {
    font-size: 12px;
    color: var(--el-text-color-regular);
    font-weight: 500;
  }

  .stat-number {
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
    font-family: 'Inter', sans-serif;
  }

  .text-danger {
    color: #f53f3f;
  }

  .text-success {
    color: #00b42a;
  }

  .text-warning {
    color: #ff7d00;
  }

  .text-primary {
    color: #165dff;
  }

  .text-default,
  .text-info {
    color: var(--el-text-color-primary);
  }
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 20px;
  row-gap: 16px;

  &.two-col {
    grid-template-columns: repeat(2, 1fr);
  }

  &.inline {
    .detail-cell {
      flex-direction: row;
      align-items: center;
      gap: 10px;

      .label {
        width: 90px;
        margin-bottom: 0;
      }

      .value {
        flex: 1;
      }
    }
  }

  .detail-cell {
    display: flex;
    flex-direction: column;

    &.wide {
      grid-column: span 2;
    }

    label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
      font-weight: 400;
    }

    .label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 6px;
      font-weight: 400;
    }

    .value {
      font-size: 15px;
      color: var(--el-text-color-primary);
      font-weight: 500;
      min-height: 22px;

      &.code-font {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
      }

      .code-font {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
      }

      &.fw-bold {
        font-weight: 600;
      }
    }
  }
}

.card-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
}

.description-text {
  white-space: normal;
  word-break: break-word;

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 12px 20px;
    padding: 0;
  }

  :deep(li + li) {
    margin-top: 6px;
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;
  }

  :deep(a:hover) {
    text-decoration: underline;
  }
}

@media (max-width: 1200px) {
  .stats-wrapper {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .impact-overview-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-wrapper {
    width: 100%;
    grid-template-columns: repeat(2, 1fr);
  }

  .details-grid {
    grid-template-columns: repeat(2, 1fr);

    .detail-cell.wide {
      grid-column: span 2;
    }
  }
}

.compact {
  margin-bottom: 8px;
}

.packages-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
}
</style>
