<template>
  <div class="inspection-overview">
    <div class="section-header">
      <h3 class="section-title">
        <i class="fa fa-shield-alt"></i>
        巡检概览
      </h3>
      <div class="header-actions">
        <el-button type="text" size="small">更多</el-button>
      </div>
    </div>

    <!-- 巡检统计 -->
    <div class="inspection-stats">
      <div
        v-for="stat in inspectionStats"
        :key="stat.id"
        class="inspection-stat-item"
        :class="stat.type"
      >
        <div class="stat-icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表标题 -->
    <div class="chart-header">
      <h4 class="chart-title">近10天巡检结果情况</h4>
      <div class="chart-legend">
        <span class="legend-item">
          <span class="legend-color" style="background: #52c41a;"></span>
          正常
        </span>
        <span class="legend-item">
          <span class="legend-color" style="background: #faad14;"></span>
          异常
        </span>
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
import { ElButton } from 'element-plus'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 巡检统计数据
const inspectionStats = ref([
  {
    id: 'total-inspections',
    label: '本月巡检次数',
    value: '23',
    icon: 'fa fa-search',
    type: 'primary'
  },
  {
    id: 'normal-inspections',
    label: '正常',
    value: '23',
    icon: 'fa fa-check-circle',
    type: 'success'
  },
  {
    id: 'abnormal-inspections',
    label: '异常',
    value: '9',
    icon: 'fa fa-exclamation-circle',
    type: 'danger'
  }
])

// 图表数据
const chartData = ref({
  dates: ['07/01', '07/02', '07/03', '07/04', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10'],
  normal: [150, 180, 160, 200, 220, 190, 240, 210, 180, 230],
  abnormal: [50, 60, 40, 80, 90, 70, 100, 85, 65, 95]
})

// ECharts 配置
const chartOption = computed(() => ({
  animation: true,
  animationDuration: 1000,
  animationEasing: 'cubicOut',
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
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: chartData.value.dates,
    axisLine: {
      lineStyle: {
        color: '#e8e8e8'
      }
    },
    axisLabel: {
      color: '#666'
    }
  },
  yAxis: {
    type: 'value',
    max: 250,
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
    }
  },
  series: [
    {
      name: '正常',
      type: 'bar',
      data: chartData.value.normal,
      itemStyle: {
        color: '#19BE6B'
      },
      barWidth: '30%'
    },
    {
      name: '异常',
      type: 'bar',
      data: chartData.value.abnormal,
      itemStyle: {
        color: '#FF9900'
      },
      barWidth: '30%'
    }
  ]
}))
</script>

<style scoped lang="scss">
.inspection-overview {
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

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;

  i {
    color: #52c41a;
    font-size: 14px;
  }
}

.inspection-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.inspection-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  flex: 1;
  border: 1px solid #f0f0f0;

  &.primary {
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
    border-color: #91d5ff;
  }

  &.success {
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
    border-color: #b7eb8f;
  }

  &.danger {
    background: linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%);
    border-color: #ffa39e;
  }
}

.stat-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  color: white;

  .primary & {
    background: #1890ff;
  }

  .success & {
    background: #52c41a;
  }

  .danger & {
    background: #ff4d4f;
  }
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  line-height: 1.2;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin: 0;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.chart-container {
  flex: 1;
  min-height: 200px;
}

.chart {
  width: 100%;
  height: 100%;
}

// 响应式设计
@media (max-width: 768px) {
  .inspection-overview {
    padding: 16px;
  }

  .inspection-stats {
    flex-direction: column;
    gap: 12px;
  }

  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .chart-legend {
    gap: 12px;
  }

  .chart-container {
    min-height: 250px;
  }
}
</style>
