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

function getChartOption() {
  const xData = props.data.map(item => item.os_distro)
  const yData = props.data.map(item => item.count)

  return {
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
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        rotate: 0,
        
        formatter: value => {
          const count = props.data.length
          // 动态计算最大长度：数量越少显示越长，最小保留 5 个字符
          const maxLen = count <= 3 ? 15 : count <= 6 ? 10 : count <= 10 ? 7 : 5
          if (value && value.length > maxLen) {
            return value.substring(0, maxLen) + '...'
          }
          return value
        }
      },
      axisLine: {
        lineStyle: {
          
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '主机数量',
      nameLocation: 'end',
      // nameGap: 18,
      nameTextStyle: {
        
        fontSize: 12
      },
      axisLabel: {
        
      },
      splitLine: {
        lineStyle: {
          
        }
      }
    },
    series: [
      {
        name: '主机数量',
        type: 'bar',
        data: yData,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          // 为每个柱条使用不同颜色
          color: params => {
            const colors = [
              ['#409EFF', '#8CC5FF'], // 蓝色
              ['#67C23A', '#95D475'], // 绿色
              ['#E6A23C', '#F3D19E'], // 橙色
              ['#F56C6C', '#FAB6B6'], // 红色
              ['#909399', '#C0C4CC'], // 灰色
              ['#00B0F0', '#80D8F8'], // 浅蓝
              ['#00B050', '#80D8A8'], // 深绿
              ['#7030A0', '#B898D0'] // 紫色
            ]
            const colorPair = colors[params.dataIndex % colors.length]
            return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colorPair[0] },
              { offset: 1, color: colorPair[1] }
            ])
          }
        },
        label: {
          show: true,
          position: 'top',
          
          formatter: '{c}'
        },
        barMaxWidth: 40
      }
    ]
  }
}

function initChart() {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')
  updateChart()

  chartInstance.on('click', params => {
    emit('click', {
      os_distro: props.data[params.dataIndex]?.os_distro
    })
  })
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
  },
  { deep: true }
)

watch(isDark, () => {
  if(chartInstance) {
    chartInstance.dispose();
    chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '');
    updateChart();
  }
  if(fullscreenChartInstance && fullscreenVisible.value) {
    fullscreenChartInstance.dispose();
    fullscreenChartInstance = echarts.init(fullscreenChartRef.value, isDark.value ? 'dark' : '');
    fullscreenChartInstance.setOption(getChartOption());
  }
});

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  fullscreenChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.chart-card {
  background: var(--el-bg-color);
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
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
  color: #67c23a;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-container {
  flex: 1;
  min-height: 0;
}

.fullscreen-chart {
  width: 100%;
  height: 70vh;
}
</style>
