<template>
  <div v-loading="loading" class="patch-detail">
    <template v-if="patch && patch.patch_id">
      <div class="patch-detail__header">
        <h3 class="patch-detail__id">{{ patch.patch_id }}</h3>
        <el-tag
          effect="dark"
          class="severity-tag"
          :class="getSeverityClass(patch.severity)"
        >
          {{ getSeverityLabel(patch.severity) }}
        </el-tag>
      </div>

      <p v-if="patch.title" class="patch-detail__title">{{ patch.title }}</p>

      <div v-if="showPublishDate && patch.publish_date" class="patch-detail__meta">
        <span class="patch-detail__meta-label">发布日期</span>
        <span class="patch-detail__meta-value">{{ formatDate(patch.publish_date) }}</span>
      </div>

      <section class="patch-detail__section">
        <h4 class="patch-detail__section-title">描述</h4>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="markdown" class="patch-detail__desc" v-html="renderedDescription"></div>
        <p v-else class="patch-detail__desc">{{ patch.description || '暂无描述' }}</p>
      </section>

      <section class="patch-detail__section">
        <h4 class="patch-detail__section-title">
          关联 CVE
          <span v-if="cveList.length" class="patch-detail__count">{{ cveList.length }}</span>
        </h4>
        <CveLinkList
          :cves="cveList"
          :url-resolver="cve => getCveUrl(cve, linkSource)"
          :max="0"
          empty-text="暂无关联 CVE"
        />
      </section>

      <section class="patch-detail__section">
        <h4 class="patch-detail__section-title">
          关联 CNNVD
          <span v-if="cnnvdList.length" class="patch-detail__count">{{ cnnvdList.length }}</span>
        </h4>
        <CveLinkList
          :cves="cnnvdList"
          :url-resolver="cnnvd => getCnnvdUrl(cnnvd)"
          :max="0"
          dialog-title="关联 CNNVD"
          empty-text="暂无关联 CNNVD"
        />
      </section>
    </template>
    <el-empty v-else-if="!loading" description="暂无补丁详情" :image-size="80" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  formatDate,
  getCVEList,
  getCveUrl,
  getCnnvdUrl,
  getSeverityClass,
  getSeverityLabel
} from '../../composables/useFormatters'
import CveLinkList from './CveLinkList.vue'

const props = defineProps({
  // 补丁数据对象
  patch: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  // CVE 外链来源（操作系统发行版 / 厂商），用于生成正确的厂商链接
  cveSource: {
    type: String,
    default: ''
  },
  // 描述是否按 Markdown 渲染
  markdown: {
    type: Boolean,
    default: false
  },
  // 是否展示发布日期
  showPublishDate: {
    type: Boolean,
    default: false
  }
})

const cveList = computed(() => getCVEList(props.patch?.related_vuls))
const cnnvdList = computed(() => getCVEList(props.patch?.related_cnnvds))

const linkSource = computed(
  () => props.patch?.os_distro || props.patch?.vendor || props.cveSource || ''
)

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const renderedDescription = computed(() => {
  const text = props.patch?.description
  if (!text) return '<span class="patch-detail__muted">暂无描述</span>'

  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
})
</script>

<style scoped lang="scss">
.patch-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 2px;
  min-height: 120px;
}

.patch-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.patch-detail__id {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--el-text-color-primary);
  font-family: 'SF Mono', 'JetBrains Mono', 'Consolas', monospace;
}

.patch-detail__title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.patch-detail__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  .patch-detail__meta-label {
    color: var(--el-text-color-secondary);
  }

  .patch-detail__meta-value {
    color: var(--el-text-color-regular);
    font-weight: 500;
  }
}

.patch-detail__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.patch-detail__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding-left: 10px;
  border-left: 3px solid var(--el-color-primary);
  line-height: 1.2;
}

.patch-detail__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 9px;
}

.patch-detail__desc {
  margin: 0;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color-light);
  border-radius: 8px;

  :deep(code) {
    padding: 1px 5px;
    font-size: 12px;
    font-family: 'SF Mono', 'Consolas', monospace;
    background: var(--el-fill-color-dark);
    border-radius: 4px;
  }

  :deep(a) {
    color: var(--el-color-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(.patch-detail__muted) {
    color: var(--el-text-color-secondary);
  }
}

.severity-tag {
  font-weight: 600;
  letter-spacing: 0.5px;
  border: none;

  &.is-critical {
    background-color: #dc3545;
    color: #fff;
  }

  &.is-important {
    background-color: #fd7e14;
    color: #fff;
  }

  &.is-moderate {
    background-color: #ffc107;
    color: #5c3c00;
  }

  &.is-low {
    background-color: #6c757d;
    color: #fff;
  }
}

</style>
