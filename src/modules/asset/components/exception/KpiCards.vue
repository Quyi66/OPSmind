<template>
  <div class="kpi-dashboard" v-loading="loading">
    <!-- 左侧卡片：健康度环形图 -->
    <div class="dashboard-card left-card">
      <div class="chart-header">
        <span class="chart-title">连通性概览</span>
      </div>
      <div class="chart-container" ref="chartRef"></div>
    </div>

    <!-- 右侧卡片：异常详情列表 -->
    <div class="dashboard-card right-card">
      <div class="list-header">
        <span class="list-title">异常诊断详情</span>
      </div>
      <div class="metrics-list">
        <div
          v-for="item in listData"
          :key="item.condi"
          class="metric-item"
          @click="handleItemClick(item.condi)"
        >
          <!-- 图标 -->
          <div class="metric-icon-wrapper" :class="item.theme">
            <i :class="['fa', item.icon]"></i>
          </div>

          <!-- 中间信息 -->
          <div class="metric-content">
            <div class="metric-info-row">
              <span class="metric-name">{{ item.title }}</span>
              <span class="metric-value" :class="item.theme">{{ item.value }}</span>
            </div>
            <!-- 进度条背景 -->
            <div class="metric-progress-bg">
              <div
                class="metric-progress-bar"
                :class="item.theme"
                :style="{ width: calculatePercent(item.value) }"
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

// KPI 定义
const kpiConfig = {
  recently_ok: { title: '连通成功', color: '#67C23A' },
  recently: { title: '连通失败', color: '#F56C6C' },
  oplus_all: {
    title: '所有连通异常',
    icon: 'fa-exclamation',
    theme: 'warning'
  },
  today: {
    title: '当日新增异常',
    icon: 'fa-bell',
    theme: 'danger'
  },
  low: {
    title: '连通率 < 50%',
    icon: 'fa-chart-pie',
    theme: 'primary'
  }
}

// 数据映射
const dataMap = computed(() => {
  const map = {}
  props.data.forEach(item => {
    map[item.condi] = item.c
  })
  return map
})

// 列表数据
const listData = computed(() => {
  const list = ['oplus_all', 'today', 'low']
  return list.map(key => {
    const conf = kpiConfig[key]
    return {
      condi: key,
      title: conf.title,
      icon: conf.icon,
      theme: conf.theme,
      value: dataMap.value[key] || 0
    }
  })
})

const maxValue = computed(() => {
  const values = listData.value.map(i => i.value)
  return Math.max(...values, 5) // 最小基数5
})

function calculatePercent(val) {
  if (val <= 0) return '0%'
  // 使用平方根比例尺（Square Root Scale）来处理高动态范围（High Dynamic Range）的数据，
  // 确保在最大值很大（例如几百）时，较小的不同非零值（如 5 和 2）依然能够呈现明显区别的条形图长度，且不会过于微小。
  const computedPercent = (Math.sqrt(val) / Math.sqrt(maxValue.value)) * 100
  return `${Math.min(Math.max(computedPercent, 3), 100)}%`
}

// 初始化图表
function initChart() {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')

  const okCount = dataMap.value['recently_ok'] || 0
  const failCount = dataMap.value['recently'] || 0
  const total = okCount + failCount
  const successRate = total > 0 ? Math.round((okCount / total) * 100) : 0

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    title: {
      text: `${successRate}%`,
      subtext: '连通率',
      left: 'center',
      top: '32%',
      textStyle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: isDark.value ? '#e5e7eb' : '#303133',
        fontFamily: 'Inter, sans-serif'
      },
      subtextStyle: {
        fontSize: 12,
        color: isDark.value ? '#9ca3af' : '#909399',
        marginTop: 4
      }
    },
    legend: {
      bottom: '10',
      left: 'center',
      icon: 'circle',
      itemGap: 24,
      textStyle: {
        color: isDark.value ? '#d1d5db' : '#606266',
        fontSize: 12
      }
    },
    series: [
      {
        name: '连通状态',
        type: 'pie',
        radius: ['55%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark.value ? '#374151' : '#fff',
          borderWidth: 3
        },
        label: { show: false },
        labelLine: { show: false },
        data: [
          {
            value: okCount,
            name: '连通成功',
            condi: 'recently_ok',
            itemStyle: { color: kpiConfig['recently_ok'].color }
          },
          {
            value: failCount,
            name: '连通失败',
            condi: 'recently',
            itemStyle: { color: kpiConfig['recently'].color }
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
  /* 移除一体化样式，改为 Flex 布局容器 */
  display: flex;
  gap: 24px; /* 卡片间距 */
  margin-bottom: 24px;
  height: 260px;
}

/* 统一样式 */
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

/* 左侧卡片 */
.left-card {
  flex: 0 0 320px; /* 固定宽度，比之前稍微宽一点以适应白色背景 */
  padding: 12px 20px;
  position: relative;
}

.chart-header {
  text-align: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-container {
  flex: 1;
  width: 100%;
}

/* 右侧卡片 */
.right-card {
  flex: 1; /* 占据剩余空间 */
  padding: 12px 30px;
}

.list-header {
  margin-bottom: 16px;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  position: relative;
  padding-left: 12px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 16px;
    background: var(--el-color-primary);
    border-radius: 2px;
  }
}

.metrics-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--el-bg-color-page); /* 列表项稍微加一点底色，与白色卡片区分 */
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 16px;
  flex-shrink: 0;

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
  gap: 6px;
  margin-right: 20px;
}

.metric-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-name {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  font-family: 'Inter', sans-serif;

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
  background: var(--el-fill-color); /* 加深一点背景条颜色 */
  border-radius: 3px;
  width: 100%;
  overflow: hidden;
}

.metric-progress-bar {
  height: 100%;
  border-radius: 1px;
  width: 0;
  transition: width 0.8s ease-out;

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
  font-size: 14px;
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}
</style>
