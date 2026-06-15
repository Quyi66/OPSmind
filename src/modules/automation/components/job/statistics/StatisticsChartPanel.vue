<template>
  <section class="stats-panel">
    <header class="stats-panel__header">
      <div class="stats-panel__meta">
        <h4 class="stats-panel__title">{{ title }}</h4>
        <p v-if="subtitle" class="stats-panel__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.toolbar" class="stats-panel__toolbar">
        <slot name="toolbar" />
      </div>
    </header>

    <div v-loading="loading" class="stats-panel__body" :style="panelBodyStyle">
      <el-empty v-if="!hasData && !loading" description="暂无统计数据" />
      <VChart v-else autoresize :option="option" class="stats-panel__chart" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DatasetComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DatasetComponent
])

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  option: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  height: {
    type: String,
    default: '320px'
  },
  fill: {
    type: Boolean,
    default: false
  },
  hasData: {
    type: Boolean,
    default: true
  }
})

const option = computed(() => props.option || {})
const panelBodyStyle = computed(() => (props.fill ? undefined : { height: props.height }))
</script>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.stats-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.stats-panel__meta {
  min-width: 0;
}

.stats-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stats-panel__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stats-panel__toolbar {
  flex-shrink: 0;
}

.stats-panel__body {
  position: relative;
  flex: 1;
  min-height: 220px;
}

.stats-panel__chart {
  height: 100%;
  width: 100%;
}
</style>
