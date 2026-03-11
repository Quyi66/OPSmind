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

function getChartOption() {
  const xData = props.data.map(item => item.title)
  const yData = props.data.map(item => item.count)
  const axisColor = isDark.value ? 'rgba(148, 163, 184, 0.82)' : '#64748b'
  const splitLineColor = isDark.value ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.24)'
  const labelColor = isDark.value ? '#e5e7eb' : '#0f172a'
  const tooltipBg = isDark.value ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)'

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
      extraCssText: 'box-shadow: 0 12px 28px rgba(15,23,42,0.16); border-radius: 12px;'
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '2%',
      top: '6%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      precision: 0,
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
      data: xData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: axisColor,
        fontSize: 12,
        width: 90,
        overflow: 'truncate'
      }
    },
    series: [
      {
        name: '主机数量',
        type: 'bar',
        data: yData,
        barMaxWidth: 30,
        barWidth: xData.length <= 4 ? 26 : '45%',
        showBackground: true,
        backgroundStyle: {
          color: isDark.value ? 'rgba(51, 65, 85, 0.42)' : 'rgba(226, 232, 240, 0.8)',
          borderRadius: 999
        },
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#2563EB' },
            { offset: 1, color: '#60A5FA' }
          ]),
          borderRadius: 999,
          shadowColor: 'rgba(37, 99, 235, 0.24)',
          shadowBlur: 10,
          shadowOffsetY: 4
        },
        label: {
          show: true,
          position: 'right',
          color: labelColor,
          fontWeight: 700,
          formatter: '{c}'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(37, 99, 235, 0.3)'
          }
        },
        cursor: 'pointer'
      }
    ]
  }
}

function bindChartEvents(instance) {
  if (!instance) return
  instance.off('click')
  instance.on('click', params => {
    emit('click', {
      code: props.data[params.dataIndex]?.code,
      is_auto: props.data[params.dataIndex]?.is_auto
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
  --asset-chart-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.008));
  --asset-chart-card-border: rgba(148, 163, 184, 0.06);
  --asset-chart-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
}
</style>
