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
            <el-tag :type="getSeverityType(patchData.severity)" size="small">
              {{ patchData.severity }}
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
                :href="`https://access.redhat.com/security/cve/${cve}`"
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
import { formatDate, getCVEList, getSeverityType } from '../../composables/useFormatters'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  patchData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
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
    color: #64748b;
    font-weight: 500;
    flex-shrink: 0;
  }

  .detail-value {
    flex: 1;
    color: #1e293b;
    word-break: break-word;
  }
}

.description-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #334155;
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
  background: #6c757d;
  color: #fff;
  border-radius: 3px;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #495057;
  }
}
</style>
