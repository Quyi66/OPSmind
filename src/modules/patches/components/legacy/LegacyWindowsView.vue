<template>
  <div class="windows-view">
    <!-- 顶部 KPI 卡片 -->
    <div class="kpi-row" v-loading="loadingStats">
      <div class="kpi-card kpi-card--critical">
        <div class="kpi-icon">
          <i class="fa fa-exclamation-circle" />
        </div>
        <div class="kpi-content">
          <div class="kpi-label">重要更新</div>
          <div class="kpi-value">{{ stats.critical }}</div>
        </div>
      </div>
      <div class="kpi-card kpi-card--security">
        <div class="kpi-icon">
          <i class="fa fa-shield-alt" />
        </div>
        <div class="kpi-content">
          <div class="kpi-label">安全更新</div>
          <div class="kpi-value">{{ stats.security }}</div>
        </div>
      </div>
      <div class="kpi-card kpi-card--rollups">
        <div class="kpi-icon">
          <i class="fa fa-layer-group" />
        </div>
        <div class="kpi-content">
          <div class="kpi-label">更新汇总</div>
          <div class="kpi-value">{{ stats.rollups }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <!-- 漏洞分布 - 柱状图 (30% 宽度) -->
      <div class="chart-card chart-card--bar">
        <div class="chart-card__header">
          <span class="chart-card__title">
            <i class="fa fa-chart-bar" />
            漏洞类型分布
          </span>
        </div>
        <div class="chart-card__body">
          <div ref="barChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 漏洞趋势 - 折线图 (剩余宽度) -->
      <div class="chart-card chart-card--line">
        <div class="chart-card__header">
          <span class="chart-card__title">
            <i class="fa fa-chart-line" />
            漏洞趋势 (近30天)
          </span>
        </div>
        <div class="chart-card__body">
          <div ref="lineChartRef" class="chart-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { windowsViewApi } from '../../api'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

// 状态数据
const loadingStats = ref(false)
const stats = reactive({
  critical: 0,
  security: 0,
  rollups: 0
})

// 图表引用
const barChartRef = ref(null)
const lineChartRef = ref(null)
let barChart = null
let lineChart = null

// 初始化数据和图表
async function initData() {
  loadingStats.value = true
  try {
    // 1. 获取概览统计数据
    const response = await windowsViewApi.getCurrentStatsWin()
    const records = response?.records || response?.data?.records || []

    if (records.length > 0) {
      const rec = records[0]
      stats.critical = rec.num_critical || 0
      stats.security = rec.num_security || 0
      stats.rollups = rec.num_rollups || 0

      initBarChart([
        { name: '重要更新', value: stats.critical, color: '#FF6B6B' },
        { name: '安全更新', value: stats.security, color: '#FFA940' },
        { name: '更新汇总', value: stats.rollups, color: '#409EFF' }
      ])
    } else {
      initBarChart([])
    }
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loadingStats.value = false
  }

  // 2. 获取趋势数据
  try {
    const response = await windowsViewApi.getPatchTrendWindows()
    const records = (response?.records || response?.data?.records || [])
      .slice()
      .sort((a, b) => new Date(a.scan_date) - new Date(b.scan_date))

    initLineChart(records)
  } catch (error) {
    console.error('Failed to load trend:', error)
  }
}

// 绘制柱状图
function initBarChart(data) {
  if (!barChartRef.value) return
  if (barChart) barChart.dispose()

  barChart = echarts.init(barChartRef.value, isDark.value ? 'dark' : '')

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLine: { lineStyle: {} },
      axisLabel: { fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { type: 'dashed' }
      },
      axisLabel: {}
    },
    series: [
      {
        name: '数量',
        type: 'bar',
        barWidth: '40%',
        data: data.map((d, index) => ({
          value: d.value,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: d.color },
              { offset: 1, color: adjustAlpha(d.color, 0.6) }
            ]),
            borderRadius: [6, 6, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          fontWeight: 'bold'
        }
      }
    ]
  }

  barChart.setOption(option)
}

// 绘制折线图
function initLineChart(data) {
  if (!lineChartRef.value) return
  if (lineChart) lineChart.dispose()

  lineChart = echarts.init(lineChartRef.value, isDark.value ? 'dark' : '')

  const dates = data.map(r => r.scan_date)
  const values = data.map(r => r.patch_count || 0)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: {} },
      axisLabel: {
        formatter: value => {
          if (!value) return ''
          const d = new Date(value)
          return `${d.getMonth() + 1}-${d.getDate()}`
        }
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { type: 'dashed' }
      },
      axisLabel: {}
    },
    series: [
      {
        name: '漏洞总数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#00B96B' }, // 主色调绿色
        lineStyle: { width: 3, shadowColor: 'rgba(0,0,0,0.1)', shadowBlur: 10 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 185, 107, 0.4)' },
            { offset: 1, color: 'rgba(0, 185, 107, 0.05)' }
          ])
        },
        data: values
      }
    ]
  }

  lineChart.setOption(option)
}

// 辅助函数：调整颜色透明度
function adjustAlpha(color, alpha) {
  // 简单处理 hex -> rgba
  let r = 0,
    g = 0,
    b = 0
  if (color.startsWith('#')) {
    if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16)
      g = parseInt(color[2] + color[2], 16)
      b = parseInt(color[3] + color[3], 16)
    } else if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16)
      g = parseInt(color.slice(3, 5), 16)
      b = parseInt(color.slice(5, 7), 16)
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function handleResize() {
  barChart?.resize()
  lineChart?.resize()
}

function refresh() {
  initData()
}

onMounted(() => {
  initData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  lineChart?.dispose()
})

// 监听主题切换
watch(isDark, () => {
  // 重建图表
  initData()
})

defineExpose({ refresh })
</script>

<style scoped lang="scss">
.windows-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 20px;
  background: var(--el-bg-color-page); // 更柔和的背景色
  overflow-y: auto;
}

// KPI 卡片样式
.kpi-row {
  display: flex;
  gap: 20px;
}

.kpi-card {
  flex: 1;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); // 轻微浮起
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .kpi-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-right: 20px;
  }

  .kpi-content {
    flex: 1;
  }

  .kpi-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-bottom: 8px;
  }

  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    font-family: 'Inter', sans-serif;
  }

  // 不同类型的配色
  &--critical {
    .kpi-icon {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }
  }

  &--security {
    .kpi-icon {
      background: rgba(250, 140, 22, 0.1);
      color: #fa8c16;
    }
  }

  &--rollups {
    .kpi-icon {
      background: rgba(24, 144, 255, 0.1);
      color: #1890ff;
    }
  }
}

// 图表区域样式
.charts-row {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 400px;
}

.chart-card {
  // flex: 1;  <-- Removed generic flex: 1
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  // 柱状图：精确对齐上方第1张卡片 ((100% - 2 * 20px gap) / 3)
  &--bar {
    flex: 0 0 calc((100% - 40px) / 3);
    min-width: 0;
  }

  // 折线图：占据剩余空间
  &--line {
    flex: 1;
    min-width: 0; // 关键：允许 flex item 内容区(echarts)正常收缩
  }

  &__header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-light);

    .chart-card__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      display: flex;
      align-items: center;
      gap: 8px;

      i {
        color: var(--el-text-color-secondary);
        font-size: 14px;
      }
    }
  }

  &__body {
    flex: 1;
    padding: 16px;
    position: relative;
  }
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
