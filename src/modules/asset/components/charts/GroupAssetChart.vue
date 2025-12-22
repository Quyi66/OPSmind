<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">分组内资产分布</span>
      <el-dropdown v-if="showControls" trigger="click">
        <el-button :icon="MoreFilled" text />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleRefresh">刷新</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div ref="chartRef" class="chart-container" v-loading="loading"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
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

const chartRef = ref(null)
let chartInstance = null

// 操作系统颜色映射
const osColors = {
  count: 'rgb(197, 90, 17)',
  CentOS: 'rgb(0, 176, 80)',
  Anolis: 'rgb(0, 176, 240)',
  RedHat: 'rgb(0, 112, 192)',
  Debian: 'rgb(0, 32, 96)'
}

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  updateChart()

  chartInstance.on('click', (params) => {
    emit('click', props.data[params.dataIndex])
  })
}

function updateChart() {
  if (!chartInstance) return

  const xData = props.data.map(item => item.groupName)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['总数', 'CentOS', 'Anolis', 'RedHat', 'Debian'],
      right: 10,
      top: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8
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
      data: xData,
      axisLabel: {
        color: '#666'
      },
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '总数',
        type: 'bar',
        data: props.data.map(item => item.count),
        itemStyle: {
          color: osColors.count
        },
        barMaxWidth: 40
      },
      {
        name: 'CentOS',
        type: 'line',
        data: props.data.map(item => item.CentOS),
        smooth: true,
        lineStyle: { color: osColors.CentOS },
        itemStyle: { color: osColors.CentOS }
      },
      {
        name: 'Anolis',
        type: 'line',
        data: props.data.map(item => item.Anolis),
        smooth: true,
        lineStyle: { color: osColors.Anolis },
        itemStyle: { color: osColors.Anolis }
      },
      {
        name: 'RedHat',
        type: 'line',
        data: props.data.map(item => item.RedHat),
        smooth: true,
        lineStyle: { color: osColors.RedHat },
        itemStyle: { color: osColors.RedHat }
      },
      {
        name: 'Debian',
        type: 'line',
        data: props.data.map(item => item.Debian),
        smooth: true,
        lineStyle: { color: osColors.Debian },
        itemStyle: { color: osColors.Debian }
      }
    ]
  }

  chartInstance.setOption(option)
}

function handleRefresh() {
  emit('refresh')
}

function handleResize() {
  chartInstance?.resize()
}

watch(() => props.data, () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  flex: 1;
  min-height: 0;
}
</style>
