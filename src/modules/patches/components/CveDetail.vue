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
                  :class="['severity-badge', getSeverityClass(cveDetail.severity)]"
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
                      :class="['severity-badge', getSeverityClass(cveDetail.severity)]"
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
                    @click="setPackageFilter(item.label)"
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
            <div class="ops-filter-bar compact packages-filter-bar">
              <el-radio-group v-model="systemFilter" size="small">
                <el-radio-button
                  v-for="option in packageSourceOptions"
                  :key="option.value"
                  :label="option.value"
                >
                  {{ option.label }}
                </el-radio-button>
              </el-radio-group>

              <el-radio-group v-model="packageFilter" size="small">
                <el-radio-button label="全部">全部</el-radio-button>
                <el-radio-button label="受影响">受影响</el-radio-button>
                <el-radio-button label="延迟修复">延迟修复</el-radio-button>
                <el-radio-button label="已修复">已修复</el-radio-button>
                <el-radio-button label="不受影响">不受影响</el-radio-button>
                <el-radio-button label="不修复">不修复</el-radio-button>
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
                <el-table-column prop="architecture" label="架构" width="150" />
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
                <el-table-column prop="hostKey" label="主机标识" width="150">
                  <template #default="{ row }">
                    <a href="javascript:void(0)" class="host-link" @click="viewHostDetail(row)">
                      {{ row.hostKey || row.hostId || '-' }}
                    </a>
                  </template>
                </el-table-column>
                <el-table-column prop="osDistro" label="系统发行版" width="120">
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
                  min-width="250"
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
                <el-table-column prop="scanDate" label="扫描时间" width="180">
                  <template #default="{ row }">
                    <span class="text-muted">{{ formatDateTime(row.scanDate) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                  <template #default="{ row }">
                      <el-button
                        text
                        type="primary"
                        size="small"
                        :disabled="!hasRebootAction(row) || !canRebootHost(row)"
                        :loading="isRebootSubmitting(row)"
                        :title="isRebootRecommended(row) ? '建议重启' : ''"
                        @click="handleHostReboot(row)"
                      >
                        {{ getRebootButtonLabel(row) }}
                      </el-button>
                      <el-button
                        v-if="shouldShowRebootResultButton(row)"
                        text
                        type="primary"
                        size="small"
                        @click="openRebootResult(row)"
                      >
                        查看结果
                      </el-button>
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

    <ExecuteResultDialog
      v-if="rebootResultDialogVisible"
      v-model:visible="rebootResultDialogVisible"
      :run-id="rebootResultRunId"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'
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
import {
  buildCveSourceOptions,
  getCveSourceLabel,
  getCveSourceType,
  isSameCveSource
} from '../composables/useFormatters'

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
const packageFilter = ref('全部')
const systemFilter = ref('all')
const affectedHosts = ref([])
const affectedHostsTotal = ref(0)
const affectedHostsLoading = ref(false)
const affectedHostsLoaded = ref(false)
const affectedHostsError = ref('')
const rebootSubmittingHostKey = ref('')
const rebootResultDialogVisible = ref(false)
const rebootResultRunId = ref('')
const router = useRouter()
const { isDark } = useTheme()

// 图表引用
const impactChartRef = ref(null)
let impactChart = null

const packageSourceOptions = computed(() => {
  const sourceList =
    allPackages.value.length > 0
      ? allPackages.value.map(pkg => pkg.source)
      : sources.value.map(source => source.source)

  return buildCveSourceOptions(sourceList, { includeAll: true, dedupe: true })
})

// 计算属性：过滤后的软件包
const filteredPackages = computed(() => {
  let list = allPackages.value

  if (systemFilter.value !== 'all') {
    list = list.filter(pkg => isSameCveSource(pkg.source, systemFilter.value))
  }

  // 状态筛选
  if (packageFilter.value !== '全部') {
    list = list.filter(pkg => pkg.normalizedStatus === packageFilter.value)
  }

  return list
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
  const key = normalizeSeverityKey(severity)
  const typeMap = {
    critical: 'danger',
    important: 'warning',
    moderate: 'primary',
    low: 'info'
  }
  return typeMap[key] || 'info'
}

// 获取严重等级标签
function getSeverityLabel(severity) {
  const key = normalizeSeverityKey(severity)
  const labelMap = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return labelMap[key] || severity
}

function normalizeSeverityKey(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()

  if (lower === 'critical' || raw === '严重' || raw === 'CRITICAL') return 'critical'
  if (lower === 'important' || raw === '重要' || raw === '高危' || raw === 'IMPORTANT')
    return 'important'
  if (lower === 'moderate' || raw === '中等' || raw === '中危' || raw === 'MODERATE')
    return 'moderate'
  if (lower === 'low' || raw === '低' || raw === '低危' || raw === 'LOW') return 'low'

  if (raw === 'Critical') return 'critical'
  if (raw === 'Important') return 'important'
  if (raw === 'Moderate') return 'moderate'
  if (raw === 'Low') return 'low'

  return ''
}

function getSeverityClass(severity) {
  const key = normalizeSeverityKey(severity)
  return key ? `is-${key}` : ''
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
  return getCveSourceLabel(source)
}

//获取数据源样式
function getSourceType(source) {
  return getCveSourceType(source)
}

function getHostSeverityType(severity) {
  return normalizeSeverityKey(severity)
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
  const s = `${status}`.toLowerCase().trim()
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
  packageFilter.value = filter === '总计' ? '全部' : filter
  activeTab.value = 'packages'
}

// 查看主机详情
function viewHostDetail(host) {
  if (!host) return
  const hostKey = host.hostKey || host.hostId || host.host_key
  if (!hostKey) return
  router.push({
    name: 'patches-hostDetail',
    query: {
      host_key: hostKey,
      host_id: host.hostId || host.host_id || '',
      os_distro: host.osDistro || host.os_distro || '',
      os_version: host.osVersion || host.os_version || '',
      hostname: host.hostname || '',
      fromLabel: 'CVE详情',
      fromRouteName: 'patches-cveList',
      fromRouteQuery: JSON.stringify({
        view: 'detail',
        cveId: props.cveId
      })
    }
  })
}

function getHostIdentity(host) {
  return String(host?.hostId || host?.host_id || host?.hostKey || host?.host_key || '').trim()
}

function getRebootAction(host) {
  return host?.rebootAction || host?.reboot_action || null
}

function hasRebootAction(host) {
  return !!getRebootAction(host)
}

function canRebootHost(host) {
  const action = getRebootAction(host)
  if (!action) return false
  return action.enabled !== false
}

function isRebootRecommended(host) {
  return getRebootAction(host)?.recommended === true
}

function getRebootButtonLabel(host) {
  const rebootType = getRebootAction(host)?.rebootType || getRebootAction(host)?.reboot_type
  return rebootType === 'service_reboot' ? '服务重启' : '主机重启'
}

function isRebootSubmitting(host) {
  return rebootSubmittingHostKey.value !== '' && rebootSubmittingHostKey.value === getHostIdentity(host)
}

function getHostRebootRunId(host) {
  return String(host?.__rebootRunId || host?.rebootRunId || host?.reboot_run_id || '').trim()
}

function shouldShowRebootResultButton(host) {
  return !isRebootSubmitting(host) && !!getHostRebootRunId(host)
}

function openRebootResult(host) {
  const runId = getHostRebootRunId(host)
  if (!runId) {
    ElMessage.warning('暂无运行结果')
    return
  }

  rebootResultRunId.value = runId
  rebootResultDialogVisible.value = true
}

function buildHostRebootPayload(host) {
  const action = getRebootAction(host) || {}
  const payloadTemplate = action.payloadTemplate || action.payload_template || {}
  const hostId = payloadTemplate.hostId || payloadTemplate.host_id || host?.hostId || host?.host_id
  const hostIp =
    payloadTemplate.hostIp ||
    payloadTemplate.host_ip ||
    host?.hostIp ||
    host?.host_ip ||
    host?.hostKey ||
    host?.host_key

  return {
    ...(hostId ? { hostId } : {}),
    ...(!hostId && hostIp ? { hostIp } : {}),
    rebootType:
      payloadTemplate.rebootType ||
      payloadTemplate.reboot_type ||
      action.rebootType ||
      action.reboot_type ||
      'system_reboot',
    confirmText: payloadTemplate.confirmText || payloadTemplate.confirm_text || '确认重启'
  }
}

async function handleHostReboot(host) {
  const action = getRebootAction(host)
  if (!action || !canRebootHost(host)) return

  const hostLabel = host?.hostKey || host?.hostId || host?.host_key || host?.host_id || '当前主机'
  const payload = buildHostRebootPayload(host)

  if (!payload.hostId && !payload.hostIp) {
    ElMessage.error('缺少主机标识，无法执行重启')
    return
  }

  const message = isRebootRecommended(host)
    ? `确认对主机 ${hostLabel} 执行${getRebootButtonLabel(host)}？当前接口建议重启。`
    : `确认对主机 ${hostLabel} 执行${getRebootButtonLabel(host)}？`

  await ElMessageBox.confirm(message, '确认重启', {
    type: 'warning',
    confirmButtonText: '确认重启',
    cancelButtonText: '取消'
  })

  host.__rebootRunId = ''
  host.__rebootStatus = 'PENDING'
  rebootSubmittingHostKey.value = getHostIdentity(host)

  try {
    const response = await cveApi.rebootHost(payload)
    const result = response?.data || response || {}

    host.__rebootRunId = result?.runId || result?.run_id || ''
    host.__rebootStatus = result?.status || ''

    if (result?.success === false) {
      ElMessage.warning(result?.message || '重启任务未成功完成')
      if (host.__rebootRunId) {
        openRebootResult(host)
      }
      return
    }

    ElMessage.success(result?.message || '重启完成')
    if (host.__rebootRunId) {
      openRebootResult(host)
    }
  } catch (error) {
    if (error === 'cancel') {
      return
    }

    console.error('主机重启失败:', error)
    ElMessage.error(error?.response?.data?.error || error?.message || '主机重启失败，请稍后重试')
  } finally {
    rebootSubmittingHostKey.value = ''
  }
}

// 加载 CVE 详情
async function loadCveDetail() {
  loading.value = true
  try {
    const data = await cveApi.getCveDetail(props.cveId)
    const result = data?.data || data
    sources.value = result.sources || []

    if (sources.value.length > 0) {
      currentSourceId.value = sources.value[1]?.source || sources.value[0].source
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
  const sourcePackages = extractPackagesFromSource(source)
  let summary = {
    total: typeof apiSummary.total === 'number' ? apiSummary.total : sourcePackages.length,
    affected: apiSummary.affected ?? 0,
    fixed: apiSummary.fixed ?? 0,
    notAffected: apiSummary.notAffected ?? apiSummary.not_affected ?? 0,
    willNotFix: apiSummary.willNotFix ?? apiSummary.will_not_fix ?? 0,
    outOfSupport: apiSummary.outOfSupport ?? apiSummary.out_of_support ?? 0,
    fixDeferred: apiSummary.deferred ?? apiSummary.fixDeferred ?? apiSummary.fix_deferred ?? 0
  }

  // 兜底逻辑：如果 API 没有返回 summary，则从该数据源的 packages 计算
  if (!source.summary || Object.keys(source.summary).length === 0) {
    summary = calculateSummaryFromPackages(sourcePackages)
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
    summary,
    mitigation: source.mitigation,
    references:
      source.references || (source.webUrl ? [{ url: source.webUrl, title: '官方链接' }] : [])
  }

  // 延迟初始化图表，确保 DOM 已渲染且尺寸稳定
  setTimeout(() => {
    initImpactChart()
  }, 100)
}

function extractPackagesFromSource(source) {
  const list = []
  if (!source || !source.packages) return list
  Object.entries(source.packages).forEach(([status, pkgList]) => {
    if (Array.isArray(pkgList)) {
      pkgList.forEach(pkg => {
        const rawStatus = pkg.status || status
        list.push({
          ...pkg,
          source: source.source,
          status: rawStatus,
          normalizedStatus: normalizeStatusKey(rawStatus)
        })
      })
    }
  })
  return list
}

function calculateSummaryFromPackages(packages) {
  const summary = {
    total: packages.length,
    affected: 0,
    fixed: 0,
    notAffected: 0,
    willNotFix: 0,
    outOfSupport: 0,
    fixDeferred: 0
  }

  packages.forEach(pkg => {
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

  impactChart = echarts.init(impactChartRef.value, isDark.value ? 'dark' : '')
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
    data.push({ value: summary.outOfSupport, name: '超出支持', itemStyle: { color: '#8c8c8c' } })

  if (data.length === 0) {
    data.push({
      value: 1,
      name: '暂无数据',
      itemStyle: { color: isDark.value ? '#4c4d4f' : '#ebeef5' }
    })
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
        data
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
  affectedHostsError.value = ''
  try {
    const data = await cveApi.getAffectedHosts(props.cveId)
    const result = data?.data || data
    const hosts = Array.isArray(result?.hosts)
      ? result.hosts
      : Array.isArray(result?.records)
        ? result.records
        : Array.isArray(result)
          ? result
          : []

    affectedHosts.value = hosts
    affectedHostsTotal.value = Number(result?.totalHosts ?? result?.total ?? hosts.length)
    affectedHostsLoaded.value = true
  } catch (error) {
    console.error('加载受影响主机失败:', error)
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
      packageFilter.value = '全部'
      systemFilter.value = 'all'
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

// 监听主题切换，重建图表
watch(isDark, () => {
  if (impactChart) {
    impactChart.dispose()
    impactChart = null
  }
  if (cveDetail.value) {
    nextTick(() => initImpactChart())
  }
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
    /* 缩小 Tab 下方的间距，让内容紧贴 */
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
      display: none; /* 隐藏分隔符，使布局更紧凑 */
    }
  }
}

/* Severity & Status Tags in Tables: 样式已移至 src/styles/biz-tags.scss */

/* 2. Cards */
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
  background: var(--el-fill-color-light); /* Light gray background */
  border: 1px solid var(--el-border-color-light); /* Subtle border */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 72px; /* Reduced height */
  position: relative;
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);

  &:hover {
    background: var(--el-bg-color);
    box-shadow: var(--el-box-shadow); /* Lift effect */
    transform: translateY(-2px);
    border-color: var(--el-border-color);
  }

  /* Left Border Indicator */
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
    color: var(--el-text-color-primary);
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
  color: var(--el-text-color-primary);
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

.packages-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
}
</style>
