<template>
  <div class="chart-card" ref="cardRef">
    <div class="chart-header">
      <div class="header-left">
        <el-icon class="header-icon"><Monitor /></el-icon>
        <span class="chart-title">资产类型</span>
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
      title="资产类型"
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
import { FullScreen, Monitor } from '@element-plus/icons-vue'
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

const typeColorPalette = ['#2563EB', '#38BDF8', '#0EA5E9', '#14B8A6', '#60A5FA']

function getContainerWidth() {
  return (
    (fullscreenVisible.value ? fullscreenChartRef.value?.clientWidth : 0) ||
    chartRef.value?.clientWidth ||
    0
  )
}

function truncateLegendText(text, maxLength) {
  const normalized = String(text || '')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function getChartOption() {
  const chartWidth = getContainerWidth()
  const compactLayout = chartWidth > 0 && chartWidth < 520
  const legendMaxLength = compactLayout ? 8 : 12
  const donutCenterX = compactLayout ? '50%' : '38%'
  const donutCenterY = compactLayout ? '40%' : '52%'
  const total = props.data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const seriesData = props.data
    .map((item, index) => ({
      name: item.title,
      value: Number(item.count || 0),
      code: item.code,
      is_auto: item.is_auto,
      itemStyle: {
        color: typeColorPalette[index % typeColorPalette.length]
      }
    }))
    .filter(item => item.value > 0)
  const labelColor = isDark.value ? '#e5e7eb' : '#0f172a'
  const legendColor = isDark.value ? '#cbd5e1' : '#475569'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)',
      textStyle: { color: labelColor },
      formatter: params => {
        const percent = total ? Math.round((Number(params.value || 0) / total) * 100) : 0
        return `${params.name}<br/>数量: ${params.value}<br/>占比: ${percent}%`
      },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    legend: {
      show: seriesData.length > 0,
      type: compactLayout ? 'scroll' : 'plain',
      orient: compactLayout ? 'horizontal' : 'vertical',
      left: compactLayout ? 'center' : 'auto',
      right: compactLayout ? 'center' : 0,
      top: compactLayout ? 'bottom' : 'center',
      bottom: compactLayout ? 0 : 'auto',
      width: compactLayout ? '92%' : 148,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: compactLayout ? 14 : 12,
      textStyle: {
        color: legendColor,
        fontSize: 14
      },
      formatter: name => {
        const item = seriesData.find(entry => entry.name === name)
        const shortName = truncateLegendText(name, legendMaxLength)
        const percent = item && total ? Math.round((item.value / total) * 100) : 0
        return item ? `${shortName}  ${item.value} (${percent}%)` : shortName
      }
    },
    series: [
      {
        name: '资产数量',
        type: 'pie',
        radius: compactLayout ? ['40%', '62%'] : ['46%', '68%'],
        center: [donutCenterX, donutCenterY],
        minAngle: seriesData.length <= 3 ? 18 : 10,
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: isDark.value ? '#0f172a' : '#ffffff',
          borderWidth: 4,
          shadowColor: 'rgba(37, 99, 235, 0.14)',
          shadowBlur: 12
        },
        label: {
          show: !compactLayout,
          position: 'inside',
          color: labelColor,
          fontWeight: 700,
          fontSize: 11,
          formatter: params => `${Math.round(params.percent || 0)}%`
        },
        labelLine: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(37, 99, 235, 0.3)'
          }
        },
        cursor: 'pointer',
        data: seriesData
      },
      {
        name: '中心文案',
        type: 'pie',
        silent: true,
        tooltip: {
          show: false
        },
        center: [donutCenterX, donutCenterY],
        radius: ['0%', compactLayout ? '26%' : '30%'],
        labelLine: {
          show: false
        },
        label: {
          show: total > 0,
          position: 'center',
          formatter: `{total|${total}}\n{name|资产总数}`,
          rich: {
            total: {
              color: isDark.value ? '#f8fafc' : '#0f172a',
              fontSize: compactLayout ? 22 : 24,
              fontWeight: 700,
              lineHeight: compactLayout ? 28 : 30
            },
            name: {
              color: legendColor,
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 18
            }
          }
        },
        itemStyle: {
          color: 'transparent'
        },
        emphasis: {
          disabled: true
        },
        data: [{ value: 1 }]
      }
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    emit('click', {
      code: params.data?.code,
      is_auto: params.data?.is_auto
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
  color: #2563eb;
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
