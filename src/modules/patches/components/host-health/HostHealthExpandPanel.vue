<template>
  <div class="host-expand-panel">
    <template v-if="host.status === 'UNCHECKED'">
      <div class="expand-empty-tip">
        <i class="fas fa-info-circle me-1" aria-hidden="true"></i>
        该主机纳管后尚未巡检，暂无检查项与风险数据。
      </div>
    </template>

    <template v-else>
      <!-- 风险提示区域 -->
      <div v-if="host.risks && host.risks.length" class="expand-section mb-3">
        <div class="expand-section-title">
          <i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>
          风险提示 ({{ host.risks.length }})
        </div>
        <div class="expand-risk-list">
          <div v-for="(risk, idx) in host.risks" :key="idx" class="expand-risk-item">
            {{ risk }}
          </div>
        </div>
      </div>

      <!-- 全部检查项网格展示 -->
      <div class="expand-section">
        <div class="expand-section-title">
          <i class="fas fa-clipboard-check me-1" aria-hidden="true"></i>
          检查项明细 ({{ sortedItems.length }})
        </div>
        <div v-if="sortedItems.length" class="expand-items-grid">
          <div
            v-for="item in sortedItems"
            :key="item.name"
            class="expand-check-card"
            :class="`expand-check-card--${item.level}`"
          >
            <div class="check-card-name" :title="item.name">{{ item.name }}</div>
            <div class="check-card-right">
              <span class="check-card-val">{{ item.value }}</span>
              <el-tag :type="getHealthItemLevelMeta(item.level).tagType" size="small" round>
                {{ getHealthItemLevelMeta(item.level).label }}
              </el-tag>
            </div>
          </div>
        </div>
        <div v-else class="expand-empty-tip">
          暂无检查项数据（主机不可达或巡检脚本执行失败）
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getHealthItemLevelMeta, enrichAndSortCheckItems } from '../../utils/hostHealth'

const props = defineProps({
  host: {
    type: Object,
    required: true
  }
})

const sortedItems = computed(() => enrichAndSortCheckItems(props.host?.items || []))
</script>

<style scoped lang="scss">
.host-expand-panel {
  padding: 12px 20px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.expand-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.expand-risk-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.expand-risk-item {
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--el-color-warning-light-9);
  border-left: 3px solid var(--el-color-warning);
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 1.5;
}

.expand-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}

.expand-check-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
}

.expand-check-card--CRITICAL {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.expand-check-card--WARNING {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.check-card-name {
  color: var(--el-text-color-regular);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-card-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.check-card-val {
  color: var(--el-text-color-primary);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.expand-empty-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  padding: 4px 0;
}
</style>
