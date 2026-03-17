<template>
  <div class="ops-page-layout" style="padding: 0">
    <!-- 顶部导航栏 -->
    <nav class="page-navbar">
      <div class="navbar-left">
        <el-breadcrumb separator=">">
          <el-breadcrumb-item>
            <a @click="goBack">执行记录</a>
          </el-breadcrumb-item>
          <el-breadcrumb-item>{{ jobInfo.templateName || '架构图' }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="navbar-right">
        <el-button @click="exportExcel">
          <i class="fa fa-file-export"></i>
          导出结果
        </el-button>
      </div>
    </nav>

    <!-- KPI 指标卡片 -->
    <div v-loading="kpiLoading" class="kpi-container">
      <div
        v-for="item in kpiList"
        :key="item.pageParam"
        class="kpi-card"
        :class="getKpiTheme(item)"
        @click="handleKpiClick(item)"
      >
        <div class="kpi-icon">
          <i :class="['fa', item.icon]"></i>
        </div>
        <div class="kpi-content">
          <div class="kpi-value">{{ item.value }}</div>
          <div class="kpi-title">{{ item.name }}</div>
        </div>
      </div>
    </div>

    <!-- 结构图区域 -->
    <div v-loading="loading" class="diagram-container">
      <div ref="chartRef" class="echart-container"></div>
    </div>

    <!-- 一级业务详情弹窗 -->
    <el-dialog
      v-model="primaryDialogVisible"
      :title="primaryDialogTitle"
      width="800px"
      destroy-on-close
    >
      <div class="primary-detail-content">
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
    >
      <el-tabs v-model="secondaryActiveTab">
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
    <el-dialog v-model="listDialogVisible" :title="listDialogTitle" width="500px" destroy-on-close>
      <el-table :data="listData" max-height="400">
        <el-table-column prop="name" :label="listDialogTitle" />
      </el-table>
    </el-dialog>

    <!-- KPI 详情弹窗 -->
    <el-dialog v-model="kpiDialogVisible" :title="kpiDialogTitle" width="800px" destroy-on-close>
      <div class="kpi-detail-content">
        <!-- 搜索筛选 -->
        <div class="kpi-filter-bar" style="margin-bottom: 12px">
          <el-form inline size="small">
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
    <el-dialog v-model="checkItemDetailVisible" title="巡检结果" width="700px" destroy-on-close>
      <div v-loading="checkItemDetailLoading" class="check-item-detail-dialog">
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
        <div v-if="currentCheckItem?.output" class="output-content">
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { authService } from '@/core/auth'
import { jobApi, dtsApi } from '../api'

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

// 图表相关
const chartRef = ref(null)
let chartInstance = null

// 一级业务弹窗
const primaryDialogVisible = ref(false)
const primaryDialogTitle = ref('')
const primaryData = ref([])
const primaryStats = ref({ count: 0, itemTotal: 0, hostTotal: 0 })
const primaryFilterText = ref('')

/**
 * 一级业务过滤数据
 */
const filteredPrimaryData = computed(() => {
  if (!primaryFilterText.value) return primaryData.value
  const keyword = primaryFilterText.value.toLowerCase()
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

/**
 * 二级业务项过滤数据
 */
const filteredItemData = computed(() => {
  if (!secondaryItemFilterText.value) return itemData.value
  const keyword = secondaryItemFilterText.value.toLowerCase()
  return itemData.value.filter(item => item.item?.toLowerCase().includes(keyword))
})

/**
 * 二级业务主机过滤数据
 */
const filteredHostData = computed(() => {
  if (!secondaryHostFilterText.value) return hostData.value
  const keyword = secondaryHostFilterText.value.toLowerCase()
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

/**
 * KPI 详情过滤数据
 */
const filteredKpiDialogData = computed(() => {
  const data = kpiDialogData.value || []
  if (!kpiFilterText.value) return data

  const keyword = kpiFilterText.value.toLowerCase()
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
    SKIPPING: '白名单',
    UNREACHABLE: '无数据'
  }
  return labelMap[status] || status || '-'
}

/**
 * 加载任务信息
 */
async function loadJobInfo() {
  try {
    const res = await jobApi.getJob(currentJobId.value)
    jobInfo.value = res?.data || res || {}
  } catch (error) {
    console.error('获取任务信息失败:', error)
  }
}

/**
 * 加载 KPI 数据
 */
async function loadKpiData() {
  kpiLoading.value = true
  try {
    const res = await dtsApi.getStructuralKpi(currentJobId.value)
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
    console.error('加载 KPI 数据失败:', error)
  } finally {
    kpiLoading.value = false
  }
}

/**
 * 加载结构图数据
 */
async function loadDiagramData() {
  loading.value = true
  try {
    const res = await jobApi.getStructuralDiagram(currentJobId.value)
    diagramData.value = res?.data || res || []

    await nextTick()
    renderChart()
  } catch (error) {
    console.error('加载结构图失败:', error)
    ElMessage.error('加载结构图失败')
  } finally {
    loading.value = false
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
          borderColor: '#99512F',
          borderWidth: 2,
          backgroundColor: '#ffffff'
        },
        lineStyle: {
          color: '#99512F',
          width: 2,
          curveness: 0.3
        },
        symbolSize: 7,
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
              padding: [5, 10, 5, 10],
              backgroundColor: '#ff5e63',
              color: '#ffffff'
            },
            root_count: {
              padding: [7, 10, 4, 8],
              color: '#ffffff',
              backgroundColor: '#dc3545',
              fontWeight: 'bold',
              borderRadius: 50
            },
            sub_count: {
              padding: [7, 10, 4, 8],
              color: '#ffffff',
              backgroundColor: '#dc3545',
              fontWeight: 'bold',
              borderRadius: 50
            },
            sub_name: {
              verticalAlign: 'middle',
              align: 'right',
              borderRadius: 6,
              padding: [5, 10, 5, 10],
              backgroundColor: '#ff5e63',
              color: '#ffffff'
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
                padding: [7, 10, 4, 8],
                color: '#ffffff',
                backgroundColor: '#dc3545',
                fontWeight: 'bold',
                borderRadius: 50
              },
              name: {
                verticalAlign: 'middle',
                align: 'left',
                fontSize: 10,
                fontWeight: 400,
                borderColor: '#99512F',
                borderWidth: 1,
                borderRadius: 6,
                padding: [5, 10, 5, 10],
                backgroundColor: '#ffffff',
                color: 'black'
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
async function showPrimaryDialog(primaryService) {
  // 重置搜索
  primaryFilterText.value = ''
  primaryDialogTitle.value = `${primaryService} - 二级业务列表`
  primaryDialogVisible.value = true

  try {
    const res = await jobApi.getStructuralDiagramPrimaryInfo({
      jobId: currentJobId.value,
      primaryService
    })
    const data = res?.data || res || {}
    primaryData.value = data.primaryData || []
    primaryStats.value = {
      count: primaryData.value.length,
      itemTotal: data.itemTotal || 0,
      hostTotal: data.hostTotal || 0
    }
  } catch (error) {
    console.error('获取一级业务详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

/**
 * 显示二级业务详情弹窗
 */
async function showSecondaryDialog(primaryService, secondaryService) {
  // 重置搜索
  secondaryItemFilterText.value = ''
  secondaryHostFilterText.value = ''
  secondaryDialogTitle.value = `${secondaryService} - 详情`
  secondaryActiveTab.value = 'item'
  secondaryDialogVisible.value = true

  try {
    const res = await jobApi.getStructuralDiagramHostItemInfo({
      jobId: currentJobId.value,
      primaryService,
      secondaryService
    })
    const data = res?.data || res || {}
    itemData.value = data.itemLists || []
    hostData.value = data.hostLists || []
  } catch (error) {
    console.error('获取二级业务详情失败:', error)
    ElMessage.error('获取详情失败')
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
async function handleKpiClick(item) {
  // 重置搜索
  kpiFilterText.value = ''
  // 根据 KPI 类型确定数据集 ID 和查询参数
  const datasetMap = {
    hostAll: 'CAC_STRUCTURAL_KPI_HOSTALL',
    hostOkAll: 'CAC_STRUCTURAL_KPI_HOSTOK',
    hostFailedAll: 'CAC_STRUCTURAL_KPI_HOSTFAILED',
    hostCheckAll: 'CAC_STRUCTURAL_KPI_HOSTCHECK',
    itemAll: 'CAC_STRUCTURAL_KPI_ITEMALL',
    // OK/FAILED/CHECK 使用同一个数据集，通过 status 参数区分
    OK: 'CAC_GET_CHECK_ITEM_BY_STATUS',
    FAILED: 'CAC_GET_CHECK_ITEM_BY_STATUS',
    CHECK: 'CAC_GET_CHECK_ITEM_BY_STATUS'
  }

  const datasetId = datasetMap[item.pageParam]
  if (!datasetId) {
    console.warn('Unknown KPI type:', item.pageParam)
    return
  }

  kpiDialogType.value = item.pageParam
  kpiDialogTitle.value = `${item.name} - 详情`
  kpiDialogVisible.value = true
  kpiDialogLoading.value = true
  kpiDialogData.value = []

  try {
    // 构建查询参数
    const params = { job_id: currentJobId.value }

    // OK/FAILED/CHECK 类型需要传递 status 参数
    if (['OK', 'FAILED', 'CHECK'].includes(item.pageParam)) {
      params.status = item.pageParam
    }

    const res = await dtsApi.queryData(datasetId, params)
    const data = res?.data || res || {}
    kpiDialogData.value = data.records || []
  } catch (error) {
    console.error('获取 KPI 详情失败:', error)
    ElMessage.error('获取详情失败')
  } finally {
    kpiDialogLoading.value = false
  }
}

/**
 * 显示检查项详情弹窗
 * 调用 CAC_GET_CHECK_ITEM_INFO 数据集获取详细信息
 */
async function showCheckItemDetail(row) {
  currentCheckItem.value = { ...row }
  checkItemDetailVisible.value = true
  checkItemDetailLoading.value = true

  try {
    // 通过 id 调用 CAC_GET_CHECK_ITEM_INFO 获取详细信息
    if (row.id) {
      const res = await dtsApi.queryData('CAC_GET_CHECK_ITEM_INFO', { id: row.id })
      const data = res?.data || res || {}
      const records = data.records || []
      if (records.length > 0) {
        const record = records[0]
        currentCheckItem.value = {
          ...row,
          status: record.status,
          name: record.name,
          output: record.output || '',
          host_key: record.host_key,
          host_id: record.host_id,
          job_id: record.job_id
        }
      }
    }
  } catch (error) {
    console.error('获取检查项详情失败:', error)
    // 即使失败也显示基本信息
  } finally {
    checkItemDetailLoading.value = false
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
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/sjxy-portal'
    const url = `${baseURL}/cac/api/cac/v2/results/export/${currentJobId.value}`

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
  router.push(`${getBasePath()}/results`)
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

  // 加载数据
  loadJobInfo()
  loadKpiData()
  loadDiagramData()
}

// 监听 props.jobId 变化
watch(
  () => props.jobId,
  newJobId => {
    if (newJobId) {
      currentJobId.value = newJobId
      initData()
    }
  },
  { immediate: true }
)

onMounted(() => {
  // 如果没有通过 props 传入 jobId，则从路由中提取
  if (!props.jobId) {
    currentJobId.value = extractJobId()
    initData()
  }

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
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
  height: 100%;
  background: var(--el-bg-color-page);
}

// 顶部导航栏
.page-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);

  .navbar-left {
    :deep(.el-breadcrumb) {
      font-size: 14px;

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
            font-weight: 500;
          }
        }
      }
    }
  }

  .navbar-right {
    display: flex;
    gap: 8px;
  }
}

// KPI 容器
.kpi-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .kpi-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);

    i {
      font-size: 18px;
      color: inherit;
    }
  }

  .kpi-content {
    .kpi-value {
      font-size: 24px;
      font-weight: bold;
      line-height: 1.2;
    }

    .kpi-title {
      font-size: 12px;
      opacity: 0.9;
    }
  }

  // 主题样式
  &.theme-success {
    background: #28a745;
    color: #fff;
  }

  &.theme-danger {
    background: #dc3545;
    color: #fff;
  }

  &.theme-info {
    background: #00b0f0;
    color: #fff;
  }

  &.theme-primary {
    background: #206933;
    color: #fff;
  }

  &.theme-secondary {
    background: #6c757d;
    color: #fff;
  }
}

// 图表容器
.diagram-container {
  flex: 1;
  padding: 16px;
  // overflow: auto;
  background: var(--el-bg-color);
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.echart-container {
  width: 100%;
  min-height: 620px;
  height: 100%;
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
