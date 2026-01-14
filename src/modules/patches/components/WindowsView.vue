<template>
  <div class="windows-view">
    <!-- 漏洞概览 - 柱状图 -->
    <div class="chart-card">
      <div class="chart-card__header">
        <span class="chart-card__title">漏洞概览</span>
        <el-button link @click="toggleBarFullscreen">
          <i :class="barFullscreen ? 'fa fa-compress' : 'fa fa-expand'" />
        </el-button>
      </div>
      <div class="chart-card__body" :class="{ 'chart-card__body--fullscreen': barFullscreen }">
        <el-button v-if="barFullscreen" class="fullscreen-close-btn" link @click="toggleBarFullscreen">
          <i class="fa fa-times" /> 关闭全屏
        </el-button>
        <div ref="barChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 漏洞趋势 - 折线图 -->
    <div class="chart-card">
      <div class="chart-card__header">
        <span class="chart-card__title">漏洞趋势</span>
        <el-button link @click="toggleLineFullscreen">
          <i :class="lineFullscreen ? 'fa fa-compress' : 'fa fa-expand'" />
        </el-button>
      </div>
      <div class="chart-card__body" :class="{ 'chart-card__body--fullscreen': lineFullscreen }">
        <el-button v-if="lineFullscreen" class="fullscreen-close-btn" link @click="toggleLineFullscreen">
          <i class="fa fa-times" /> 关闭全屏
        </el-button>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { windowsViewApi } from '../api'

// 图表引用
const barChartRef = ref(null)
const lineChartRef = ref(null)
let barChart = null
let lineChart = null

// 全屏状态
const barFullscreen = ref(false)
const lineFullscreen = ref(false)

// 切换柱状图全屏
function toggleBarFullscreen() {
  barFullscreen.value = !barFullscreen.value
  nextTick(() => {
    barChart?.resize()
  })
}

// 切换折线图全屏
function toggleLineFullscreen() {
  lineFullscreen.value = !lineFullscreen.value
  nextTick(() => {
    lineChart?.resize()
  })
}

// 初始化柱状图 - VAP2_CURRENT_STATS_WIN
async function initBarChart() {
  if (!barChartRef.value) return

  barChart = echarts.init(barChartRef.value)

  try {
    const response = await windowsViewApi.getCurrentStatsWin()
    const records = response?.records || []

    // 处理数据
    const chartData = []
    if (records.length > 0) {
      const rec = records[0]
      chartData.push({ name: '重要更新', value: rec.num_critical || 0 })
      chartData.push({ name: '安全更新', value: rec.num_rollups || 0 })
      chartData.push({ name: '更新汇总', value: rec.num_security || 0 })
    }

    const option = {
      color: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5'],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        axisLine: {
          lineStyle: { color: '#ccc' }
        },
        axisLabel: {
          color: '#666'
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: { color: '#eee' }
        }
      },
      series: [{
        name: '漏洞分布',
        type: 'bar',
        barWidth: 50,
        data: chartData.map(d => d.value),
        label: {
          show: true,
          position: 'top',
          color: '#666'
        },
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        }
      }]
    }

    barChart.setOption(option)
  } catch (error) {
    console.error('Failed to load bar chart data:', error)
  }
}

// 初始化折线图 - VAP2_PATCH_TREND_WINDOWS
async function initLineChart() {
  if (!lineChartRef.value) return

  lineChart = echarts.init(lineChartRef.value)

  try {
    const response = await windowsViewApi.getPatchTrendWindows()
    const records = response?.records || []

    const dates = records.map(r => r.scan_date)
    const values = records.map(r => r.patch_count || 0)

    const option = {
      color: ['#28a745'],
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: {
          lineStyle: { color: '#ccc' }
        },
        axisLabel: {
          color: '#666',
          formatter: function(value) {
            if (!value) return ''
            const date = new Date(value)
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${month}-${day}`
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        splitLine: {
          lineStyle: { color: '#eee' }
        }
      },
      series: [{
        name: '漏洞',
        type: 'line',
        smooth: true,
        data: values,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(40, 167, 69, 0.3)' },
            { offset: 1, color: 'rgba(40, 167, 69, 0.05)' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          color: '#28a745'
        }
      }]
    }

    lineChart.setOption(option)
  } catch (error) {
    console.error('Failed to load line chart data:', error)
  }
}

// 窗口大小变化时重绘图表
function handleResize() {
  barChart?.resize()
  lineChart?.resize()
}

function refresh() {
  initBarChart()
  initLineChart()
}

onMounted(() => {
  initBarChart()
  initLineChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  lineChart?.dispose()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.windows-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
  background: #f5f7fa;
  overflow-y: auto;
}

.chart-card {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e9ecef;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__body {
    flex: 1;
    padding: 8px;
    min-height: 240px;
    position: relative;

    &--fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: #fff;
      padding: 16px;
      min-height: 100vh;
    }
  }
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 220px;
}

.fullscreen-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  font-size: 14px;
  color: #666;

  &:hover {
    color: #409eff;
  }
}
</style>
