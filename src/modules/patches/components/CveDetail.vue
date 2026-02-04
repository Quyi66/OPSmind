<template>
  <div class="cve-detail">
    <!-- 顶部面包屑：导航入口 -->
    <div class="cve-detail-breadcrumb">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>
          <a @click.prevent="goBack">CVE 漏洞列表</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>{{ cveId }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" v-loading="loading" class="detail-section" style="height: 400px"></div>

    <!-- 详情内容 -->
    <div v-else-if="cveDetail" class="cve-content-wrapper">
      <el-tabs v-model="activeTab" class="ops-tabs">
        <el-tab-pane name="basic" label="基本信息">
          <div class="tab-scroll-box">
            <!-- 头部信息 -->
            <div class="modern-header mb-4">
              <div class="header-top">
                <h1 class="cve-title">{{ cveId }}</h1>
                <el-tag
                  :type="getSeverityType(cveDetail.severity)"
                  effect="dark"
                  :class="['severity-badge', 'is-' + (cveDetail.severity || '').toLowerCase()]"
                >
                  {{ cveDetail.severityLabel || getSeverityLabel(cveDetail.severity) }}
                </el-tag>
              </div>
              <div class="header-meta">
                <div class="meta-item">
                  <span class="label">发布时间:</span>
                  <span class="value">{{ formatDateTime(cveDetail.publicDate) }}</span>
                </div>
                <div class="meta-separator"></div>
                <div class="meta-item data-source-item" v-if="sources.length > 0">
                  <span class="label">数据来源:</span>
                  <el-radio-group
                    v-model="currentSourceId"
                    size="small"
                    @change="selectSource"
                    class="source-radio-group"
                  >
                    <el-radio-button
                      v-for="source in sources"
                      :key="source.source"
                      :label="source.source"
                    >
                      {{ getSourceLabel(source.source) }}
                    </el-radio-button>
                  </el-radio-group>
                </div>
              </div>
            </div>

            <!-- 详细信息卡片 -->
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
                      {{ cveDetail.cveId || cveId }}
                      <el-icon class="ms-1"><TopRight /></el-icon>
                    </el-link>
                    <span v-else class="text-primary fw-bold">{{ cveDetail.cveId || cveId }}</span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">严重等级</span>
                  <div class="value">
                    <el-tag
                      :type="getSeverityType(cveDetail.severity)"
                      effect="dark"
                      size="small"
                      :class="['severity-badge', 'is-' + (cveDetail.severity || '').toLowerCase()]"
                    >
                      {{ cveDetail.severityLabel || getSeverityLabel(cveDetail.severity) }}
                    </el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">CVSS 评分</span>
                  <div class="value">
                    <span :class="cveDetail.cvss3Score ? 'text-danger fw-bold' : 'text-muted'">
                      {{ cveDetail.cvss3Score ? cveDetail.cvss3Score.toFixed(1) : '-' }}
                    </span>
                    <span v-if="cveDetail.cvssVector" class="text-muted ms-2 code-font">
                      ({{ cveDetail.cvssVector }})
                    </span>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">系统</span>
                  <div class="value">
                    <el-tag size="small" effect="plain">
                      {{ getSourceLabel(cveDetail.source) }}
                    </el-tag>
                  </div>
                </div>
                <div class="detail-cell">
                  <span class="label">发布日期</span>
                  <div class="value">{{ formatDateTime(cveDetail.publicDate) }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">修改日期</span>
                  <div class="value">{{ formatDateTime(cveDetail.modifiedDate) }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">CWE 编号</span>
                  <div class="value code-font text-primary">{{ cveDetail.cweId || '-' }}</div>
                </div>
                <div class="detail-cell">
                  <span class="label">公告编号</span>
                  <div class="value code-font">{{ cveDetail.advisoryId || '-' }}</div>
                </div>
              </div>
            </div>

            <!-- 影响统计卡片 -->
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
                    @click="setPackageFilter(item.key)"
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

            <!-- 描述信息卡片 -->
            <div class="modern-card mb-4">
              <div class="card-title">漏洞描述</div>
              <div class="card-text description-text">
                {{ cveDetail.description || '暂无详细描述信息。' }}
              </div>
            </div>

            <div class="modern-card mb-4" v-if="cveDetail.mitigation">
              <div class="card-title">缓解措施</div>
              <div class="card-text mitigation-text">
                {{ cveDetail.mitigation }}
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="packages">
          <template #label>
            软件包详情
            <span class="ops-tab-count" v-if="allPackages.length">{{ allPackages.length }}</span>
          </template>
          <div class="tab-content-container">
            <div class="ops-filter-bar compact">
              <el-radio-group v-model="packageFilter" size="small">
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="affected">受影响</el-radio-button>
                <el-radio-button label="fix_deferred">延迟修复</el-radio-button>
                <el-radio-button label="fixed">已修复</el-radio-button>
                <el-radio-button label="not_affected">不受影响</el-radio-button>
                <el-radio-button label="will_not_fix">不修复</el-radio-button>
              </el-radio-group>
            </div>
            <div class="ops-table-wrapper">
              <el-table
                :data="filteredPackages"
                max-height="calc(100vh - 240px)"
                style="width: 100%"
              >
                <el-table-column
                  prop="productName"
                  label="产品名称"
                  min-width="160"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="packageName"
                  label="软件包名称"
                  min-width="200"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <el-icon class="text-muted me-1"><Box /></el-icon>
                    {{ row.packageName }}
                  </template>
                </el-table-column>
                <el-table-column prop="architecture" label="架构" width="100" />
                <el-table-column prop="normalizedStatus" label="状态" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getStatusType(row.normalizedStatus)" size="small">
                      {{ getStatusLabel(row.normalizedStatus) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="fixedVersion"
                  label="修复版本"
                  min-width="150"
                  show-overflow-tooltip
                >
                  <template #default="{ row }">
                    <span v-if="row.fixedVersion" class="text-success">{{ row.fixedVersion }}</span>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="source" label="系统" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" effect="plain" :type="getSourceType(row.source)">
                      {{ getSourceLabel(row.source) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="hosts">
          <template #label>
            受影响机器
            <span class="ops-tab-count" v-if="affectedHostsTotal">{{ affectedHostsTotal }}</span>
          </template>
          <div class="tab-content-container">
            <div class="ops-table-wrapper" v-loading="affectedHostsLoading">
              <el-table :data="affectedHosts" height="100%" stripe style="width: 100%">
                <el-table-column prop="hostKey" label="主机标识" min-width="150">
                  <template #default="{ row }">
                    <a href="javascript:void(0)" class="host-link" @click="viewHostDetail(row)">
                      {{ row.hostKey || row.hostId || '-' }}
                    </a>
                  </template>
                </el-table-column>
                <el-table-column prop="osDistro" label="系统发行版" min-width="140">
                  <template #default="{ row }">
                    <el-tag size="small" effect="plain" :type="getSourceType(row.osDistro)">
                      {{ getSourceLabel(row.osDistro) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="osVersion" label="系统版本" min-width="120" />
                <el-table-column
                  prop="patchId"
                  label="补丁ID"
                  min-width="140"
                  show-overflow-tooltip
                />
                <el-table-column
                  prop="affectedPkgs"
                  label="受影响包"
                  min-width="180"
                  show-overflow-tooltip
                />
                <el-table-column prop="severity" label="严重等级" width="110">
                  <template #default="{ row }">
                    <el-tag
                      effect="dark"
                      size="small"
                      :class="['severity-tag', 'is-' + getHostSeverityType(row.severity)]"
                    >
                      {{ row.severity || '-' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="patchStatus" label="补丁状态" width="120">
                  <template #default="{ row }">
                    <el-tag
                      size="small"
                      effect="light"
                      :class="['patch-status-tag', 'status-' + getPatchStatusType(row.patchStatus)]"
                    >
                      {{ row.patchStatus || '-' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="scanDate" label="扫描时间" min-width="180">
                  <template #default="{ row }">
                    <span class="text-muted">{{ formatDateTime(row.scanDate) }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 错误状态 -->
    <div v-else class="detail-section error-container">
      <el-empty description="无法获取详细信息">
        <el-button type="primary" @click="goBack">返回列表</el-button>
      </el-empty>
    </div>

    <LinuxHostDetail
      v-model="hostDetailVisible"
      :host-info="selectedHostInfo"
      @fix-patches="handleFixPatchesFromDetail"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import {
  TopRight,
  Box,
  TrendCharts,
  Warning,
  Clock,
  Check,
  Operation,
  CircleClose,
  RefreshLeft
} from '@element-plus/icons-vue'
import { cveApi } from '../api'
import { ElMessage } from 'element-plus'
import LinuxHostDetail from './LinuxHostDetail.vue'

// Props
const props = defineProps({
  cveId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['back'])

// 状态标签和样式
const statusLabels = {
  fixed: '已修复',
  affected: '受影响',
  not_affected: '不受影响',
  will_not_fix: '不修复',
  fix_deferred: '延迟修复',
  out_of_support: '超出支持'
}

const statusTypes = {
  fixed: 'success',
  affected: 'danger',
  not_affected: '',
  will_not_fix: 'warning',
  fix_deferred: 'info',
  out_of_support: ''
}

// 数据
const cveDetail = ref(null)
const sources = ref([])
const currentSourceId = ref('')
const currentSource = ref(null)
const allPackages = ref([])
const loading = ref(true)
const activeTab = ref('basic')
const packageFilter = ref('all')
const affectedHosts = ref([])
const affectedHostsTotal = ref(0)
const affectedHostsLoading = ref(false)
const affectedHostsLoaded = ref(false)
const affectedHostsError = ref('')
const hostDetailVisible = ref(false)
const selectedHostInfo = ref({})

// 图表引用
const impactChartRef = ref(null)
let impactChart = null

// 计算属性：过滤后的软件包
const filteredPackages = computed(() => {
  if (packageFilter.value === 'all') {
    return allPackages.value
  }
  return allPackages.value.filter(pkg => pkg.normalizedStatus === packageFilter.value)
})

// 计算属性：影响统计图例项
const impactLegendItems = computed(() => {
  const s = cveDetail.value?.summary || {}
  return [
    { key: 'all', label: '总计', value: s.total || 0, icon: TrendCharts, type: '' },
    { key: 'affected', label: '受影响', value: s.affected || 0, icon: Warning, type: 'danger' },
    {
      key: 'fix_deferred',
      label: '延迟修复',
      value: s.fixDeferred || 0,
      icon: Clock,
      type: 'primary'
    },
    { key: 'fixed', label: '已修复', value: s.fixed || 0, icon: Check, type: 'success' },
    {
      key: 'not_affected',
      label: '不受影响',
      value: s.notAffected || 0,
      icon: Operation,
      type: 'info'
    },
    {
      key: 'will_not_fix',
      label: '不修复',
      value: s.willNotFix || 0,
      icon: CircleClose,
      type: 'warning'
    },
    {
      key: 'out_of_support',
      label: '超出支持',
      value: s.outOfSupport || 0,
      icon: RefreshLeft,
      type: ''
    }
  ]
})

// 格式化日期 (短格式)
function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 格式化日期 (含时间)
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

// 获取严重等级样式
function getSeverityType(severity) {
  const typeMap = {
    critical: '',
    important: '',
    moderate: '',
    low: ''
  }
  return typeMap[severity] || ''
}

// 获取严重等级标签
function getSeverityLabel(severity) {
  const labelMap = {
    critical: '严重',
    important: '高危',
    moderate: '中危',
    low: '低危'
  }
  return labelMap[severity] || severity
}

// 获取状态标签
function getStatusLabel(status) {
  return statusLabels[status] || status
}

// 获取状态样式
function getStatusType(status) {
  return statusTypes[status] || 'info'
}

// 获取数据源标签
function getSourceLabel(source) {
  const labelMap = {
    redhat: 'Red Hat',
    kylin: '麒麟',
    kylinos: '麒麟'
  }
  return labelMap[source] || source
}

//获取数据源样式
function getSourceType(source) {
  const typeMap = {
    redhat: 'danger',
    kylin: 'primary',
    kylinos: 'primary'
  }
  return typeMap[source] || 'info'
}

function getHostSeverityType(severity) {
  const s = (severity || '').toString().toLowerCase()
  if (s.includes('critical') || s.includes('严重')) return 'critical'
  if (s.includes('important') || s.includes('高危')) return 'important'
  if (s.includes('moderate') || s.includes('中')) return 'moderate'
  if (s.includes('low') || s.includes('低')) return 'low'
  return ''
}

function getPatchStatusType(status) {
  const s = (status || '').toString()
  // 映射中文状态到英文 key，用于 CSS 类名
  if (['未修复', 'UNFIXED'].includes(s)) return 'unfixed'
  if (['已修复', 'FIXED', '已修复(手动)'].includes(s)) return 'fixed'
  if (['修复中', 'FIXING'].includes(s)) return 'fixing'
  if (['修复失败', 'FIX_FAILED'].includes(s)) return 'failed'
  if (['回滚中', 'ROLLING_BACK'].includes(s)) return 'fixing' // 复用 processing 颜色
  if (['回滚失败', 'ROLLBACK_FAILED'].includes(s)) return 'failed'
  if (['回滚成功', 'ROLLBACK_SUCCESS'].includes(s)) return 'fixed'
  return 'default'
}

// 状态标准化
function normalizeStatusKey(status) {
  if (!status) return ''
  const s = (status + '').toLowerCase().trim()
  const statusMap = {
    affected: 'affected',
    fixed: 'fixed',
    not_affected: 'not_affected',
    notaffected: 'not_affected',
    'not affected': 'not_affected',
    will_not_fix: 'will_not_fix',
    willnotfix: 'will_not_fix',
    'will not fix': 'will_not_fix',
    wontfix: 'will_not_fix',
    fix_deferred: 'fix_deferred',
    fixdeferred: 'fix_deferred',
    deferred: 'fix_deferred',
    under_investigation: 'fix_deferred',
    out_of_support: 'out_of_support',
    outofsupport: 'out_of_support',
    'out of support': 'out_of_support'
  }
  return statusMap[s] || s
}

// 返回列表
function goBack() {
  emit('back')
}

// 设置软件包筛选条件
function setPackageFilter(filter) {
  packageFilter.value = filter
  activeTab.value = 'packages'
}

// 查看主机详情
function viewHostDetail(host) {
  if (!host) return
  const hostKey = host.hostKey || host.hostId || host.host_key
  if (!hostKey) return
  selectedHostInfo.value = {
    host_key: hostKey,
    host_id: host.hostId || host.host_id || '',
    os_distro: host.osDistro || host.os_distro || '',
    os_version: host.osVersion || host.os_version || '',
    hostname: host.hostname || ''
  }
  hostDetailVisible.value = true
}

function handleFixPatchesFromDetail() {
  ElMessage.info('补丁修复操作已触发')
}

// 加载 CVE 详情
async function loadCveDetail() {
  loading.value = true
  try {
    const data = await cveApi.getCveDetail(props.cveId)
    const result = data?.data || data
    sources.value = result.sources || []

    if (sources.value.length > 0) {
      currentSourceId.value = sources.value[0].source
      selectSource(currentSourceId.value)
    }

    // 合并所有软件包
    allPackages.value = []
    sources.value.forEach(source => {
      if (source.packages) {
        Object.entries(source.packages).forEach(([status, pkgList]) => {
          if (Array.isArray(pkgList)) {
            pkgList.forEach(pkg => {
              const rawStatus = pkg.status || status
              allPackages.value.push({
                ...pkg,
                source: source.source,
                status: rawStatus,
                normalizedStatus: normalizeStatusKey(rawStatus)
              })
            })
          }
        })
      }
    })

    if (currentSource.value) {
      buildCveDetail(currentSource.value)
    }
  } catch (error) {
    console.error('加载详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 选择数据源
function selectSource(sourceId) {
  currentSource.value = sources.value.find(s => s.source === sourceId) || sources.value[0]
  if (currentSource.value) {
    buildCveDetail(currentSource.value)
  }
}

// 构建CVE详情对象
function buildCveDetail(source) {
  const apiSummary = source.summary || {}
  let summary = {
    total: apiSummary.total || allPackages.value.length,
    affected: apiSummary.affected || 0,
    fixed: apiSummary.fixed || 0,
    notAffected: apiSummary.notAffected || apiSummary.not_affected || 0,
    willNotFix: apiSummary.willNotFix || apiSummary.will_not_fix || 0,
    outOfSupport: apiSummary.outOfSupport || apiSummary.out_of_support || 0,
    fixDeferred: apiSummary.deferred || apiSummary.fixDeferred || apiSummary.fix_deferred || 0
  }

  // 兜底逻辑：如果 API 没有返回 summary，则从 packages 计算
  if (!source.summary || Object.keys(source.summary).length === 0) {
    summary = calculateSummaryFromPackages()
  }

  cveDetail.value = {
    cveId: props.cveId,
    severity: source.severity,
    severityLabel: source.severityLabel,
    cvss3Score: source.cvss3Score,
    cvssVector: source.cvssVector,
    source: source.source,
    publicDate: source.publicDate,
    modifiedDate: source.modifiedDate,
    cweId: source.cwe,
    description: source.description,
    webUrl: source.webUrl,
    summary: summary,
    mitigation: source.mitigation,
    references:
      source.references || (source.webUrl ? [{ url: source.webUrl, title: '官方链接' }] : [])
  }

  // 延迟初始化图表，确保 DOM 已渲染且尺寸稳定
  setTimeout(() => {
    initImpactChart()
  }, 100)
}

function calculateSummaryFromPackages() {
  const summary = {
    total: allPackages.value.length,
    affected: 0,
    fixed: 0,
    notAffected: 0,
    willNotFix: 0,
    outOfSupport: 0,
    fixDeferred: 0
  }

  allPackages.value.forEach(pkg => {
    const status = pkg.normalizedStatus || ''
    if (status === 'affected') summary.affected++
    else if (status === 'fixed') summary.fixed++
    else if (status === 'not_affected') summary.notAffected++
    else if (status === 'will_not_fix') summary.willNotFix++
    else if (status === 'out_of_support') summary.outOfSupport++
    else if (status === 'fix_deferred') summary.fixDeferred++
  })

  return summary
}

// 初始化影响统计图表
function initImpactChart() {
  if (!impactChartRef.value) return
  if (impactChart) impactChart.dispose()

  impactChart = echarts.init(impactChartRef.value)
  const summary = cveDetail.value?.summary || {}
  const total = summary.total || 0

  const data = []
  if (summary.affected > 0)
    data.push({ value: summary.affected, name: '受影响', itemStyle: { color: '#F53F3F' } })
  if (summary.fixDeferred > 0)
    data.push({ value: summary.fixDeferred, name: '延迟修复', itemStyle: { color: '#409eff' } })
  if (summary.fixed > 0)
    data.push({ value: summary.fixed, name: '已修复', itemStyle: { color: '#67c23a' } })
  if (summary.notAffected > 0)
    data.push({ value: summary.notAffected, name: '不受影响', itemStyle: { color: '#909399' } })
  if (summary.willNotFix > 0)
    data.push({ value: summary.willNotFix, name: '不修复', itemStyle: { color: '#e6a23c' } })
  if (summary.outOfSupport > 0)
    data.push({ value: summary.outOfSupport, name: '超出支持', itemStyle: { color: '#303133' } })

  if (data.length === 0) {
    data.push({ value: 1, name: '暂无数据', itemStyle: { color: '#ebeef5' } })
  }

  const option = {
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
              fill: '#212529',
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
              fill: '#6c757d',
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
        data: data
      }
    ]
  }

  impactChart.setOption(option)

  // 强制延迟重绘，确保容器尺寸已生效
  setTimeout(() => {
    if (impactChart) impactChart.resize()
  }, 50)
}

// 加载受影响主机
async function loadAffectedHosts() {
  if (!props.cveId || affectedHostsLoading.value) return
  affectedHostsLoading.value = true
  try {
    const data = await cveApi.getAffectedHosts(props.cveId)
    const result = data?.data || data
    affectedHosts.value = result?.hosts || []
    affectedHostsTotal.value = result?.totalHosts || affectedHosts.value.length
    affectedHostsLoaded.value = true
  } catch (error) {
    affectedHostsError.value = '加载失败'
  } finally {
    affectedHostsLoading.value = false
  }
}

watch(activeTab, newTab => {
  if (newTab === 'hosts' && !affectedHostsLoaded.value) loadAffectedHosts()
})

watch(
  () => props.cveId,
  newId => {
    if (newId) {
      affectedHostsLoaded.value = false
      packageFilter.value = 'all'
      activeTab.value = 'basic'
      loadCveDetail()
      loadAffectedHosts()
    }
  }
)

onMounted(() => {
  if (props.cveId) {
    loadCveDetail()
    loadAffectedHosts()
  }
})

onUnmounted(() => {
  if (impactChart) impactChart.dispose()
})
</script>

<style scoped lang="scss">
.cve-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f7fa;
  overflow: hidden;
}

.cve-detail-breadcrumb {
  flex-shrink: 0;
  padding: 12px 20px;
  padding-top: 0;
  background: white;
  border-bottom: 1px solid #ebeef5;

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
        color: #606266;
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
    background: white;
    padding: 0 16px;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid #ebeef5;
    /* 缩小 Tab 下方的间距，让内容紧贴 */
  }

  :deep(.el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: white;
    padding: 20px 24px;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
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
    background: #e4e7ed;
    border-radius: 10px;
  }
}

.ops-tab-count {
  display: inline-block;
  background: #f0f2f5;
  color: #909399;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 10px;
  height: 18px;
  line-height: 18px;
  margin-left: 4px;
}

/* Modern Design System Styles */

/* 1. Header */
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
      color: #1a1a1a;
      margin: 0;
      line-height: 1.2;
    }

    .severity-badge {
      // 样式已移至 src/styles/biz-tags.scss
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
        color: #606266;
        margin-right: 8px;
        font-weight: 400;
      }

      .value {
        color: #303133;
        font-weight: 500;
      }
    }

    .meta-separator {
      width: 1px;
      height: 14px;
      background: #e4e7ed;
      display: none; /* 隐藏分隔符，使布局更紧凑 */
    }
  }
}

/* Severity & Status Tags in Tables: 样式已移至 src/styles/biz-tags.scss */

/* 2. Cards */
.modern-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 20px;
    letter-spacing: -0.2px;
  }
}

/* 3. Impact Overview */
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
  grid-template-columns: repeat(4, 1fr); /* 4 columns -> 2 rows for 7 items */
  gap: 12px;
  align-content: flex-start;
}

.modern-stat-block {
  width: 100%;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  background: #f9fafc; /* Light gray background */
  border: 1px solid #ebeef5; /* Subtle border */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 72px; /* Reduced height */
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);

  &:hover {
    background: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Lift effect */
    transform: translateY(-2px);
    border-color: #dcdfe6;
  }

  /* Left Border Indicator */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #e4e7ed;
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
    color: #606266;
    font-weight: 500;
  }

  .stat-number {
    font-size: 20px; /* Slightly smaller font */
    font-weight: 700;
    line-height: 1;
    font-family: 'Inter', sans-serif;
  }

  /* Text Colors */
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
    color: #303133;
  }
}

/* 4. Details Grid */
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
      color: #909399;
      margin-bottom: 6px;
      font-weight: 400;
    }

    .label {
      font-size: 13px;
      color: #909399;
      margin-bottom: 6px;
      font-weight: 400;
    }

    .value {
      font-size: 15px;
      color: #303133;
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

.host-link {
  color: #409eff;
  text-decoration: none;
  cursor: pointer;
  user-select: text;

  &:hover {
    color: #66b1ff;
    text-decoration: underline;
  }
}

/* 5. Texts */
.card-text {
  font-size: 15px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
}

/* 响应式 */
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
</style>
