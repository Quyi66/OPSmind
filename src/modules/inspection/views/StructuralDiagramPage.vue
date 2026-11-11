<template>
  <div class="ops-page-layout structural-diagram-page">
    <!-- 顶部导航与操作卡片 -->
    <section class="topology-header-card">
      <nav class="page-navbar">
        <div class="navbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <a @click="goBack">执行记录</a>
            </el-breadcrumb-item>
            <el-breadcrumb-item>{{ jobInfo.templateName || '业务拓扑分析' }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="navbar-right">
          <el-button size="small" @click="downloadImage">
            <i class="fa fa-image" aria-hidden="true"></i>
            保存拓扑图
          </el-button>
          <el-button type="primary" plain size="small" @click="exportExcel">
            <i class="fa fa-file-export" aria-hidden="true"></i>
            导出报告 (Excel)
          </el-button>
        </div>
      </nav>

      <!-- KPI 指标卡片 -->
      <el-alert v-if="kpiError" :title="kpiError" type="error" :closable="false" show-icon>
        <el-button link type="primary" @click="loadKpiData">重试</el-button>
      </el-alert>

      <div v-loading="kpiLoading" class="kpi-section-body">
        <div class="kpi-section-heading">
          <span class="kpi-heading-title">检查指标汇总</span>
          <span class="kpi-heading-hint">点击任意指标数值可查看对应清单</span>
        </div>
        <div class="kpi-container">
          <div
            v-for="item in kpiList"
            :key="item.pageParam"
            class="kpi-card"
            :class="getKpiTheme(item)"
            @click="handleKpiClick(item)"
          >
            <span class="kpi-title">
              <span class="kpi-dot"></span>
              {{ item.name }}
            </span>
            <div class="kpi-content">
              <div class="kpi-value">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 结构图区域 -->
    <el-alert v-if="diagramError" :title="diagramError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadDiagramData">重试</el-button>
    </el-alert>

    <section v-loading="loading" class="diagram-container">
      <div class="diagram-toolbar">
        <div class="diagram-title">
          <h2>业务服务异常传导拓扑</h2>
          <span class="diagram-subtitle">
            展示一级业务、二级系统与异常巡检项的关联关系（红色胶囊数字代表异常计数）
          </span>
        </div>
        <div class="diagram-legend">
          <span class="legend-chip">
            <i class="fas fa-mouse-pointer" aria-hidden="true"></i>
            双击一级业务节点：查看二级业务汇总
          </span>
          <span class="legend-chip">
            <i class="fas fa-hand-pointer" aria-hidden="true"></i>
            单击二级业务节点：查看异常检查项与主机
          </span>
        </div>
      </div>
      <div ref="chartRef" class="echart-container"></div>
    </section>

    <!-- 一级业务详情弹窗 -->
    <el-dialog
      v-model="primaryDialogVisible"
      :title="primaryDialogTitle"
      width="800px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <div v-loading="primaryLoading" class="primary-detail-content">
        <el-alert
          v-if="primaryError"
          :title="primaryError"
          type="error"
          :closable="false"
          show-icon
        >
          <el-button link type="primary" @click="showPrimaryDialog(currentPrimaryService, true)">
            重试
          </el-button>
        </el-alert>
        <div class="filter-bar" style="margin-bottom: 12px">
          <el-input
            v-model="primaryFilterText"
            placeholder="搜索二级业务名称..."
            clearable
            style="width: 260px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="primary-stats">
          <span class="stat-item">
            二级业务:
            <strong>{{ primaryStats.count }}</strong>
          </span>
          <span class="stat-item">
            检查项:
            <strong>{{ primaryStats.itemTotal }}</strong>
          </span>
          <span class="stat-item">
            主机:
            <strong>{{ primaryStats.hostTotal }}</strong>
          </span>
        </div>
        <el-table :data="filteredPrimaryData" max-height="450">
          <el-table-column prop="name" label="二级业务名称" />
          <el-table-column prop="contItem" label="检查项失败数" width="120" align="left" />
          <el-table-column prop="contHost" label="主机数" width="100" align="left" />
        </el-table>
      </div>
    </el-dialog>

    <!-- 二级业务详情弹窗 -->
    <el-dialog
      v-model="secondaryDialogVisible"
      :title="secondaryDialogTitle"
      width="900px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <el-alert
        v-if="secondaryError"
        :title="secondaryError"
        type="error"
        :closable="false"
        show-icon
      >
        <el-button
          link
          type="primary"
          @click="
            showSecondaryDialog(
              currentSecondaryContext.primaryService,
              currentSecondaryContext.secondaryService,
              true
            )
          "
        >
          重试
        </el-button>
      </el-alert>
      <el-tabs v-model="secondaryActiveTab" v-loading="secondaryLoading">
        <el-tab-pane label="按检查项" name="item">
          <div
            class="tab-header"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            "
          >
            <div class="tab-stats">共 {{ itemData.length }} 个检查项</div>
            <el-input
              v-model="secondaryItemFilterText"
              placeholder="搜索检查项名称..."
              clearable
              style="width: 220px"
              size="small"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <el-table :data="filteredItemData" max-height="400">
            <el-table-column prop="item" label="检查项名称" />
            <el-table-column label="失败主机数" width="120" align="left">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="showHostList(row.host)">
                  {{ row.count }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="按主机" name="host">
          <div
            class="tab-header"
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 10px;
            "
          >
            <div class="tab-stats">共 {{ hostData.length }} 台主机</div>
            <el-input
              v-model="secondaryHostFilterText"
              placeholder="搜索主机名称..."
              clearable
              style="width: 220px"
              size="small"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <el-table :data="filteredHostData" max-height="400">
            <el-table-column prop="host" label="主机名" />
            <el-table-column label="失败检查项数" width="120" align="left">
              <template #default="{ row }">
                <el-button type="danger" size="small" @click="showItemList(row.item)">
                  {{ row.count }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 列表详情弹窗 -->
    <el-dialog
      v-model="listDialogVisible"
      :title="listDialogTitle"
      width="500px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <el-table :data="listData" max-height="400">
        <el-table-column prop="name" :label="listDialogTitle" />
      </el-table>
    </el-dialog>

    <!-- KPI 详情弹窗 -->
    <el-dialog
      v-model="kpiDialogVisible"
      :title="kpiDialogTitle"
      width="800px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <div class="kpi-detail-content">
        <!-- 搜索筛选 -->
        <div class="kpi-filter-bar" style="margin-bottom: 12px">
          <el-form inline size="small" @submit.prevent>
            <el-form-item :label="kpiSearchLabel">
              <el-input
                v-model="kpiFilterText"
                :placeholder="kpiSearchPlaceholder"
                clearable
                style="width: 320px"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <el-alert
          v-if="kpiDialogError"
          :title="kpiDialogError"
          type="error"
          :closable="false"
          show-icon
        >
          <el-button link type="primary" @click="handleKpiClick(currentKpi, true)">重试</el-button>
        </el-alert>
        <el-table
          v-loading="kpiDialogLoading"
          :data="filteredKpiDialogData"
          max-height="calc(100vh - 300px)"
        >
          <!-- 检查项总数类型 (itemAll): 只显示检查项名称 -->
          <template v-if="kpiDialogType === 'itemAll'">
            <el-table-column prop="name" label="检查项" min-width="200" />
          </template>

          <!-- 主机总数类型 (hostAll): 主机 + 成功/失败检查项数 -->
          <template v-else-if="kpiDialogType === 'hostAll'">
            <el-table-column prop="host_key" label="主机" min-width="180" />
            <el-table-column label="成功检查项" width="140" align="left">
              <template #default="{ row }">
                <el-tag type="success" effect="dark" round>
                  <i class="fa fa-check" style="margin-right: 5px"></i>
                  {{ row.success_count }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="失败检查项" width="140" align="left">
              <template #default="{ row }">
                <el-tag type="danger" effect="dark" round>
                  <i class="fa fa-times" style="margin-right: 5px"></i>
                  {{ row.failed_count }}
                </el-tag>
              </template>
            </el-table-column>
          </template>

          <!-- 主机成功/失败/待检 类型 (hostOkAll, hostFailedAll, hostCheckAll): 主机 + 状态 -->
          <template
            v-else-if="['hostOkAll', 'hostFailedAll', 'hostCheckAll'].includes(kpiDialogType)"
          >
            <el-table-column prop="host_key" label="主机" min-width="180" />
            <el-table-column label="检查状态" width="140" align="left">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="dark" round>
                  <i :class="['fa', getStatusIcon(row.status)]" style="margin-right: 5px"></i>
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </template>

          <!-- 检查通过/失败/人工检查 类型 (OK, FAILED, CHECK): 主机 + 检查项 + 状态 + 详情 -->
          <template v-else>
            <el-table-column prop="host_key" label="主机" min-width="150" />
            <el-table-column prop="name" label="检查项" min-width="200" />
            <el-table-column label="检查状态" width="120" align="left">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="dark" round>
                  <i :class="['fa', getStatusIcon(row.status)]" style="margin-right: 5px"></i>
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="left" fixed="right">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="showCheckItemDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </template>
        </el-table>
      </div>
    </el-dialog>

    <!-- 巡检结果详情弹窗 -->
    <el-dialog
      v-model="checkItemDetailVisible"
      title="巡检结果"
      width="700px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <div v-loading="checkItemDetailLoading" class="check-item-detail-dialog">
        <el-alert
          v-if="checkItemError"
          :title="checkItemError"
          type="error"
          :closable="false"
          show-icon
        >
          <el-button link type="primary" @click="showCheckItemDetail(selectedCheckItem)">
            重试
          </el-button>
        </el-alert>
        <div class="result-item">
          <span class="result-label">结果：</span>
          <el-tag
            v-if="currentCheckItem"
            :type="getStatusTagType(currentCheckItem.status)"
            size="small"
          >
            {{ getStatusLabel(currentCheckItem.status) }}
          </el-tag>
        </div>
        <div class="result-item">
          <span class="result-label">检查项：</span>
          <span class="result-value">{{ currentCheckItem?.name || '-' }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">结果输出：</span>
        </div>
        <div
          v-if="currentCheckItem?.output != null && currentCheckItem.output !== ''"
          class="output-content"
        >
          <pre>{{ currentCheckItem.output }}</pre>
        </div>
        <div v-else class="output-content">
          <pre class="empty">无输出内容</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  nextTick,
  watch
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { authService } from '@/core/auth'
import { jobApi, dtsApi } from '../api'
import { pickResultListRouteQuery } from '../utils/result-list-route-state'

// Props
const props = defineProps({
  jobId: {
    type: String,
    default: ''
  }
})

// Emits
const emit = defineEmits(['back'])

const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const kpiLoading = ref(false)
const currentJobId = ref('')
const jobInfo = ref({})
const diagramData = ref([])
const kpiList = ref([])
const kpiError = ref('')
const diagramError = ref('')
const reads = { job: 0, kpi: 0, diagram: 0, primary: 0, secondary: 0, kpiDetail: 0, item: 0 }
let disposed = false
let active = true
let contextRequest = 0

function beginRead(key) {
  const request = ++reads[key]
  const jobId = currentJobId.value
  return () => !disposed && active && request === reads[key] && jobId === currentJobId.value
}

// 图表相关
const chartRef = ref(null)
let chartInstance = null

// 一级业务弹窗
const primaryDialogVisible = ref(false)
const primaryDialogTitle = ref('')
const primaryData = ref([])
const primaryStats = ref({ count: 0, itemTotal: 0, hostTotal: 0 })
const primaryFilterText = ref('')
const primaryLoading = ref(false)
const primaryError = ref('')
const currentPrimaryService = ref('')

/**
 * 一级业务过滤数据
 */
const filteredPrimaryData = computed(() => {
  const keyword = primaryFilterText.value.trim().toLowerCase()
  if (!keyword) return primaryData.value
  return primaryData.value.filter(item => item.name?.toLowerCase().includes(keyword))
})

// 二级业务弹窗
const secondaryDialogVisible = ref(false)
const secondaryDialogTitle = ref('')
const secondaryActiveTab = ref('item')
const itemData = ref([])
const hostData = ref([])
const secondaryItemFilterText = ref('')
const secondaryHostFilterText = ref('')
const secondaryLoading = ref(false)
const secondaryError = ref('')
const currentSecondaryContext = ref({ primaryService: '', secondaryService: '' })

/**
 * 二级业务项过滤数据
 */
const filteredItemData = computed(() => {
  const keyword = secondaryItemFilterText.value.trim().toLowerCase()
  if (!keyword) return itemData.value
  return itemData.value.filter(item => item.item?.toLowerCase().includes(keyword))
})

/**
 * 二级业务主机过滤数据
 */
const filteredHostData = computed(() => {
  const keyword = secondaryHostFilterText.value.trim().toLowerCase()
  if (!keyword) return hostData.value
  return hostData.value.filter(item => item.host?.toLowerCase().includes(keyword))
})

// 列表弹窗
const listDialogVisible = ref(false)
const listDialogTitle = ref('')
const listData = ref([])

// KPI 详情弹窗
const kpiDialogVisible = ref(false)
const kpiDialogTitle = ref('')
const kpiDialogData = ref([])
const kpiDialogLoading = ref(false)
const kpiDialogType = ref('') // KPI 类型，用于动态显示不同列
const kpiFilterText = ref('')
const kpiDialogError = ref('')
const currentKpi = ref(null)

/**
 * KPI 详情过滤数据
 */
const filteredKpiDialogData = computed(() => {
  const data = kpiDialogData.value || []
  const keyword = kpiFilterText.value.trim().toLowerCase()
  if (!keyword) return data
  return data.filter(item => {
    // 根据当前类型决定匹配哪些字段
    if (kpiDialogType.value === 'itemAll') {
      return item.name?.toLowerCase()?.includes(keyword)
    }

    const hostMatch = item.host_key?.toLowerCase()?.includes(keyword)
    const nameMatch = item.name?.toLowerCase()?.includes(keyword)
    return hostMatch || nameMatch
  })
})

/**
 * 动态搜索占位符
 */
const kpiSearchPlaceholder = computed(() => {
  switch (kpiDialogType.value) {
    case 'itemAll':
      return '输入检查项名称...'
    case 'hostAll':
    case 'hostOkAll':
    case 'hostFailedAll':
    case 'hostCheckAll':
      return '输入主机 IP 或名称...'
    default:
      return '输入主机 IP 或 检查项名称...'
  }
})

/**
 * 动态搜索标签
 */
const kpiSearchLabel = computed(() => {
  if (kpiDialogType.value === 'itemAll') return '检查项'
  if (['hostAll', 'hostOkAll', 'hostFailedAll', 'hostCheckAll'].includes(kpiDialogType.value)) {
    return '主机'
  }
  return '关键词'
})

// 巡检结果详情弹窗
const checkItemDetailVisible = ref(false)
const checkItemDetailLoading = ref(false)
const currentCheckItem = ref(null)
const selectedCheckItem = ref(null)
const checkItemError = ref('')

for (const [visible, key, pending] of [
  [primaryDialogVisible, 'primary', primaryLoading],
  [secondaryDialogVisible, 'secondary', secondaryLoading],
  [kpiDialogVisible, 'kpiDetail', kpiDialogLoading],
  [checkItemDetailVisible, 'item', checkItemDetailLoading]
]) {
  watch(
    visible,
    value => {
      if (!value) {
        reads[key] += 1
        pending.value = false
      }
    },
    { flush: 'sync' }
  )
}

// KPI 定义
const kpiDefs = {
  hostAll: { title: '主机总数', icon: 'fa-laptop', order: 1 },
  hostOkAll: { title: '主机成功', icon: 'fa-check', order: 2 },
  hostFailedAll: { title: '主机失败', icon: 'fa-times', order: 3 },
  hostCheckAll: { title: '主机待检', icon: 'fa-user-md', order: 4 },
  itemAll: { title: '检查项', icon: 'fa-angle-double-right', order: 5 },
  OK: { title: '检查通过', icon: 'fa-check', order: 6 },
  FAILED: { title: '检查失败', icon: 'fa-times', order: 7 },
  CHECK: { title: '人工检查', icon: 'fa-user-md', order: 8 }
}

/**
 * 获取 KPI 主题样式
 */
function getKpiTheme(item) {
  if (item.value <= 0) return 'theme-secondary'

  const param = item.pageParam
  if (param === 'OK' || param === 'hostOkAll') return 'theme-success'
  if (param === 'FAILED' || param === 'hostFailedAll') return 'theme-danger'
  if (param === 'CHECK' || param === 'hostCheckAll') return 'theme-info'
  if (param === 'hostAll') return 'theme-primary'
  return 'theme-secondary'
}

/**
 * 获取状态标签类型
 */
function getStatusTagType(status) {
  const typeMap = {
    OK: 'success',
    FAILED: 'danger',
    CHECK: 'warning',
    SKIPPING: 'info',
    UNREACHABLE: 'info'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取状态图标
 */
function getStatusIcon(status) {
  const iconMap = {
    OK: 'fa-check',
    FAILED: 'fa-times',
    CHECK: 'fa-user-md',
    SKIPPING: 'fa-adjust',
    UNREACHABLE: 'fa-question'
  }
  return iconMap[status] || 'fa-question'
}

/**
 * 获取状态文本
 */
function getStatusLabel(status) {
  const labelMap = {
    OK: '检查通过',
    FAILED: '检查失败',
    CHECK: '人工检查',
    SKIPPING: '已跳过',
    UNREACHABLE: '无数据'
  }
  return labelMap[status] || status || '-'
}

/**
 * 加载任务信息
 */
async function loadJobInfo() {
  const isCurrent = beginRead('job')
  try {
    const res = await jobApi.getJob(currentJobId.value)
    if (!isCurrent()) return
    jobInfo.value = res?.data || res || {}
  } catch (error) {
    if (!isCurrent()) return
    console.error('获取任务信息失败:', error)
  }
}

/**
 * 加载 KPI 数据
 */
async function loadKpiData() {
  const isCurrent = beginRead('kpi')
  kpiLoading.value = true
  kpiError.value = ''
  kpiList.value = []
  try {
    const res = await dtsApi.getStructuralKpi(currentJobId.value)
    if (!isCurrent()) return
    const data = res?.data || res || {}
    const records = data.records || []

    // 转换为 KPI 列表
    const list = []
    records.forEach(rec => {
      const def = kpiDefs[rec.name]
      if (def) {
        list.push({
          name: def.title,
          value: rec.value,
          icon: def.icon,
          pageParam: rec.name,
          _order: def.order
        })
      }
    })

    // 按顺序排序
    list.sort((a, b) => a._order - b._order)
    kpiList.value = list
  } catch (error) {
    if (!isCurrent()) return
    kpiError.value = '加载架构图统计失败，请重试'
    console.error('加载 KPI 数据失败:', error)
  } finally {
    if (isCurrent()) kpiLoading.value = false
  }
}

/**
 * 加载结构图数据
 */
async function loadDiagramData() {
  const isCurrent = beginRead('diagram')
  loading.value = true
  diagramError.value = ''
  try {
    const res = await jobApi.getStructuralDiagram(currentJobId.value)
    if (!isCurrent()) return
    diagramData.value = res?.data || res || []

    await nextTick()
    if (!isCurrent()) return
    renderChart()
  } catch (error) {
    if (!isCurrent()) return
    diagramError.value = '加载架构图失败，请重试'
    console.error('加载结构图失败:', error)
    ElMessage.error('加载结构图失败')
  } finally {
    if (isCurrent()) loading.value = false
  }
}

/**
 * 渲染 ECharts 图表
 */
function renderChart() {
  if (!chartRef.value) return

  // 初始化或获取图表实例
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  // 处理数据，计算节点数量以调整高度
  let subCount = 0
  let itemCount = 0

  function countNodes(nodes) {
    for (const node of nodes) {
      if (node.type === 'sub') subCount++
      if (node.type === 'item') itemCount++
      if (node.children?.length) {
        countNodes(node.children)
      }
    }
    return nodes
  }

  countNodes(diagramData.value)

  // 动态调整高度
  if (itemCount > 20) {
    const height = 620 + 40 * (itemCount - 20)
    chartRef.value.style.height = `${height}px`
    chartInstance.resize()
  }

  const option = {
    toolbox: {
      show: true,
      feature: {
        restore: { show: true },
        saveAsImage: { show: true }
      }
    },
    series: [
      {
        type: 'tree',
        data: diagramData.value,
        top: '2%',
        left: '33%',
        bottom: '2%',
        right: '40%',
        itemStyle: {
          borderColor: '#3b82f6',
          borderWidth: 2,
          backgroundColor: '#ffffff'
        },
        lineStyle: {
          color: '#94a3b8',
          width: 1.5,
          curveness: 0.35
        },
        symbolSize: 8,
        label: {
          position: 'left',
          formatter: params => {
            if (params.data.type === 'root') {
              return [
                `{root_name|${params.data.name}}`,
                ' ',
                `{root_count|${params.data.count}}`
              ].join('')
            }
            if (params.data.type === 'sub') {
              return [
                `{sub_name|${params.data.name}}`,
                ' ',
                `{sub_count|${params.data.count}}`
              ].join('')
            }
            return params.data.name
          },
          rich: {
            root_name: {
              verticalAlign: 'middle',
              align: 'right',
              borderRadius: 6,
              padding: [6, 12, 6, 12],
              backgroundColor: '#1e293b',
              color: '#ffffff',
              fontWeight: 600
            },
            root_count: {
              padding: [6, 10, 4, 8],
              color: '#ffffff',
              backgroundColor: '#ef4444',
              fontWeight: 'bold',
              borderRadius: 999
            },
            sub_count: {
              padding: [6, 10, 4, 8],
              color: '#ffffff',
              backgroundColor: '#ef4444',
              fontWeight: 'bold',
              borderRadius: 999
            },
            sub_name: {
              verticalAlign: 'middle',
              align: 'right',
              borderRadius: 6,
              padding: [6, 12, 6, 12],
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 500
            }
          }
        },
        leaves: {
          label: {
            position: 'right',
            formatter: params => {
              return [`{count|${params.data.count}}`, ' ', `{name|${params.data.name}}`].join('')
            },
            rich: {
              count: {
                padding: [6, 10, 4, 8],
                color: '#ffffff',
                backgroundColor: '#ef4444',
                fontWeight: 'bold',
                borderRadius: 999
              },
              name: {
                verticalAlign: 'middle',
                align: 'left',
                fontSize: 11,
                fontWeight: 500,
                borderColor: '#cbd5e1',
                borderWidth: 1,
                borderRadius: 6,
                padding: [5, 10, 5, 10],
                backgroundColor: '#f8fafc',
                color: '#0f172a'
              }
            }
          }
        },
        animationDurationUpdate: 750
      }
    ]
  }

  chartInstance.setOption(option)

  // 绑定事件
  chartInstance.off('click')
  chartInstance.off('dblclick')

  // 双击一级业务节点
  chartInstance.on('dblclick', params => {
    if (params.data?.type === 'sub') {
      showPrimaryDialog(params.data.name)
    }
  })

  // 单击二级业务节点
  chartInstance.on('click', params => {
    if (params.data?.type === 'item') {
      const value = params.data.value || ''
      const [primaryService, secondaryService] = value.split('::')
      showSecondaryDialog(primaryService, secondaryService)
    }
  })
}

/**
 * 显示一级业务详情弹窗
 */
async function showPrimaryDialog(primaryService, preserveSearch = false) {
  const isCurrent = beginRead('primary')
  currentPrimaryService.value = primaryService
  // 重置搜索
  if (!preserveSearch) primaryFilterText.value = ''
  primaryDialogTitle.value = `${primaryService} - 二级业务列表`
  primaryDialogVisible.value = true
  primaryLoading.value = true
  primaryError.value = ''
  primaryData.value = []
  primaryStats.value = { count: 0, itemTotal: 0, hostTotal: 0 }

  try {
    const res = await jobApi.getStructuralDiagramPrimaryInfo({
      jobId: currentJobId.value,
      primaryService
    })
    if (!isCurrent() || !primaryDialogVisible.value) return
    const data = res?.data || res || {}
    primaryData.value = data.primaryData || []
    primaryStats.value = {
      count: primaryData.value.length,
      itemTotal: data.itemTotal || 0,
      hostTotal: data.hostTotal || 0
    }
  } catch (error) {
    if (!isCurrent() || !primaryDialogVisible.value) return
    primaryError.value = '获取一级业务详情失败，请重试'
    console.error('获取一级业务详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    if (isCurrent() && primaryDialogVisible.value) primaryLoading.value = false
  }
}

/**
 * 显示二级业务详情弹窗
 */
async function showSecondaryDialog(primaryService, secondaryService, preserveSearch = false) {
  const isCurrent = beginRead('secondary')
  currentSecondaryContext.value = { primaryService, secondaryService }
  // 重置搜索
  if (!preserveSearch) {
    secondaryItemFilterText.value = ''
    secondaryHostFilterText.value = ''
    secondaryActiveTab.value = 'item'
  }
  secondaryDialogTitle.value = `${secondaryService} - 详情`
  secondaryDialogVisible.value = true
  secondaryLoading.value = true
  secondaryError.value = ''
  itemData.value = []
  hostData.value = []

  try {
    const res = await jobApi.getStructuralDiagramHostItemInfo({
      jobId: currentJobId.value,
      primaryService,
      secondaryService
    })
    if (!isCurrent() || !secondaryDialogVisible.value) return
    const data = res?.data || res || {}
    itemData.value = data.itemLists || []
    hostData.value = data.hostLists || []
  } catch (error) {
    if (!isCurrent() || !secondaryDialogVisible.value) return
    secondaryError.value = '获取二级业务详情失败，请重试'
    console.error('获取二级业务详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    if (isCurrent() && secondaryDialogVisible.value) secondaryLoading.value = false
  }
}

/**
 * 显示主机列表
 */
function showHostList(hostStr) {
  if (!hostStr) return
  const hosts = hostStr.split(',').map(h => ({ name: h.trim() }))
  listDialogTitle.value = '主机列表'
  listData.value = hosts
  listDialogVisible.value = true
}

/**
 * 显示检查项列表
 */
function showItemList(itemStr) {
  if (!itemStr) return
  const items = itemStr.split(',').map(i => ({ name: i.trim() }))
  listDialogTitle.value = '检查项列表'
  listData.value = items
  listDialogVisible.value = true
}

/**
 * KPI 卡片点击 - 打开详情弹窗
 */
async function handleKpiClick(item, preserveSearch = false) {
  // 重置搜索
  if (!preserveSearch) kpiFilterText.value = ''
  if (!item.pageParam) {
    console.warn('Unknown KPI type:', item.pageParam)
    return
  }

  const isCurrent = beginRead('kpiDetail')
  currentKpi.value = item
  kpiDialogError.value = ''

  kpiDialogType.value = item.pageParam
  kpiDialogTitle.value = `${item.name} - 详情`
  kpiDialogVisible.value = true
  kpiDialogLoading.value = true
  kpiDialogData.value = []

  try {
    let res
    if (item.pageParam === 'hostAll') {
      res = await dtsApi.getStructuralKpiHostAll(currentJobId.value)
    } else if (item.pageParam === 'hostOkAll') {
      res = await dtsApi.getStructuralKpiHostOk(currentJobId.value)
    } else if (item.pageParam === 'hostFailedAll') {
      res = await dtsApi.getStructuralKpiHostFailed(currentJobId.value)
    } else if (item.pageParam === 'hostCheckAll') {
      res = await dtsApi.getStructuralKpiHostCheck(currentJobId.value)
    } else if (item.pageParam === 'itemAll') {
      res = await dtsApi.getStructuralKpiItemAll(currentJobId.value)
    } else if (['OK', 'FAILED', 'CHECK'].includes(item.pageParam)) {
      res = await dtsApi.getCheckItemByStatus(currentJobId.value, item.pageParam)
    } else {
      throw new Error(`Unknown KPI type: ${item.pageParam}`)
    }
    if (!isCurrent() || !kpiDialogVisible.value) return
    const data = res?.data || res || {}
    kpiDialogData.value = data.records || []
  } catch (error) {
    if (!isCurrent() || !kpiDialogVisible.value) return
    kpiDialogError.value = '获取统计详情失败，请重试'
    console.error('获取 KPI 详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    if (isCurrent() && kpiDialogVisible.value) kpiDialogLoading.value = false
  }
}

/**
 * 显示检查项详情弹窗
 * 调用 CAC_GET_CHECK_ITEM_INFO 数据集获取详细信息
 */
async function showCheckItemDetail(row) {
  const isCurrent = beginRead('item')
  selectedCheckItem.value = { ...row }
  checkItemError.value = ''
  currentCheckItem.value = { ...row }
  checkItemDetailVisible.value = true
  checkItemDetailLoading.value = true

  try {
    // 通过 id 调用 CAC_GET_CHECK_ITEM_INFO 获取详细信息
    if (row.id) {
      const res = await dtsApi.getCheckItemInfo(row.id)
      if (!isCurrent() || !checkItemDetailVisible.value) return
      const data = res?.data || res || {}
      const records = data.records || []
      if (records.length > 0) {
        const record = records[0]
        currentCheckItem.value = {
          ...row,
          status: record.status,
          name: record.name,
          output: record.output ?? '',
          host_key: record.host_key,
          host_id: record.host_id,
          job_id: record.job_id
        }
      }
    }
  } catch (error) {
    if (!isCurrent() || !checkItemDetailVisible.value) return
    checkItemError.value = '获取检查项详情失败，当前仅显示已有信息，请重试'
    console.error('获取检查项详情失败:', error)
    // 即使失败也显示基本信息
  } finally {
    if (isCurrent() && checkItemDetailVisible.value) checkItemDetailLoading.value = false
  }
}

/**
 * 下载图片
 */
function downloadImage() {
  if (!chartInstance) return

  const url = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })

  const link = document.createElement('a')
  link.href = url
  link.download = `${jobInfo.value.templateName || '架构图'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 导出 Excel
 */
async function exportExcel() {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-console'
    const url = `${baseURL}/audit/api/audit/v2/results/export/${currentJobId.value}`

    const authHeaders = authService.getAuthHeaders()

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    if (!response.ok) {
      throw new Error('下载失败')
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)

    const now = new Date()
    const datetime = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${jobInfo.value.templateName || '巡检结果'}${datetime}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出 Excel 失败:', error)
    ElMessage.error('导出失败')
  }
}

/**
 * 获取当前模块基础路径
 */
function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/cac'
}

/**
 * 返回检查结果列表
 */
function goBack() {
  router.push({
    path: `${getBasePath()}/results`,
    query: pickResultListRouteQuery(route.query)
  })
}

/**
 * 窗口大小变化时重新渲染图表
 */
function handleResize() {
  chartInstance?.resize()
}

/**
 * 从路由中提取任务ID
 */
function extractJobId() {
  // 优先从 params.jobId 获取
  if (route.params.jobId) {
    return route.params.jobId
  }

  // 从 query 获取
  if (route.query.jobId) {
    return route.query.jobId
  }

  // 从 pathMatch 中提取 (路径格式: structural-diagram/{jobId})
  const pathMatch = route.params.pathMatch
  if (pathMatch) {
    const pathArr = Array.isArray(pathMatch) ? pathMatch : [pathMatch]
    // 路径可能是 ['structural-diagram', 'xxx-job-id'] 或 'structural-diagram/xxx-job-id'
    const fullPath = pathArr.join('/')
    const match = fullPath.match(/structural-diagram\/(.+)/)
    if (match && match[1]) {
      return match[1]
    }
    // 如果 pathMatch 是数组，jobId 可能在第二个元素
    if (pathArr.length >= 2 && pathArr[0] === 'structural-diagram') {
      return pathArr[1]
    }
  }

  // 从 URL 路径中提取
  const path = route.path
  const urlMatch = path.match(/structural-diagram\/([^/]+)/)
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1]
  }

  return ''
}

/**
 * 初始化加载数据
 */
function initData() {
  if (!currentJobId.value) {
    ElMessage.error('缺少任务ID')
    goBack()
    return
  }

  invalidateReads()
  jobInfo.value = {}
  kpiList.value = []
  diagramData.value = []
  kpiError.value = ''
  diagramError.value = ''
  chartInstance?.clear()

  // 加载数据
  loadJobInfo()
  loadKpiData()
  loadDiagramData()
}

function invalidateReads() {
  Object.keys(reads).forEach(key => {
    reads[key] += 1
  })
  loading.value = false
  kpiLoading.value = false
  primaryDialogVisible.value = false
  secondaryDialogVisible.value = false
  listDialogVisible.value = false
  kpiDialogVisible.value = false
  checkItemDetailVisible.value = false
}

function scheduleInit() {
  const request = ++contextRequest
  nextTick(() => {
    if (request === contextRequest && active && !disposed && currentJobId.value) initData()
  })
}

// 嵌入窗口使用传入报告；独立页只消费自身路由中的报告。
watch(
  () => props.jobId || (route.path.includes('/structural-diagram/') ? extractJobId() : ''),
  newJobId => {
    currentJobId.value = newJobId
    if (newJobId) scheduleInit()
    else {
      contextRequest += 1
      invalidateReads()
    }
  },
  { immediate: true, flush: 'post' }
)

onMounted(() => {
  if (!currentJobId.value) initData()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onActivated(() => {
  if (active) return
  active = true
  if (currentJobId.value) scheduleInit()
})
onDeactivated(() => {
  active = false
  contextRequest += 1
  invalidateReads()
})
onBeforeUnmount(() => {
  disposed = true
  contextRequest += 1
  invalidateReads()
})

onUnmounted(() => {
  // 清理图表实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.structural-diagram-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  overflow: auto;
}

.topology-header-card,
.diagram-container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  min-width: 0;
}

.topology-header-card {
  flex-shrink: 0;
}

// 顶部导航栏
.page-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .navbar-left {
    :deep(.el-breadcrumb) {
      font-size: 13px;

      .el-breadcrumb__item {
        .el-breadcrumb__inner {
          a {
            color: var(--el-color-primary);
            cursor: pointer;
            font-weight: normal;

            &:hover {
              text-decoration: underline;
            }
          }
        }

        &:last-child {
          .el-breadcrumb__inner {
            color: var(--el-text-color-primary);
            font-weight: 600;
          }
        }
      }
    }
  }

  .navbar-right {
    display: flex;
    gap: 8px;
    i {
      margin-right: 4px;
    }
  }
}

.kpi-section-body {
  padding: 12px 16px;
}

.kpi-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  .kpi-heading-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .kpi-heading-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

// KPI 容器
.kpi-container {
  display: grid;
  grid-template-columns: repeat(8, minmax(110px, 1fr));
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  overflow: hidden;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  padding: 10px 14px;
  background: transparent;
  border-right: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: var(--el-fill-color-light);
  }

  .kpi-title {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .kpi-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .kpi-content {
    .kpi-value {
      font-size: 20px;
      font-weight: 600;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
      color: var(--el-text-color-primary);
    }
  }

  &.theme-success {
    .kpi-dot {
      background: var(--el-color-success);
    }
  }

  &.theme-danger {
    .kpi-dot {
      background: var(--el-color-danger);
    }
    .kpi-value {
      color: var(--el-color-danger);
    }
  }

  &.theme-info {
    .kpi-dot {
      background: var(--el-color-warning);
    }
  }

  &.theme-primary {
    .kpi-dot {
      background: var(--el-color-primary);
    }
  }

  &.theme-secondary {
    .kpi-dot {
      background: var(--el-text-color-secondary);
    }
  }
}

@media (max-width: 1280px) {
  .kpi-container {
    grid-template-columns: repeat(4, minmax(120px, 1fr));
  }
  .kpi-card {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

// 图表容器
.diagram-container {
  display: flex;
  flex-direction: column;
  // 保留图表的内容高度，超出可用空间时由页面滚动。
  flex: 1 0 auto;
  overflow: hidden;
}

.diagram-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.diagram-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  .diagram-subtitle {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.diagram-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  padding: 4px 10px;
  border-radius: 999px;
  i {
    color: var(--el-color-primary);
  }
}

.echart-container {
  flex: 1 0 auto;
  width: 100%;
  min-height: 620px;
  height: 620px;
  padding: 12px;
}

// 弹窗统计信息
.primary-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-bg-color-page);
  border-radius: 4px;

  .stat-item {
    font-size: 14px;
    color: var(--el-text-color-regular);

    strong {
      color: var(--el-text-color-primary);
      font-size: 16px;
    }
  }
}

.tab-stats {
  margin-bottom: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

// 表格样式
:deep(.el-table) {
  font-size: 13px;

  .el-table__header th {
    font-weight: 500;
  }
}

// 巡检结果详情弹窗
.check-item-detail-dialog {
  .result-item {
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.8;

    .result-label {
      font-weight: bold;
      color: var(--el-text-color-primary);
    }

    .result-value {
      color: var(--el-text-color-regular);
    }
  }

  .output-content {
    margin-top: 8px;

    pre {
      max-height: 350px;
      padding: 12px;
      background: var(--el-bg-color-page);
      color: var(--el-text-color-primary);
      border: 1px solid var(--el-border-color-light);
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;

      &.empty {
        color: var(--el-text-color-secondary);
        font-style: italic;
      }
    }
  }
}
</style>
