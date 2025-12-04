<template>
  <el-dialog
    :model-value="visible"
    title="巡检结果"
    width="700px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div v-loading="loading" class="check-item-detail-dialog">
      <div class="result-item">
        <span class="result-label">结果：</span>
        <el-tag v-if="item" :type="getKpiStatusTagType(item.status)" size="small">
          {{ getKpiStatusLabel(item.status) }}
        </el-tag>
      </div>
      <div class="result-item">
        <span class="result-label">检查项：</span>
        <span class="result-value">{{ item?.name || '-' }}</span>
      </div>
      <div class="result-item">
        <span class="result-label">结果输出：</span>
      </div>
      <div v-if="item?.output" class="output-content">
        <pre>{{ item.output }}</pre>
      </div>
      <div v-else class="output-content">
        <pre class="empty">无输出内容</pre>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { getKpiStatusTagType, getKpiStatusLabel } from '../../constants/status'

defineProps({
  visible: Boolean,
  item: Object,
  loading: Boolean
})

defineEmits(['close'])
</script>

<style scoped lang="scss">
.check-item-detail-dialog {
  .result-item {
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.8;

    .result-label {
      font-weight: bold;
      color: #303133;
    }

    .result-value {
      color: #606266;
    }
  }

  .output-content {
    margin-top: 8px;

    pre {
      max-height: 350px;
      padding: 12px;
      background: #f5f7fa;
      color: #303133;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;

      &.empty {
        color: #909399;
        font-style: italic;
      }
    }
  }
}
</style>
