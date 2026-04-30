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
          <div class="detail-section__header">
            <h4 class="detail-section__title">Changelog</h4>
            <span v-if="parsedChangelog.isStructured" class="detail-section__meta">
              {{ changelogEntryCount }} 条记录
            </span>
          </div>
          <div v-if="parsedChangelog.isStructured" class="changelog-list">
            <article
              v-for="(entry, entryIndex) in parsedChangelog.entries"
              :key="`${entry.header || 'entry'}-${entryIndex}`"
              class="changelog-entry"
              :class="{ 'changelog-entry--intro': !entry.header }"
            >
              <div v-if="entry.header" class="changelog-entry__header">
                <div class="changelog-entry__summary">
                  <div v-if="entry.dateText" class="changelog-entry__date">{{ entry.dateText }}</div>
                  <div v-if="entry.maintainer || entry.email" class="changelog-entry__author">
                    <span v-if="entry.maintainer">{{ entry.maintainer }}</span>
                    <span v-if="entry.email" class="changelog-entry__email">&lt;{{ entry.email }}&gt;</span>
                  </div>
                  <div v-else class="changelog-entry__headline">{{ entry.headline || entry.header }}</div>
                </div>
                <span v-if="entry.version" class="changelog-entry__version">{{ entry.version }}</span>
              </div>
              <div v-if="entry.notes.length" class="changelog-entry__notes">
                <p v-for="(note, noteIndex) in entry.notes" :key="noteIndex" class="changelog-entry__note">
                  {{ note }}
                </p>
              </div>
              <ul v-if="entry.items.length" class="changelog-entry__items">
                <li
                  v-for="(item, itemIndex) in entry.items"
                  :key="itemIndex"
                  class="changelog-entry__item pre-wrap"
                >
                  {{ item }}
                </li>
              </ul>
            </article>
          </div>
          <div v-else class="detail-section__content changelog-raw pre-wrap mono-text">
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
import { formatRpmVersion, normalizeRpmPackageDetail, parseRpmChangelog } from '../../utils/rpmPackageInfo'

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
const parsedChangelog = computed(() => parseRpmChangelog(normalizedDetail.value.changelog))
const changelogEntryCount = computed(() => parsedChangelog.value.entries.filter(entry => entry.header).length)

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
.detail-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.detail-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.detail-section__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
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
.changelog-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.changelog-entry {
  position: relative;
  padding: 14px 16px 14px 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--el-fill-color-blank) 0%, var(--el-fill-color-light) 100%);
}

.changelog-entry::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 8px 0 0 8px;
  background: var(--el-color-primary-light-5);
}

.changelog-entry--intro::before {
  background: var(--el-color-info-light-5);
}

.changelog-entry__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.changelog-entry__summary {
  min-width: 0;
}

.changelog-entry__date {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
}

.changelog-entry__author {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.changelog-entry__email {
  font-family: Consolas, 'Courier New', monospace;
}

.changelog-entry__headline {
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
}

.changelog-entry__version {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  line-height: 20px;
}

.changelog-entry__notes {
  margin-bottom: 10px;
}

.changelog-entry__note {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.7;
}

.changelog-entry__note + .changelog-entry__note {
  margin-top: 6px;
}

.changelog-entry__items {
  margin: 0;
  padding-left: 18px;
  color: var(--el-text-color-regular);
}

.changelog-entry__item {
  line-height: 1.7;
}

.changelog-entry__item + .changelog-entry__item {
  margin-top: 6px;
}

.changelog-raw {
  max-height: 360px;
  overflow: auto;
}

.service-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
