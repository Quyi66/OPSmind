<template>
  <div class="chart-card" ref="cardRef">
    <div class="chart-header">
      <div class="header-left">
        <el-icon class="header-icon"><Cpu /></el-icon>
        <span class="chart-title">操作系统分布</span>
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
      title="操作系统分布"
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
import { FullScreen, Cpu } from '@element-plus/icons-vue'
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

const distroFamilyColorMap = {
  centos: '#2563EB',
  windows: '#10B981',
  anolis: '#06B6D4',
  redhat: '#EF4444',
  debian: '#8B5CF6',
  ubuntu: '#F97316',
  linux: '#0EA5E9',
  kylin: '#14B8A6'
}

const fallbackColors = ['#0EA5E9', '#F59E0B', '#6366F1', '#14B8A6', '#F97316', '#A855F7']
const unknownDistroColor = '#94A3B8'

function isUnknownDistro(name) {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
  return !normalized || ['null', 'n/a', 'na', 'unknown', '未知', '-'].includes(normalized)
}

function resolveDistroColor(name, index) {
  if (isUnknownDistro(name)) return unknownDistroColor

  const normalized = String(name || '').toLowerCase()
  const exactMatch = Object.keys(distroFamilyColorMap).find(key => normalized.includes(key))
  if (exactMatch) return distroFamilyColorMap[exactMatch]
  return fallbackColors[index % fallbackColors.length]
}

function truncateLegendText(text, maxLength) {
  const normalized = String(text || '')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function getContainerWidth() {
  return (
    (fullscreenVisible.value ? fullscreenChartRef.value?.clientWidth : 0) ||
    chartRef.value?.clientWidth ||
    0
  )
}

function getContainerHeight() {
  return (
    (fullscreenVisible.value ? fullscreenChartRef.value?.clientHeight : 0) ||
    chartRef.value?.clientHeight ||
    0
  )
}

function getChartOption() {
  const chartWidth = getContainerWidth()
  const chartHeight = getContainerHeight()
  const compactLayout = chartWidth > 0 && chartWidth < 520
  const visibleCount = compactLayout ? 7 : 9
  const minRowHeight = compactLayout ? 24 : 22
  const sortedData = [...props.data]
    .map(item => ({
      os_distro: item.os_distro,
      count: Number(item.count || 0)
    }))
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      color: resolveDistroColor(item.os_distro, index)
    }))
  const total = sortedData.reduce((sum, item) => sum + item.count, 0)
  const axisColor = isDark.value ? 'rgba(148, 163, 184, 0.82)' : '#64748b'
  const splitLineColor = isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)'
  const labelColor = isDark.value ? '#f8fafc' : '#0f172a'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'
  const availableHeight = Math.max(0, chartHeight - 36)
  const needsDataZoom =
    sortedData.length > visibleCount ||
    (availableHeight > 0 && sortedData.length * minRowHeight > availableHeight)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: tooltipBg,
      borderColor: splitLineColor,
      textStyle: { color: labelColor },
      formatter: params => {
        const current = params[0]?.data?.raw
        if (!current) return ''
        const percent = total ? Math.round((current.count / total) * 100) : 0
        return `${current.os_distro}<br/>数量: ${current.count}<br/>占比: ${percent}%`
      },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    grid: {
      left: '4%',
      right: compactLayout ? '18%' : needsDataZoom ? '14%' : '12%',
      bottom: '6%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitNumber: 4,
      axisLabel: {
        color: axisColor,
        fontSize: 11,
        formatter: value => `${Math.round(value)}`
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: splitLineColor,
          type: 'dashed'
        }
      }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: sortedData.map(item => item.os_distro),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: axisColor,
        fontSize: 11,
        width: compactLayout ? 82 : 110,
        overflow: 'truncate',
        formatter: value => truncateLegendText(value, compactLayout ? 10 : 16)
      }
    },
    dataZoom: needsDataZoom
      ? [
          {
            type: 'inside',
            yAxisIndex: 0,
            zoomLock: true,
            startValue: 0,
            endValue: visibleCount - 1
          },
          {
            type: 'slider',
            yAxisIndex: 0,
            width: 10,
            right: 0,
            top: '18%',
            bottom: '8%',
            brushSelect: false,
            borderColor: 'transparent',
            fillerColor: isDark.value ? 'rgba(74, 222, 128, 0.18)' : 'rgba(34, 197, 94, 0.16)',
            backgroundColor: isDark.value ? 'rgba(51, 65, 85, 0.22)' : 'rgba(226, 232, 240, 0.72)',
            moveHandleSize: 0,
            showDetail: false
          }
        ]
      : [],
    series: [
      {
        name: '主机数量',
        type: 'bar',
        barMaxWidth: compactLayout ? 16 : 20,
        showBackground: true,
        backgroundStyle: {
          color: isDark.value ? 'rgba(51, 65, 85, 0.42)' : 'rgba(226, 232, 240, 0.8)',
          borderRadius: 999
        },
        itemStyle: {
          borderRadius: 999,
          shadowBlur: 10,
          shadowColor: 'rgba(15, 23, 42, 0.08)',
          shadowOffsetY: 4
        },
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: labelColor,
          fontSize: 11,
          fontWeight: 600,
          formatter: params => {
            const current = params.data?.raw
            const percent = current && total ? Math.round((current.count / total) * 100) : 0
            return `${params.value} / ${percent}%`
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(15, 23, 42, 0.14)'
          }
        },
        cursor: 'pointer',
        data: sortedData.map(item => ({
          value: item.count,
          raw: item,
          itemStyle: {
            color: item.color
          }
        }))
      }
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    emit('click', {
      os_distro: params.data?.raw?.os_distro
    })
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
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #16a34a;
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

@media (max-width: 1280px) {
  .chart-card {
    padding: 14px 16px;
  }

  .chart-header {
    margin-bottom: 6px;
  }
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
