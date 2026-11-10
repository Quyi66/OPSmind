<template>
  <div class="device-selection-summary">
    <span>{{ formatDeviceSelection(selection) }}</span>
    <span v-if="hasDynamicTargets" class="selection-note">（分组、标签按执行时的成员展开）</span>
    <details v-if="showTargets && selection.length" class="selection-targets" open>
      <summary>目标明细</summary>
      <ul>
        <li v-for="(item, index) in selection" :key="index">
          {{ item.value || item.key || item }}
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDeviceSelection, summarizeDeviceSelection } from './deviceSelectionSummary'
const props = defineProps({
  selection: { type: Array, default: () => [] },
  showTargets: { type: Boolean, default: false }
})
const hasDynamicTargets = computed(() => {
  const counts = summarizeDeviceSelection(props.selection)
  return counts.groups + counts.tags > 0
})
</script>

<style scoped>
.selection-note {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.selection-targets {
  margin-top: 8px;
}
.selection-targets ul {
  max-height: 160px;
  overflow: auto;
  padding-left: 24px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
