<template>
  <div class="chart-card">
    <div class="chart-header">
      <span class="chart-title">操作系统分布</span>
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

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  updateChart()

  chartInstance.on('click', (params) => {
    emit('click', {
      os_distro: props.data[params.dataIndex]?.os_distro
    })
  })
}

function updateChart() {
  if (!chartInstance) return

  const xData = props.data.map(item => item.os_distro)
  const yData = props.data.map(item => item.count)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '14%',
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
      name: '主机数量',
      nameLocation: 'end',
      nameTextStyle: {
        color: '#666',
        fontSize: 12
      },
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
        name: '主机数量',
        type: 'bar',
        data: yData,
        itemStyle: {
          // 为每个柱条使用不同颜色
          color: (params) => {
            const colors = [
              '#409EFF', // 蓝色
              '#67C23A', // 绿色
              '#E6A23C', // 橙色
              '#F56C6C', // 红色
              '#909399', // 灰色
              '#00B0F0', // 浅蓝
              '#00B050', // 深绿
              '#7030A0'  // 紫色
            ]
            return colors[params.dataIndex % colors.length]
          }
        },
        barMaxWidth: 40
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
