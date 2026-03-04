<template>
  <el-dialog v-model="visible" :title="title" width="800px" destroy-on-close @closed="handleClosed">
    <div v-loading="loading" class="version-chart-container">
      <div v-if="!loading && (!data || data.length === 0)" class="empty-state">
        <el-empty description="暂无版本分布数据" />
      </div>
      <div v-else ref="chartRef" class="chart-box"></div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'

const { isDark } = useTheme()

const props = defineProps({
  modelValue: Boolean,
  title: {
    type: String,
    default: '操作系统版本分布'
  },
  data: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const chartRef = ref(null)
let chartInstance = null

function initChart() {
  if (!chartRef.value || props.data.length === 0) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '')
  }

  const xData = props.data.map(item => item.title)
  const yData = props.data.map(item => item.count)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        interval: 0,
        rotate: 0,
        color: '#666',
        fontSize: 11,
        formatter: value => {
          const count = props.data.length
          // 弹窗空间较大，容忍度更高
          const maxLen = count <= 3 ? 20 : count <= 8 ? 12 : count <= 15 ? 8 : 6
          if (value && value.length > maxLen) {
            return value.substring(0, maxLen) + '...'
          }
          return value
        }
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
      nameTextStyle: {
        color: '#999',
        padding: [0, 0, 0, 30]
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
        name: '版本分布',
        type: 'bar',
        data: yData,
        barMaxWidth: 40,
        itemStyle: {
          color: params => {
            const colors = [
              '#409EFF',
              '#67C23A',
              '#E6A23C',
              '#F56C6C',
              '#909399',
              '#00B0F0',
              '#00B050',
              '#7030A0',
              '#FF8547',
              '#FFC93C'
            ]
            return colors[params.dataIndex % colors.length]
          }
        },
        emphasis: {
          itemStyle: {
            opacity: 0.8
          }
        },
        label: {
          show: true,
          position: 'top',
          color: '#666'
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

function handleResize() {
  chartInstance?.resize()
}

watch(
  () => props.data,
  () => {
    if (visible.value) {
      nextTick(initChart)
    }
  },
  { deep: true }
)

watch(visible, val => {
  if (val) {
    nextTick(() => {
      initChart()
      window.addEventListener('resize', handleResize)
    })
  } else {
    window.removeEventListener('resize', handleResize)
  }
})

function handleClosed() {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped lang="scss">
.version-chart-container {
  height: 450px;
  width: 100%;
  display: flex;
  flex-direction: column;

  .chart-box {
    flex: 1;
    width: 100%;
    min-height: 0;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
