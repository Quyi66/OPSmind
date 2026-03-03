<template>
  <el-dialog
    v-model="visible"
    :title="patchData.patch_id || '补丁详情'"
    width="1200px"
    destroy-on-close
    class="patch-detail-dialog"
  >
    <div v-loading="loading" class="patch-detail-content">
      <div v-if="patchData.patch_id" class="detail-section">
        <div class="detail-item">
          <div class="detail-label">摘要：</div>
          <div class="detail-value">{{ patchData.title }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">严重程度：</div>
          <div class="detail-value">
            <el-tag
              :type="getSeverityType(patchData.severity)"
              :class="['severity-tag', getSeverityClass(patchData.severity)]"
              size="small"
            >
              {{ getSeverityLabel(patchData.severity) }}
            </el-tag>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">发布日期：</div>
          <div class="detail-value">{{ formatDate(patchData.publish_date) }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">关联CVE：</div>
          <div class="detail-value">
            <div class="cve-list">
              <a
                v-for="cve in getCVEList(patchData.related_vuls)"
                :key="cve"
                :href="getCveUrl(cve, osDistro)"
                target="_blank"
                class="cve-badge"
              >
                {{ cve }}
              </a>
            </div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">描述：</div>
          <div class="detail-value description-text">{{ patchData.description }}</div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate, getCVEList, getCveUrl, getSeverityType } from '../../composables/useFormatters'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  patchData: {
    type: Object,
    default: () => ({})
  },
  osDistro: {
    type: String,
    default: ''
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

function normalizeSeverity(severity) {
  const raw = String(severity || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()

  if (lower === 'critical' || raw === '严重' || raw === 'Critical') return 'critical'
  if (lower === 'important' || raw === '重要' || raw === '高危' || raw === 'Important')
    return 'important'
  if (lower === 'moderate' || raw === '中等' || raw === '中危' || raw === 'Moderate')
    return 'moderate'
  if (lower === 'low' || raw === '低' || raw === '低危' || raw === 'Low') return 'low'

  return ''
}

function getSeverityClass(severity) {
  const key = normalizeSeverity(severity)
  return key ? `is-${key}` : ''
}

function getSeverityLabel(severity) {
  const map = {
    critical: '严重',
    important: '重要',
    moderate: '中等',
    low: '低危'
  }
  return map[normalizeSeverity(severity)] || severity || '-'
}
</script>

<style scoped lang="scss">
.patch-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.patch-detail-content {
  min-height: 200px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  gap: 12px;

  .detail-label {
    min-width: 80px;
    color: var(--el-text-color-regular);
    font-weight: 500;
    flex-shrink: 0;
  }

  .detail-value {
    flex: 1;
    color: var(--el-text-color-primary);
    word-break: break-word;
  }
}

.description-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.cve-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cve-badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  background: var(--el-fill-color-dark);
  color: var(--el-text-color-primary);
  border-radius: 3px;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid var(--el-border-color-light);

  &:hover {
    background: var(--el-fill-color-darker);
  }
}
</style>
