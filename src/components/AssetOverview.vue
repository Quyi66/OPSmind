<template>
  <div class="asset-overview">
    <div class="section-header">
      <h3 class="section-title">
        <i class="fa fa-server"></i>
        资产概览
      </h3>
      <div class="header-actions">
        <div class="tab-switcher">
          <button
            v-for="tab in platformTabs"
            :key="tab.value"
            :class="['tab-btn', { active: selectedPlatform === tab.value }]"
            @click="selectedPlatform = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
        <el-button type="text" size="small">更多</el-button>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="chart-container">
      <v-chart
        class="chart"
        :option="chartOption"
        autoresize
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ElSelect, ElOption, ElButton } from 'element-plus'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// Tab选项
const platformTabs = ref([
  { label: '企业版', value: 'enterprise' },
  { label: '社区版', value: 'community' }
])

// 选中的平台
const selectedPlatform = ref('enterprise')

// 资产数据
const assetData = ref({
  categories: ['Linux操作系统', 'Unix操作系统', 'Windows操作系统'],
  values: [4, 1, 4]
})

// ECharts 配置
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    formatter: function(params) {
      const data = params[0]
      return `${data.name}: ${data.value}`
    }
  },
  grid: {
    left: '20%',
    right: '10%',
    top: '5%',
    bottom: '5%',
    containLabel: false
  },
  xAxis: {
    type: 'value',
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#666'
    },
    splitLine: {
      lineStyle: {
        color: '#f0f0f0'
      }
    },
    max: 5
  },
  yAxis: {
    type: 'category',
    data: assetData.value.categories,
    axisLine: {
      show: false
    },
    axisTick: {
      show: false
    },
    axisLabel: {
      color: '#666',
      fontSize: 12
    }
  },
  series: [
    {
      type: 'bar',
      data: assetData.value.values,
      itemStyle: {
        color: function(params) {
          const colors = ['#1890ff', '#52c41a', '#faad14']
          return colors[params.dataIndex % colors.length]
        },
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: '60%',
      label: {
        show: true,
        position: 'right',
        color: '#666',
        fontSize: 12
      }
    }
  ]
}))
</script>

<style scoped lang="scss">
.asset-overview {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.tab-switcher {
  display: flex;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 2px;
  margin-right: 12px;
}

.tab-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    color: #2D8CF0;
  }

  &.active {
    background: #fff;
    color: #2D8CF0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: #1890ff;
    font-size: 14px;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chart-container {
  flex: 1;
  height: 160px;
  min-height: 160px;
}

.chart {
  width: 100%;
  height: 160px;
}

// 响应式设计
@media (max-width: 768px) {
  .asset-overview {
    padding: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .chart-container {
    min-height: 250px;
  }
}
</style>
