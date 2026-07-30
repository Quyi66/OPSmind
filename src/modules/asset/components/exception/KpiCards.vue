<template>
  <div class="kpi-dashboard" v-loading="loading">
    <!-- 左侧卡片：健康度环形图 -->
    <div class="dashboard-card left-card">
      <div class="chart-header">
        <span class="chart-title">连通性概览</span>
      </div>
      <div class="chart-container" ref="chartRef"></div>
    </div>

    <!-- 右侧卡片：连通诊断详情 -->
    <div class="dashboard-card right-card">
      <div class="list-header">
        <span class="list-title">连通诊断详情</span>
      </div>
      <div class="metrics-list">
        <div
          v-for="item in listData"
          :key="item.condi"
          class="metric-item"
          @click="handleItemClick(item.queryCondi)"
        >
          <!-- 图标 -->
          <div class="metric-icon-wrapper" :class="item.theme">
            <i :class="['fa', item.icon]"></i>
          </div>

          <!-- 中间信息 -->
          <div class="metric-content">
            <div class="metric-info-row">
              <span class="metric-name">{{ item.title }}</span>
              <span class="metric-value" :class="item.theme">{{ item.value.toLocaleString('zh-CN') }} 台</span>
            </div>
            <!-- 进度条背景 -->
            <div class="metric-progress-bg">
              <div
                class="metric-progress-bar"
                :class="item.theme"
                :style="{ width: `${item.percent}%` }"
              ></div>
            </div>
          </div>

          <!-- 箭头 -->
          <div class="metric-arrow">
            <i class="fa fa-angle-right"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const chartRef = ref(null)
let chartInstance = null
let resizeObserver = null

// 解析接口数据 (兼容 status "0"/"1" 以及旧 condi "recently_ok"/"recently")
const parsedStats = computed(() => {
  let okCount = 0
  let failCount = 0

  props.data.forEach(item => {
    const s = String(item.status ?? item.condi ?? '')
    const c = Number(item.count ?? item.c ?? 0) || 0
    if (s === '0' || s === 'recently_ok') {
      okCount += c
    } else if (s === '1' || s === 'recently' || s === 'sjxy_all') {
      failCount += c
    }
  })

  const total = okCount + failCount
  const rawRate = total > 0 ? (okCount / total) * 100 : 0
  const successRate = total > 0
    ? (okCount < total && rawRate > 99 ? rawRate.toFixed(1) : Math.round(rawRate))
    : 0

  return { okCount, failCount, total, successRate }
})

// 列表数据
const listData = computed(() => {
  const { okCount, failCount, total } = parsedStats.value

  const calcProgressPercent = (val) => {
    if (!val || !total) return 0
    if (val === total) return 100
    // 使用平方根比例尺处理极大值与较小值差异，确保非零的小数量（如 132 台）也能展现明显可视长度（约 7% 宽度）
    const ratioPct = (Math.sqrt(val) / Math.sqrt(total)) * 100
    return Math.min(Math.max(Number(ratioPct.toFixed(1)), 5), 100)
  }

  return [
    {
      condi: '0',
      queryCondi: 'recently_ok',
      title: '连通正常设备',
      icon: 'fa-check-circle',
      theme: 'success',
      value: okCount,
      percent: calcProgressPercent(okCount)
    },
    {
      condi: '1',
      queryCondi: 'recently',
      title: '连通异常设备',
      icon: 'fa-exclamation-triangle',
      theme: 'danger',
      value: failCount,
      percent: calcProgressPercent(failCount)
    }
  ]
})

// 初始化图表
function initChart() {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')

  const { okCount, failCount, successRate } = parsedStats.value

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{b}: {c} 台 ({d}%)'
    },
    title: {
      text: `${successRate}%`,
      subtext: '连通率',
      left: 'center',
      top: '26%',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDark.value ? '#e5e7eb' : '#303133',
        fontFamily: 'Inter, sans-serif'
      },
      subtextStyle: {
        fontSize: 11,
        color: isDark.value ? '#9ca3af' : '#909399',
        marginTop: 2
      }
    },
    legend: {
      bottom: '0',
      left: 'center',
      icon: 'circle',
      itemGap: 16,
      textStyle: {
        color: isDark.value ? '#d1d5db' : '#606266',
        fontSize: 12
      }
    },
    series: [
      {
        name: '连通状态',
        type: 'pie',
        radius: ['58%', '76%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark.value ? '#374151' : '#fff',
          borderWidth: 2
        },
        label: { show: false },
        labelLine: { show: false },
        data: [
          {
            value: okCount,
            name: '连通正常',
            condi: 'recently_ok',
            itemStyle: { color: '#67C23A' }
          },
          {
            value: failCount,
            name: '连通异常',
            condi: 'recently',
            itemStyle: { color: '#F56C6C' }
          }
        ]
      }
    ]
  }

  chartInstance.setOption(option)

  chartInstance.on('click', params => {
    if (params.data && params.data.condi) {
      handleItemClick(params.data.condi)
    }
  })
}

function handleItemClick(condition) {
  emit('click', { conditions: condition })
}

const handleResize = () => {
  chartInstance && chartInstance.resize()
}

watch(
  () => props.data,
  () => {
    nextTick(() => {
      initChart()
      setTimeout(() => chartInstance?.resize(), 50)
    })
  },
  { deep: true }
)

// Watch for dark mode changes
watch(isDark, () => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  nextTick(() => {
    initChart()
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

onMounted(() => {
  nextTick(() => {
    initChart()
  })
  window.addEventListener('resize', handleResize)

  if (chartRef.value && window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.kpi-dashboard {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  height: 170px;
}

.dashboard-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
}

.left-card {
  flex: 0 0 260px;
  padding: 10px 16px;
  position: relative;
}

.chart-header {
  text-align: center;
  margin-bottom: 4px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-container {
  flex: 1;
  width: 100%;
}

.right-card {
  flex: 1;
  padding: 10px 20px;
}

.list-header {
  margin-bottom: 8px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  position: relative;
  padding-left: 10px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 14px;
    background: var(--el-color-primary);
    border-radius: 2px;
  }
}

.metrics-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
}

.metric-item {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--el-bg-color-page);
  border: 1px solid transparent;

  &:hover {
    background: var(--el-fill-color-light);
    transform: translateX(4px);

    .metric-arrow {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.metric-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  margin-right: 12px;
  flex-shrink: 0;

  &.success {
    background: rgba(103, 194, 58, 0.1);
    color: #67c23a;
  }
  &.warning {
    background: rgba(250, 173, 20, 0.1);
    color: #faad14;
  }
  &.danger {
    background: rgba(255, 77, 79, 0.1);
    color: #ff4d4f;
  }
  &.primary {
    background: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }
}

.metric-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 16px;
}

.metric-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-name {
  font-size: 13px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.metric-value {
  font-size: 15px;
  font-weight: 700;
  font-family: 'Inter', sans-serif;

  &.success {
    color: #67c23a;
  }
  &.warning {
    color: #faad14;
  }
  &.danger {
    color: #ff4d4f;
  }
  &.primary {
    color: #1890ff;
  }
}

.metric-progress-bg {
  height: 6px;
  background: var(--el-fill-color);
  border-radius: 3px;
  width: 100%;
  overflow: hidden;
}

.metric-progress-bar {
  height: 100%;
  border-radius: 3px;
  width: 0;
  transition: width 0.8s ease-out;

  &.success {
    background: linear-gradient(90deg, #67c23a, #95d475);
  }
  &.warning {
    background: linear-gradient(90deg, #faad14, #ffd666);
  }
  &.danger {
    background: linear-gradient(90deg, #ff4d4f, #ff7875);
  }
  &.primary {
    background: linear-gradient(90deg, #1890ff, #40a9ff);
  }
}

.metric-arrow {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}
</style>
