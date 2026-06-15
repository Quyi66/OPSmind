<template>
  <div v-if="kbList.length" class="win-kb-link-list">
    <template v-for="kbNumber in visibleKbs" :key="kbNumber">
      <button v-if="hasCve" type="button" class="win-kb-link" @click.stop="selectKb(kbNumber)">
        {{ kbNumber }}
      </button>
      <a
        v-else
        :href="resolveUrl(kbNumber)"
        target="_blank"
        rel="noopener noreferrer"
        class="win-kb-link win-kb-link--external"
        @click.stop
      >
        {{ kbNumber }}
      </a>
    </template>
    <button
      v-if="overflowCount > 0"
      type="button"
      class="win-kb-link win-kb-link--more"
      @click.stop="dialogVisible = true"
    >
      +{{ overflowCount }}
    </button>

    <el-dialog
      v-if="overflowCount > 0"
      v-model="dialogVisible"
      :title="dialogTitle"
      width="560px"
      append-to-body
      destroy-on-close
    >
      <div class="win-kb-link-list win-kb-link-list--dialog">
        <template v-for="kbNumber in kbList" :key="kbNumber">
          <button
            v-if="hasCve"
            type="button"
            class="win-kb-link"
            @click.stop="selectKb(kbNumber, true)"
          >
            {{ kbNumber }}
          </button>
          <a
            v-else
            :href="resolveUrl(kbNumber)"
            target="_blank"
            rel="noopener noreferrer"
            class="win-kb-link win-kb-link--external"
            @click.stop="dialogVisible = false"
          >
            {{ kbNumber }}
          </a>
        </template>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
  <span v-else class="win-kb-link-list__empty">{{ emptyText }}</span>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  kbNumbers: {
    type: [Array, String],
    default: () => []
  },
  max: {
    type: Number,
    default: 3
  },
  dialogTitle: {
    type: String,
    default: '关联 KB'
  },
  emptyText: {
    type: String,
    default: '-'
  },
  hasCve: {
    type: Boolean,
    default: true
  },
  kbDetail: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['select-kb'])

const dialogVisible = ref(false)

const kbList = computed(() => {
  const raw = props.kbNumbers
  let values = []

  if (Array.isArray(raw)) {
    values = raw.map(normalizeKbNumber).filter(Boolean)
  } else {
    values = String(raw || '')
      .split(/[,，;；\s]+/)
      .map(normalizeKbNumber)
      .filter(Boolean)
  }

  return Array.from(new Set(values))
})

const visibleKbs = computed(() => {
  if (!props.max || props.max <= 0) {
    return kbList.value
  }
  return kbList.value.slice(0, props.max)
})

const overflowCount = computed(() => kbList.value.length - visibleKbs.value.length)

function normalizeKbNumber(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (!normalized) return ''

  const match = normalized.match(/KB\s*\d+/i)
  if (match) {
    return match[0].replace(/\s+/g, '')
  }

  return /^\d+$/.test(normalized) ? `KB${normalized}` : normalized
}

function selectKb(kbNumber, closeDialog = false) {
  if (closeDialog) {
    dialogVisible.value = false
  }
  emit('select-kb', kbNumber)
}

// ----------------- External URL resolution helper logic (from WindowsKbDetail.vue) -----------------

function normalizeUrl(value) {
  return String(value || '').trim()
}

function isMicrosoftSupportUrl(value) {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.hostname.toLowerCase() === 'support.microsoft.com'
  } catch {
    return false
  }
}

function isAcceptableMicrosoftSupportUrl(value, kbNumber, requireKbInUrl = false) {
  if (!isMicrosoftSupportUrl(value)) return false
  if (!requireKbInUrl) return true

  return hasKbNumberInUrl(value, kbNumber)
}

function hasKbNumberInUrl(value, kbNumber) {
  if (!value || !kbNumber) return false

  try {
    return decodeURIComponent(value).toUpperCase().includes(kbNumber)
  } catch {
    return String(value).toUpperCase().includes(kbNumber)
  }
}

function shouldUseSupportSearchFallback(kbDetail) {
  const text = [
    kbDetail?.title,
    kbDetail?.description,
    kbDetail?.products,
    kbDetail?.classification
  ]
    .map(value => String(value || ''))
    .join(' ')

  return /\b\.NET\b/i.test(text)
}

function buildMicrosoftSupportSearchUrl(kbNumber) {
  return kbNumber
    ? `https://support.microsoft.com/zh-cn/search/results?query=${encodeURIComponent(kbNumber)}`
    : ''
}

function buildMicrosoftSupportHelpUrl(kbNumber) {
  const articleId = String(kbNumber || '').match(/\d+/)?.[0]
  return articleId ? `https://support.microsoft.com/help/${encodeURIComponent(articleId)}` : ''
}

function resolveKbSupportUrl(kbDetail, kbNumber) {
  const normalizedKb = normalizeKbNumber(kbNumber)
  const useSearchFallback = shouldUseSupportSearchFallback(kbDetail)
  const supportUrl = [
    'supportUrl',
    'support_url',
    'supportArticleUrl',
    'support_article_url',
    'articleUrl',
    'article_url',
    'moreInfoUrl',
    'more_info_url',
    'webUrl',
    'web_url',
    'kbUrl',
    'kb_url'
  ]
    .map(key => normalizeUrl(kbDetail?.[key]))
    .find(url => isAcceptableMicrosoftSupportUrl(url, normalizedKb, useSearchFallback))

  if (supportUrl) return supportUrl

  return useSearchFallback
    ? buildMicrosoftSupportSearchUrl(normalizedKb)
    : buildMicrosoftSupportHelpUrl(normalizedKb)
}

function resolveUrl(kbNumber) {
  return resolveKbSupportUrl(props.kbDetail || {}, kbNumber)
}
</script>

<style scoped lang="scss">
.win-kb-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.win-kb-link-list--dialog {
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
}

.win-kb-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border: 1px solid rgba(64, 158, 255, 0.25);
  border-radius: 4px;
  appearance: none;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 20px;
  text-align: left;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    border-color: #409eff;
    background: #409eff;
    color: #fff;
    text-decoration: none;
  }
}

.win-kb-link--external {
  &::after {
    content: '↗';
    font-size: 11px;
    opacity: 0.7;
  }
}

.win-kb-link--more {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-color: var(--el-border-color);

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }
}

.win-kb-link-list__empty {
  color: var(--el-text-color-secondary);
}
</style>
