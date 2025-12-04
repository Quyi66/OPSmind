<template>
  <el-dialog
    v-model="visible"
    title="资产属性趋势图"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="asset-history">
      <!-- 折线图 -->
      <div class="chart-container">
        <div ref="chartRef" class="chart"></div>
        <el-empty v-if="!loading && chartData.length === 0" description="暂无历史数据" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { dtsApi } from '../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  assetId: {
    type: String,
    default: ''
  },
  assetIp: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const chartData = ref([])
const chartRef = ref(null)
let chartInstance = null

// 加载历史数据
const loadHistoryData = async () => {
  if (!props.assetId) return

  loading.value = true
  try {
    const res = await dtsApi.queryData('ACM_HISTORY_ATTR_INF', {
      cid: props.assetId,
      attrs: 'memtotal_mb,memfree_mb',
      day: '15'
    })

    chartData.value = res.records || []
    await nextTick()
    renderChart()
  } catch (error) {
    console.error('加载历史数据失败:', error)
    ElMessage.error('加载历史数据失败')
  } finally {
    loading.value = false
  }
}

// 渲染图表
const renderChart = () => {
  if (!chartRef.value || chartData.value.length === 0) {
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  // 处理数据
  const times = chartData.value.map(item => item.time)
  const memFreeData = chartData.value.map(item => parseFloat(item.memfree_mb) || 0)
  const memTotalData = chartData.value.map(item => parseFloat(item.memtotal_mb) || 0)

  const option = {
    backgroundColor: '#fff',
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['可用内存', 'memtotal_mb'],
      top: 10
    },
    grid: {
      left: 60,
      right: 60,
      bottom: 40,
      top: 50
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '可用内存',
        type: 'line',
        smooth: true,
        data: memFreeData,
        itemStyle: {
          color: 'rgb(0, 176, 80)'
        },
        lineStyle: {
          width: 2,
          color: 'rgb(0, 176, 80)'
        }
      },
      {
        name: 'memtotal_mb',
        type: 'line',
        smooth: true,
        data: memTotalData,
        itemStyle: {
          color: 'rgb(0, 176, 240)'
        },
        lineStyle: {
          width: 2,
          color: 'rgb(0, 176, 240)'
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  chartData.value = []
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val && props.assetId) {
    loadHistoryData()
  }
})

// 监听窗口大小变化
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped lang="scss">
.asset-history {
  min-height: 350px;
}

.chart-container {
  position: relative;
  min-height: 300px;

  .chart {
    width: 100%;
    height: 300px;
  }

  .el-empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
