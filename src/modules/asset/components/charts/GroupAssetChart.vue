<template>
  <div class="chart-card" ref="cardRef">
    <div class="chart-header">
      <div class="header-left">
        <el-icon class="header-icon"><Connection /></el-icon>
        <span class="chart-title">分组内资产分布</span>
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
      title="分组内资产分布"
      width="90%"
      top="5vh"
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
import { FullScreen, Connection } from '@element-plus/icons-vue'
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

const emit = defineEmits(['refresh', 'click'])

const cardRef = ref(null)
const chartRef = ref(null)
const fullscreenChartRef = ref(null)
const fullscreenVisible = ref(false)
let chartInstance = null
let fullscreenChartInstance = null
let resizeObserver = null

const distroColorMap = {
  CentOS: '#2563EB',
  Windows: '#10B981',
  Anolis: '#06B6D4',
  RedHat: '#EF4444',
  Debian: '#8B5CF6'
}

function getChartOption() {
  const xData = props.data.map(item => item.groupName)
  const axisColor = isDark.value ? 'rgba(148, 163, 184, 0.82)' : '#64748b'
  const splitLineColor = isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)'
  const legendColor = isDark.value ? '#cbd5e1' : '#475569'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      textStyle: { color: isDark.value ? '#f8fafc' : '#0f172a' },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    legend: {
      data: ['总数', 'CentOS', 'Windows', 'Anolis', 'RedHat', 'Debian'],
      right: 0,
      top: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: {
        color: legendColor,
        fontSize: 11
      }
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '5%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        color: axisColor,
        width: 78,
        overflow: 'truncate',
        fontSize: 11
      },
      axisLine: {
        lineStyle: { color: splitLineColor }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: axisColor,
        fontSize: 11
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
        name: '总数',
        type: 'bar',
        data: props.data.map(item => item.count),
        cursor: 'pointer',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#F59E0B' },
            { offset: 1, color: 'rgba(245, 158, 11, 0.12)' }
          ]),
          borderRadius: [10, 10, 0, 0],
          shadowBlur: 10,
          shadowColor: 'rgba(245, 158, 11, 0.2)',
          shadowOffsetY: 4
        },
        label: {
          show: true,
          position: 'top',
          color: isDark.value ? '#f8fafc' : '#0f172a',
          fontWeight: 700,
          formatter: '{c}'
        },
        barMaxWidth: 30
      },
      ...['CentOS', 'Windows', 'Anolis', 'RedHat', 'Debian'].map(os => ({
        name: os,
        type: 'line',
        data: props.data.map(item => item[os] ?? 0),
        cursor: 'pointer',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: distroColorMap[os] },
        itemStyle: { color: distroColorMap[os], borderColor: isDark.value ? '#0f172a' : '#fff', borderWidth: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark.value ? `${distroColorMap[os]}44` : `${distroColorMap[os]}55` },
            { offset: 1, color: `${distroColorMap[os]}05` }
          ])
        }
      }))
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    emit('click', props.data[params.dataIndex])
  })
}

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')
  updateChart()
  bindChartEvents(chartInstance)
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
      bindChartEvents(fullscreenChartInstance)
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
    bindChartEvents(chartInstance)
  }
  if (fullscreenChartInstance && fullscreenVisible.value) {
    fullscreenChartInstance.dispose()
    fullscreenChartInstance = echarts.init(fullscreenChartRef.value, isDark.value ? 'dark' : '')
    fullscreenChartInstance.setOption(getChartOption())
    bindChartEvents(fullscreenChartInstance)
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
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #f59e0b;
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
  --asset-chart-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.008));
  --asset-chart-card-border: rgba(148, 163, 184, 0.06);
  --asset-chart-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
</style>
