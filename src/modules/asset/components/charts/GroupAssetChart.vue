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

function getContainerWidth() {
  return (fullscreenVisible.value ? fullscreenChartRef.value?.clientWidth : 0) || chartRef.value?.clientWidth || 0
}

function getVisibleGroupCount(compactLayout) {
  return compactLayout ? 6 : 8
}

function truncateAxisText(text, maxLength) {
  const normalized = String(text || '')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function getChartOption() {
  const chartData = props.data
  const xData = chartData.map(item => item.groupName)
  const chartWidth = getContainerWidth()
  const compactLayout = chartWidth > 0 && chartWidth < 620
  const visibleGroupCount = getVisibleGroupCount(compactLayout)
  const crowdedLayout = xData.length > visibleGroupCount
  const osKeys = ['CentOS', 'Windows', 'Anolis', 'RedHat', 'Debian'].filter(key =>
    chartData.some(item => Number(item?.[key] || 0) > 0)
  )
  const visibleKeys = osKeys.length
    ? osKeys
    : ['CentOS', 'Windows', 'Anolis', 'RedHat', 'Debian'].filter(key => key in (chartData[0] || {}))
  const axisColor = isDark.value ? 'rgba(148, 163, 184, 0.82)' : '#64748b'
  const splitLineColor = isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)'
  const legendColor = isDark.value ? '#cbd5e1' : '#475569'
  const labelColor = isDark.value ? '#f8fafc' : '#0f172a'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'
  const zoomEndIndex = Math.max(0, Math.min(xData.length - 1, visibleGroupCount - 1))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      textStyle: { color: isDark.value ? '#f8fafc' : '#0f172a' },
      formatter: params => {
        const dataIndex = params.find(item => item.seriesName !== '总数标签')?.dataIndex
        if (dataIndex === undefined || dataIndex < 0) return ''

        const current = chartData[dataIndex]
        const lines = [`${current.groupName}`, `总数: ${current.count}`]
        visibleKeys.forEach(key => {
          const value = Number(current?.[key] || 0)
          if (value > 0) {
            lines.push(`${key}: ${value}`)
          }
        })
        return lines.join('<br/>')
      },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    legend: {
      show: visibleKeys.length > 0,
      type: visibleKeys.length > 4 ? 'scroll' : 'plain',
      left: 0,
      right: 0,
      top: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 12,
      textStyle: {
        color: legendColor,
        fontSize: 11
      },
      data: visibleKeys
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: crowdedLayout ? '16%' : '6%',
      top: visibleKeys.length > 0 ? '16%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: {
        show: false
      },
      axisLabel: {
        color: axisColor,
        width: compactLayout ? 64 : 86,
        overflow: 'break',
        fontSize: 11,
        interval: 0,
        rotate: crowdedLayout ? (compactLayout ? 26 : 18) : 0,
        formatter: value => truncateAxisText(value, compactLayout ? 6 : 8)
      },
      axisLine: {
        lineStyle: { color: splitLineColor }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitNumber: 4,
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
    dataZoom: crowdedLayout
      ? [
          {
            type: 'inside',
            startValue: 0,
            endValue: zoomEndIndex
          },
          {
            type: 'slider',
            height: 14,
            bottom: 0,
            startValue: 0,
            endValue: zoomEndIndex,
            brushSelect: false,
            borderColor: 'transparent',
            fillerColor: isDark.value ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.16)',
            backgroundColor: isDark.value ? 'rgba(51, 65, 85, 0.22)' : 'rgba(226, 232, 240, 0.72)',
            showDetail: false,
            moveHandleSize: 0
          }
        ]
      : [],
    series: [
      ...visibleKeys.map(os => ({
        name: os,
        type: 'bar',
        stack: 'os-distribution',
        barMaxWidth: crowdedLayout ? 24 : 30,
        cursor: 'pointer',
        itemStyle: {
          color: distroColorMap[os],
          opacity: isDark.value ? 0.9 : 0.95
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            opacity: 1
          }
        },
        data: chartData.map(item => Number(item?.[os] || 0))
      })),
      {
        name: '总数标签',
        type: 'line',
        data: chartData.map(item => Number(item.count || 0)),
        symbol: 'none',
        silent: true,
        lineStyle: {
          opacity: 0
        },
        label: {
          show: true,
          position: 'top',
          distance: 8,
          color: labelColor,
          fontSize: 11,
          fontWeight: 700,
          formatter: params => (params.value ? params.value : '')
        }
      }
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    const current = props.data[params.dataIndex]
    if (!current) return
    emit('click', current)
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
