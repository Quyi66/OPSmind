<template>
  <div class="chart-card" ref="cardRef">
    <div class="chart-header">
      <div class="header-left">
        <el-icon class="header-icon"><TrendCharts /></el-icon>
        <span class="chart-title">资产新增统计</span>
      </div>
      <el-button
        v-if="showControls"
        :icon="FullScreen"
        text
        @click="toggleFullscreen"
        title="全屏"
      />
    </div>
    <div ref="chartRef" class="chart-container" v-loading="loading"></div>

    <!-- 全屏弹窗 -->
    <el-dialog
      v-model="fullscreenVisible"
      title="资产新增统计"
      width="90%"
      destroy-on-close
      append-to-body
    >
      <div ref="fullscreenChartRef" class="fullscreen-chart"></div>
    </el-dialog>
  </div>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'
const { isDark } = useTheme()
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { FullScreen, TrendCharts } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  showControls: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['refresh'])

const cardRef = ref(null)
const chartRef = ref(null)
const fullscreenChartRef = ref(null)
const fullscreenVisible = ref(false)
let chartInstance = null
let fullscreenChartInstance = null
let resizeObserver = null

const trendAccent = {
  primary: '#0F766E',
  secondary: '#2DD4BF',
  glow: 'rgba(45, 212, 191, 0.26)'
}

function getChartOption() {
  const xData = props.data.map(item => {
    // 格式化日期为 MM-DD
    const date = new Date(item.times)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  })
  const yData = props.data.map(item => Number(item.total || 0))
  const axisColor = isDark.value ? 'rgba(148, 163, 184, 0.82)' : '#64748b'
  const splitLineColor = isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)'
  const legendColor = isDark.value ? '#cbd5e1' : '#475569'
  const labelColor = isDark.value ? '#f8fafc' : '#0f172a'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: trendAccent.secondary,
          width: 1,
          opacity: 0.45
        }
      },
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      textStyle: { color: labelColor },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      textStyle: {
        color: legendColor,
        fontSize: 11,
        fontWeight: 600
      },
      data: ['近10次新增']
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '5%',
      top: '16%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisTick: {
        show: false
      },
      axisLabel: {
        color: axisColor,
        fontSize: 11,
        interval: 0
      },
      axisLine: {
        lineStyle: { color: splitLineColor }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      precision: 0,
      splitNumber: 4,
      axisLabel: {
        color: axisColor,
        fontSize: 11,
        formatter: value => `${Math.round(value)}`
      },
      splitLine: {
        lineStyle: {
          color: splitLineColor,
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '近10次新增',
        type: 'line',
        data: yData,
        smooth: 0.35,
        showAllSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: trendAccent.secondary,
          width: 3,
          shadowColor: trendAccent.glow,
          shadowBlur: 10
        },
        itemStyle: {
          color: trendAccent.secondary,
          borderColor: isDark.value ? '#0f172a' : '#ffffff',
          borderWidth: 3
        },
        label: {
          show: xData.length <= 10,
          position: 'top',
          distance: 8,
          color: labelColor,
          fontSize: 11,
          fontWeight: 600,
          formatter: params => Math.round(params.value || 0)
        },
        labelLayout: {
          hideOverlap: true
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(45,212,191,0.34)' },
            { offset: 0.5, color: 'rgba(20,184,166,0.14)' },
            { offset: 1, color: 'rgba(20,184,166,0.02)' }
          ])
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowColor: trendAccent.glow,
            shadowBlur: 16
          }
        }
      }
    ]
  }
}

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')
  updateChart()
}

function updateChart() {
  if (!chartInstance) return
  chartInstance.setOption(getChartOption())
}

function toggleFullscreen() {
  fullscreenVisible.value = true
  nextTick(() => {
    if (fullscreenChartRef.value) {
      fullscreenChartInstance = echarts.init(fullscreenChartRef.value, isDark.value ? 'dark' : '')
      fullscreenChartInstance.setOption(getChartOption())
    }
  })
}

watch(fullscreenVisible, val => {
  if (!val && fullscreenChartInstance) {
    fullscreenChartInstance.dispose()
    fullscreenChartInstance = null
  }
})

function handleResize() {
  chartInstance?.resize()
}

watch(
  () => props.data,
  () => {
    updateChart()
    if (fullscreenChartInstance) {
      fullscreenChartInstance.setOption(getChartOption())
    }
    nextTick(() => {
      chartInstance?.resize()
    })
  },
  { deep: true }
)

watch(isDark, () => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')
    updateChart()
  }
  if (fullscreenChartInstance && fullscreenVisible.value) {
    fullscreenChartInstance.dispose()
    fullscreenChartInstance = echarts.init(fullscreenChartRef.value, isDark.value ? 'dark' : '')
    fullscreenChartInstance.setOption(getChartOption())
  }
})

onMounted(() => {
  nextTick(() => {
    initChart()
    if (chartRef.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        chartInstance?.resize()
      })
      resizeObserver.observe(chartRef.value)
    }
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  chartInstance?.dispose()
  fullscreenChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.chart-card {
  background: var(
    --asset-chart-card-bg,
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92))
  );
  border-radius: 18px;
  padding: 16px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--asset-chart-card-border, rgba(148, 163, 184, 0.14));
  box-shadow: var(--asset-chart-card-shadow, 0 12px 24px rgba(15, 23, 42, 0.04));
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #0f766e;
}

.chart-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--asset-chart-title-color, var(--el-text-color-primary));
}

.chart-container {
  flex: 1;
  min-height: 0;
}

.fullscreen-chart {
  width: 100%;
  height: 70vh;
}

html.dark .chart-card {
  --asset-chart-card-bg: var(--el-bg-color);
  --asset-chart-card-border: var(--el-border-color-light);
  --asset-chart-card-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
  --asset-chart-title-color: var(--el-text-color-primary);
}

html.dark .asset-overview .panel-shell .chart-card {
  --asset-chart-card-bg: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.022),
    rgba(255, 255, 255, 0.008)
  );
  --asset-chart-card-border: rgba(148, 163, 184, 0.06);
  --asset-chart-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
</style>
