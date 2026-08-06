<template>
  <div class="ops-page-layout ops-page-layout--page-scroll win-kb-page">
    <WindowsKbDetail
      v-if="currentView === 'detail'"
      :kb-number="selectedKbNumber"
      @back="backToList"
    />

    <template v-else>
      <div class="win-kb-dashboard" v-loading="statisticsLoading">
        <!-- 卡片1：KB 知识库总览 -->
        <div class="stat-card win-kb-overview-card">
          <div class="compact-card-header">
            <div class="card-title">Windows KB 知识库</div>
            <button
              type="button"
              class="win-kb-total-badge"
              title="查看全部 KB"
              @click="filterBySeverity('all')"
            >
              <strong>{{ formatNumber(statistics.totalKbs) }}</strong>
              <span>KB 总数</span>
            </button>
          </div>
          <div class="card-subtitle">
            来自 Microsoft Update Catalog 的全局 KB 数据，结合租户扫描结果。
          </div>
          <div class="win-kb-severity-bars">
            <button
              v-for="item in clickableSeverityStats"
              :key="item.key"
              type="button"
              class="severity-bar"
              :class="`is-${item.key}`"
              :title="`${item.label}: ${formatNumber(item.count)} KB, ${item.percent}%`"
              @click="filterBySeverity(item.value)"
            >
              <div class="severity-bar__meta">
                <span class="severity-bar__label">
                  <i class="severity-dot" />
                  {{ item.label }}
                </span>
                <span class="severity-bar__value">
                  <strong>{{ formatNumber(item.count) }}</strong>
                  <em>{{ item.percent }}%</em>
                </span>
              </div>
              <div class="severity-bar__track" aria-hidden="true">
                <span class="severity-bar__fill" :style="{ width: item.barWidth }" />
              </div>
            </button>
          </div>
        </div>

        <!-- 卡片2：未指定等级 -->
        <div class="stat-card win-kb-unspecified-card">
          <div class="compact-card-header">
            <div class="card-title">未指定等级</div>
            <div class="card-subtitle">仅展示统计</div>
          </div>
          <div class="win-kb-metric">
            <div class="metric-number">{{ formatNumber(unspecifiedCount) }}</div>
            <div class="metric-label">个</div>
          </div>
          <div class="metric-hint">
            <i class="el-icon"><InfoFilled /></i>
            等级未由 Microsoft 指定
          </div>
        </div>

        <!-- 卡片3：修复状态 -->
        <div class="stat-card win-kb-repair-card">
          <div class="compact-card-header">
            <div class="card-title">修复状态</div>
            <div class="card-subtitle">当前租户统计</div>
          </div>
          <div class="win-kb-repair-items">
            <div class="repair-item is-repaired">
              <div class="repair-header">
                <span class="repair-label">已修补</span>
                <span class="repair-value">
                  {{ formatNumber(statistics.repairedKbCount) }} 个 KB
                </span>
              </div>
            </div>
            <div class="repair-item is-missing">
              <div class="repair-header">
                <span class="repair-label">待修复</span>
                <span class="repair-value">
                  {{ formatNumber(statistics.missingKbCount) }} 个 KB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ops-filter-bar">
        <el-form :model="searchParams" inline>
          <el-form-item label="关键字">
            <el-input
              v-model="searchParams.keyword"
              placeholder="输入漏洞编号 / KB 号 / 标题"
              clearable
              style="width: 220px"
              @keyup.enter="search"
            @clear="search" />
          </el-form-item>
          <el-form-item label="严重等级">
            <el-select v-model="searchParams.severity" style="width: 120px" @change="search">
              <el-option value="all" label="全部" />
              <el-option value="Critical" label="严重" />
              <el-option value="Important" label="重要" />
              <el-option value="Moderate" label="中等" />
              <el-option value="Low" label="低危" />
            </el-select>
          </el-form-item>
          <el-form-item label="发布日期">
            <el-date-picker
              v-model="searchParams.startDate"
              type="date"
              placeholder="开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="search"
            />
            <span class="mx-1 text-muted">-</span>
            <el-date-picker
              v-model="searchParams.endDate"
              type="date"
              placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 150px"
              @change="search"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="search">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetFilters">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="ops-action-bar">
        <span class="win-kb-page__hint">列表按发布日期倒序展示，最新补丁在前。</span>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          title="刷新"
          @click="loadData"
        >
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>

      <div class="ops-table-wrapper" v-loading="loading">
        <el-table :data="kbList" class="natural-height-table" style="width: 100%">
          <el-table-column prop="kbNumber" label="KB 编号" width="140">
            <template #default="{ row }">
              <el-link type="primary" underline="never" @click="viewDetail(row)">
                {{ row.kbNumber }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="严重等级" width="110">
            <template #default="{ row }">
              <el-tag
                :type="getSeverityType(row.msrcSeverity)"
                :class="['severity-tag', getSeverityClass(row.msrcSeverity)]"
                size="small"
              >
                {{ getSeverityLabel(row.msrcSeverity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
          <el-table-column prop="classification" label="分类" width="150" show-overflow-tooltip />
          <el-table-column prop="products" label="产品" min-width="180" show-overflow-tooltip />
          <el-table-column label="关联漏洞" min-width="220">
            <template #default="{ row }">
              <CveLinkList
                :cves="resolveCveIds(row)"
                :url-resolver="getWinCveUrl"
                dialog-title="关联漏洞"
              />
            </template>
          </el-table-column>
          <el-table-column label="最高 CVSS" width="110" align="center">
            <template #default="{ row }">
              {{ row.maxCvss3Score ? Number(row.maxCvss3Score).toFixed(1) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="大小" width="110">
            <template #default="{ row }">{{ formatBytes(row.sizeBytes) }}</template>
          </el-table-column>
          <el-table-column label="发布日期" width="110">
            <template #default="{ row }">{{ formatDate(row.publishDate) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="displayPage"
          v-model:page-size="searchParams.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.totalElements"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { InfoFilled, Refresh, RefreshRight, Search } from '@element-plus/icons-vue'
import { winKbApi } from '../../api'
import { formatNumber, getSeverityLabel } from '../utils'
import CveLinkList from '../../components/common/CveLinkList.vue'
import WindowsKbDetail from '../components/kb/WindowsKbDetail.vue'

const route = useRoute()
const router = useRouter()

const currentView = ref('list')
const selectedKbNumber = ref('')
const kbList = ref([])
const loading = ref(false)
const statisticsLoading = ref(false)

const statistics = reactive({
  totalKbs: 0,
  bySeverity: {},
  repairedKbCount: 0,
  missingKbCount: 0
})

const searchParams = reactive({
  severity: 'all',
  keyword: '',
  startDate: '',
  endDate: '',
  page: 0,
  size: 20
})

const pagination = reactive({
  totalElements: 0,
  totalPages: 0,
  currentPage: 0
})

const displayPage = computed({
  get: () => searchParams.page + 1,
  set: value => {
    searchParams.page = value - 1
  }
})

const severityStats = computed(() => [
  {
    key: 'critical',
    value: 'Critical',
    label: '严重',
    count: getSeverityCount('Critical', '严重'),
    clickable: true
  },
  {
    key: 'important',
    value: 'Important',
    label: '重要',
    count: getSeverityCount('Important', '重要'),
    clickable: true
  },
  {
    key: 'moderate',
    value: 'Moderate',
    label: '中等',
    count: getSeverityCount('Moderate', '中等'),
    clickable: true
  },
  {
    key: 'low',
    value: 'Low',
    label: '低危',
    count: getSeverityCount('Low', '低危'),
    clickable: true
  },
  {
    key: 'unspecified',
    value: '',
    label: '未指定',
    count: getSeverityCount('Unspecified', '未指定'),
    clickable: false
  }
])

const severityBarTotal = computed(() =>
  severityStats.value
    .filter(item => item.clickable)
    .reduce((sum, item) => sum + Number(item.count || 0), 0)
)

const clickableSeverityStats = computed(() =>
  severityStats.value
    .filter(item => item.clickable)
    .map(item => {
      const percent = severityBarTotal.value
        ? Number(((Number(item.count || 0) / severityBarTotal.value) * 100).toFixed(1))
        : 0

      return {
        ...item,
        percent,
        barWidth: item.count > 0 ? `${Math.max(percent, 2)}%` : '0%'
      }
    })
)

const unspecifiedCount = computed(() => getSeverityCount('Unspecified', '未指定'))

function getSeverityCount(enKey, zhKey) {
  const bySeverity = statistics.bySeverity || {}
  return Number(bySeverity[enKey] ?? bySeverity[zhKey] ?? 0)
}

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

function getSeverityClass(severity) {
  const key = normalizeSeverityKey(severity)
  return key ? `is-${key}` : ''
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

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function formatBytes(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return '-'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let current = size
  let index = 0

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index += 1
  }

  return `${current.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function resolveCveIds(row) {
  const raw = row?.cveIds || row?.cve_ids || ''
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean)
  }

  return String(raw)
    .split(/[,，;\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function getWinCveUrl(cveId) {
  const id = String(cveId || '').trim()
  return id ? `https://msrc.microsoft.com/update-guide/vulnerability/${encodeURIComponent(id)}` : ''
}

function applyStatistics(data = {}) {
  statistics.totalKbs = Number(data.totalKbs ?? 0)
  statistics.bySeverity = data.bySeverity || {}
  statistics.repairedKbCount = Number(data.repairedKbCount ?? 0)
  statistics.missingKbCount = Number(data.missingKbCount ?? 0)
}

async function loadStatistics() {
  statisticsLoading.value = true
  try {
    const response = await winKbApi.getStatistics()
    applyStatistics(response?.data || response || {})
  } catch (error) {
    console.error('Failed to load Windows KB statistics:', error)
    applyStatistics()
  } finally {
    statisticsLoading.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    const response = await winKbApi.getKbList(searchParams)
    const result = response?.data || response || {}

    kbList.value = Array.isArray(result.content) ? result.content : []
    pagination.totalElements = Number(result.totalElements ?? 0)
    pagination.totalPages = Number(result.totalPages ?? 0)
    pagination.currentPage = Number(result.number ?? 0)
  } catch (error) {
    console.error('Failed to load Windows KB list:', error)
    ElMessage.error('查询 KB 知识库失败，请稍后重试')
    kbList.value = []
    pagination.totalElements = 0
  } finally {
    loading.value = false
  }
}

function search() {
  searchParams.page = 0
  loadData()
}

function resetFilters() {
  searchParams.severity = 'all'
  searchParams.keyword = ''
  searchParams.startDate = ''
  searchParams.endDate = ''
  searchParams.page = 0
  loadData()
}

function filterBySeverity(severity) {
  if (!severity) return
  searchParams.severity = severity
  search()
}

function handleSizeChange(size) {
  searchParams.size = size
  searchParams.page = 0
  loadData()
}

function handlePageChange(page) {
  searchParams.page = page - 1
  loadData()
}

function viewDetail(row) {
  viewDetailByKbNumber(row?.kbNumber)
}

function viewDetailByKbNumber(value) {
  const kbNumber = String(value || '').trim()
  if (!kbNumber) return

  selectedKbNumber.value = kbNumber
  currentView.value = 'detail'
  router.replace({
    query: {
      ...route.query,
      view: 'detail',
      kbNumber
    }
  })
}

function backToList() {
  currentView.value = 'list'
  selectedKbNumber.value = ''
  const nextQuery = { ...route.query }
  delete nextQuery.view
  delete nextQuery.kbNumber
  router.replace({ query: nextQuery })
}

onMounted(() => {
  loadStatistics()
  loadData()
})

watch(
  () => route.query,
  query => {
    if (query.view === 'detail' && query.kbNumber) {
      selectedKbNumber.value = String(query.kbNumber)
      currentView.value = 'detail'
      return
    }

    currentView.value = 'list'
    selectedKbNumber.value = ''
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.win-kb-page {
  gap: 12px;
}

// ── 3-card dashboard (aligned with LinuxPatchScanPage stats-dashboard) ──
.win-kb-dashboard {
  display: grid;
  grid-template-columns: minmax(420px, 1.45fr) minmax(200px, 0.65fr) minmax(260px, 0.9fr);
  gap: 10px;
  margin-bottom: 10px;
  padding-top: 2px;
  flex-shrink: 0;
}

.stat-card {
  background: var(--el-bg-color);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  min-height: 96px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border: 1px solid var(--el-border-color-lighter);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--el-border-color);
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.compact-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.card-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  margin-bottom: 8px;
}

// ── Card 1: KB Overview ──
.win-kb-total-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 16px;
  background: var(--el-color-primary-light-9);
  cursor: pointer;
  font: inherit;
  transition:
    background-color 0.18s,
    transform 0.18s,
    box-shadow 0.18s;

  strong {
    font-size: 18px;
    color: var(--el-color-primary);
    line-height: 1;
  }

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &:hover {
    transform: translateY(-1px);
    background: var(--el-color-primary-light-8);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
  }
}

.win-kb-severity-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: auto;
}

.severity-bar {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color 0.18s,
    border-color 0.18s,
    transform 0.18s,
    box-shadow 0.18s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.severity-bar__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.severity-bar__label,
.severity-bar__value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.severity-bar__label {
  min-width: 0;
  font-weight: 500;
  white-space: nowrap;
}

.severity-bar__value {
  flex-shrink: 0;

  strong {
    font-size: 13px;
    line-height: 1;
  }

  em {
    color: var(--el-text-color-secondary);
    font-style: normal;
    font-size: 11px;
  }
}

.severity-bar__track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-fill-color);
}

.severity-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.24s ease;
}

.severity-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.severity-bar.is-critical {
  .severity-dot {
    background: #f53f3f;
  }

  .severity-bar__fill {
    background: #f53f3f;
  }

  &:hover {
    background: rgba(245, 63, 63, 0.08);
    border-color: rgba(245, 63, 63, 0.26);
  }
}

.severity-bar.is-important {
  .severity-dot {
    background: #ff7d00;
  }

  .severity-bar__fill {
    background: #ff7d00;
  }

  &:hover {
    background: rgba(255, 125, 0, 0.08);
    border-color: rgba(255, 125, 0, 0.26);
  }
}

.severity-bar.is-moderate {
  .severity-dot {
    background: #ffc72e;
  }

  .severity-bar__fill {
    background: #ffc72e;
  }

  &:hover {
    background: rgba(255, 199, 46, 0.1);
    border-color: rgba(255, 199, 46, 0.3);
  }
}

.severity-bar.is-low {
  .severity-dot {
    background: var(--el-color-primary);
  }

  .severity-bar__fill {
    background: var(--el-color-primary);
  }

  &:hover {
    background: rgba(64, 158, 255, 0.08);
    border-color: rgba(64, 158, 255, 0.26);
  }
}

// ── Card 2: Unspecified ──
.win-kb-unspecified-card {
  position: relative;
  overflow: hidden;
}

.win-kb-metric {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.metric-number {
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-secondary);
  line-height: 1;
}

.metric-label {
  font-size: 12px;
  color: var(--el-text-color-primary);
}

.metric-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;

  .el-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

// ── Card 3: Repair Status ──
.win-kb-repair-card {
  .win-kb-repair-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    justify-content: center;
  }
}

.repair-item {
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);

  .repair-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    gap: 8px;
  }

  .repair-value {
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }
}

.repair-item.is-repaired .repair-label {
  color: var(--el-color-success);
  font-weight: 500;
}

.repair-item.is-missing .repair-label {
  color: #f53f3f;
  font-weight: 500;
}

// ── Hint text ──
.win-kb-page__hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

// ── Responsive ──
@media (max-width: 1280px) {
  .win-kb-dashboard {
    grid-template-columns: 1fr;
  }
}
</style>
