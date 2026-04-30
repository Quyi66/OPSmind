<template>
  <el-dialog
    v-model="dialogVisible"
    title="RPM 包详情"
    width="880px"
    destroy-on-close
    class="rpm-package-detail-dialog"
  >
    <div v-loading="loading" class="rpm-package-detail">
      <template v-if="loading || hasDetail">
        <el-descriptions :column="2" border size="small" class="detail-descriptions">
          <el-descriptions-item label="包名">
            {{ normalizedDetail.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">
            {{ normalizedDetail.source || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="架构">
            {{ normalizedDetail.architecture || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ versionText }}
          </el-descriptions-item>
          <el-descriptions-item label="摘要" :span="2">
            {{ normalizedDetail.summary || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="RPM 路径" :span="2">
            <span class="mono-text">{{ normalizedDetail.rpmPath || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            <div class="pre-wrap">{{ normalizedDetail.description || '暂无描述信息' }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <section class="detail-section">
          <h4 class="detail-section__title">Changelog</h4>
          <div class="detail-section__content pre-wrap mono-text">
            {{ normalizedDetail.changelog || '暂无 changelog 信息' }}
          </div>
        </section>

        <section class="detail-section">
          <h4 class="detail-section__title">关联服务</h4>
          <div v-if="normalizedDetail.services.length" class="service-list">
            <el-tag v-for="service in normalizedDetail.services" :key="service" size="small">
              {{ service }}
            </el-tag>
          </div>
          <el-empty v-else description="暂无关联服务" :image-size="56" />
        </section>
      </template>

      <el-empty v-else description="暂无 RPM 包详情" :image-size="80" />
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { formatRpmVersion, normalizeRpmPackageDetail } from '../../utils/rpmPackageInfo'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  detailData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const normalizedDetail = computed(() => normalizeRpmPackageDetail(props.detailData))

const versionText = computed(() => formatRpmVersion(normalizedDetail.value))

const hasDetail = computed(() => {
  const detail = normalizedDetail.value
  return Boolean(
    detail.name ||
      detail.summary ||
      detail.description ||
      detail.changelog ||
      detail.rpmPath ||
      detail.services.length
  )
})
</script>

<style scoped lang="scss">
.rpm-package-detail {
  min-height: 200px;
}

.detail-descriptions {
  margin-bottom: 16px;
}

.detail-section {
  margin-top: 16px;
}

.detail-section__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-section__content {
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

.mono-text {
  font-family: Consolas, 'Courier New', monospace;
}

.service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
