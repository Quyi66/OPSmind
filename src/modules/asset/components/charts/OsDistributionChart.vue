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

const distroColorMap = {
  centos: '#2563EB',
  windows: '#10B981',
  anolis: '#06B6D4',
  redhat: '#EF4444',
  debian: '#8B5CF6',
  ubuntu: '#F97316',
  linux: '#0EA5E9'
}

function resolveDistroColor(name, index) {
  const normalized = String(name || '').toLowerCase()
  const exactMatch = Object.keys(distroColorMap).find(key => normalized.includes(key))
  if (exactMatch) return distroColorMap[exactMatch]
  const fallbackColors = ['#2563EB', '#10B981', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6']
  return fallbackColors[index % fallbackColors.length]
}

function truncateLegendText(text, maxLength) {
  const normalized = String(text || '')
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

function getChartOption() {
  const total = props.data.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const chartWidth = chartRef.value?.clientWidth || 0
  const compactLayout = chartWidth > 0 && chartWidth < 500
  const narrowLayout = chartWidth > 0 && chartWidth < 620
  const legendMaxLength = compactLayout ? 12 : narrowLayout ? 32 : 36
  const legendColor = isDark.value ? '#cbd5e1' : '#475569'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'
  const seriesData = props.data.map((item, index) => ({
    value: Number(item.count || 0),
    name: item.os_distro,
    itemStyle: { color: resolveDistroColor(item.os_distro, index) }
  }))

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: 'rgba(148, 163, 184, 0.2)',
      textStyle: { color: isDark.value ? '#f8fafc' : '#0f172a' },
      formatter: params => {
        const percent = total ? Math.round((params.value / total) * 100) : 0
        return `${params.name}<br/>数量: ${params.value}<br/>占比: ${percent}%`
      },
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    legend: {
      orient: compactLayout ? 'horizontal' : 'vertical',
      right: compactLayout ? 'center' : 0,
      left: compactLayout ? 'center' : 'auto',
      top: compactLayout ? 'bottom' : 'center',
      width: compactLayout ? '92%' : narrowLayout ? 132 : 168,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: compactLayout ? 14 : 10,
      textStyle: {
        color: legendColor,
        fontSize: compactLayout ? 11 : 12
      },
      formatter: name => {
        const item = props.data.find(entry => entry.os_distro === name)
        const shortName = truncateLegendText(name, legendMaxLength)
        if (compactLayout) {
          return item ? `${shortName} ${item.count}` : shortName
        }
        return `${shortName}${item ? `  ${item.count}` : ''}`
      }
    },
    graphic: total
      ? [
          {
            type: 'text',
            left: compactLayout ? 'center' : narrowLayout ? '28%' : '32%',
            top: compactLayout ? '38%' : '42%',
            style: {
              text: `${total}`,
              textAlign: 'center',
              fill: isDark.value ? '#f8fafc' : '#0f172a',
              fontSize: compactLayout ? 22 : 24,
              fontWeight: 700
            }
          },
          {
            type: 'text',
            left: compactLayout ? 'center' : narrowLayout ? '25%' : '29%',
            top: compactLayout ? '49%' : '54%',
            style: {
              text: '资产总量',
              textAlign: 'center',
              fill: legendColor,
              fontSize: compactLayout ? 11 : 12
            }
          }
        ]
      : [],
    series: [
      {
        name: '主机数量',
        type: 'pie',
        radius: compactLayout ? ['44%', '64%'] : narrowLayout ? ['48%', '69%'] : ['52%', '74%'],
        center: compactLayout ? ['50%', '40%'] : narrowLayout ? ['31%', '52%'] : ['33%', '52%'],
        avoidLabelOverlap: true,
        minAngle: 8,
        itemStyle: {
          borderColor: isDark.value ? '#0f172a' : '#ffffff',
          borderWidth: 4,
          shadowBlur: 10,
          shadowColor: 'rgba(15, 23, 42, 0.08)'
        },
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        emphasis: {
          scale: true,
          scaleSize: 6
        },
        cursor: 'pointer',
        data: seriesData
      }
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    emit('click', {
      os_distro: props.data[params.dataIndex]?.os_distro
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
  --asset-chart-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.008));
  --asset-chart-card-border: rgba(148, 163, 184, 0.06);
  --asset-chart-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
</style>
