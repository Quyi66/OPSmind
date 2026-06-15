<template>
  <section class="preview-panel">
    <div class="preview-panel__header">
      <div class="preview-panel__title-wrap">
        <h4 class="preview-panel__title">连通巡检</h4>
        <span class="preview-panel__meta">{{ totalText }}</span>
      </div>
      <button type="button" class="preview-panel__link" @click="$emit('view-all')">查看全部</button>
    </div>

    <div v-if="loading" class="preview-panel__state">加载中...</div>
    <div v-else-if="!items.length" class="preview-panel__state">暂无连通异常设备</div>

    <div v-else class="preview-panel__list">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="preview-row"
        @click="$emit('select', item.raw || item)"
      >
        <div class="preview-row__top">
          <strong class="preview-row__title">{{ item.title }}</strong>
          <span class="preview-row__badge">{{ item.badge }}</span>
        </div>
        <div class="preview-row__desc">{{ item.desc }}</div>
        <div class="preview-row__meta">{{ item.meta }}</div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select', 'view-all'])

const totalText = computed(() => `${Number(props.total || 0).toLocaleString('zh-CN')} 台`)
</script>

<style scoped lang="scss">
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--workbench-card-bg);
}

.preview-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-panel__title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.preview-panel__title {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 700;
}

.preview-panel__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.preview-panel__link {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--workbench-accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.preview-panel__state {
  padding: 18px 12px;
  border: 1px dashed var(--workbench-card-border);
  border-radius: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  text-align: center;
}

.preview-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  appearance: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 12px;
  background: var(--workbench-panel-bg);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.preview-row:hover {
  border-color: var(--workbench-card-hover-border);
  transform: translateY(-1px);
  box-shadow: 0 8px 18px -10px rgba(15, 23, 42, 0.2);
}

.preview-row__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-row__title {
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 700;
}

.preview-row__badge {
  flex: 0 0 auto;
  color: var(--workbench-warning);
  font-size: 12px;
  font-weight: 700;
}

.preview-row__desc,
.preview-row__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .preview-panel__header,
  .preview-row__top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
