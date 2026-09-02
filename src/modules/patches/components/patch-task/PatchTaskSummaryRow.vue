<template>
  <div class="patch-task-summary-row">
    <span class="patch-task-summary-row__label">{{ label }}</span>
    <div class="patch-task-summary-row__content">
      <div v-if="totalCount === 0" class="patch-task-summary-row__empty">{{ emptyText }}</div>
      <template v-else>
        <div v-if="totalCount > searchThreshold" class="patch-task-summary-row__toolbar">
          <el-input
            :model-value="searchText"
            :placeholder="searchPlaceholder"
            size="small"
            clearable
            @update:model-value="$emit('update:searchText', $event)"
          />
          <span>共 {{ totalCount }} {{ unit }}，已显示 {{ items.length }} {{ unit }}</span>
        </div>
        <div
          class="patch-task-summary-row__list"
          :class="{ 'is-contained': contained }"
          :style="contained ? { maxHeight } : undefined"
        >
          <div
            v-for="(item, index) in normalizedItems"
            :key="resolveKey(item, index)"
            class="patch-task-summary-row__item"
            :class="{ 'is-package': packageStyle }"
          >
            <slot name="item" :item="item.source" :normalized-item="item">
              <div>{{ item.primary }}</div>
              <div v-if="item.secondary" class="patch-task-summary-row__subtext">
                {{ item.secondary }}
              </div>
            </slot>
          </div>
          <div
            v-if="normalizedItems.length === 0"
            class="patch-task-summary-row__empty is-filtered"
          >
            {{ noMatchText }}
          </div>
          <div v-if="hasMore" class="patch-task-summary-row__more">
            <el-button link type="primary" size="small" @click="$emit('load-more')">
              加载更多 (已显示 {{ items.length }}/{{ filteredCount }})
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  total: {
    type: Number,
    default: undefined
  },
  filteredTotal: {
    type: Number,
    default: undefined
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  noMatchText: {
    type: String,
    default: '未匹配到相关内容'
  },
  searchText: {
    type: String,
    default: ''
  },
  searchPlaceholder: {
    type: String,
    default: '搜索内容...'
  },
  searchThreshold: {
    type: Number,
    default: Number.MAX_SAFE_INTEGER
  },
  unit: {
    type: String,
    default: '个'
  },
  hasMore: {
    type: Boolean,
    default: false
  },
  maxHeight: {
    type: String,
    default: '150px'
  },
  packageStyle: {
    type: Boolean,
    default: false
  },
  contained: {
    type: Boolean,
    default: false
  },
  itemKey: {
    type: Function,
    default: null
  },
  itemFormatter: {
    type: Function,
    default: null
  }
})

defineEmits(['update:searchText', 'load-more'])

const totalCount = computed(() => props.total ?? props.items.length)
const filteredCount = computed(() => props.filteredTotal ?? props.items.length)
const normalizedItems = computed(() =>
  props.items.map(item => {
    if (props.itemFormatter) {
      return { source: item, primary: props.itemFormatter(item), secondary: '' }
    }
    if (item && typeof item === 'object') {
      return {
        source: item,
        primary: item.primary || item.label || item.name || item.id || '-',
        secondary: item.secondary || ''
      }
    }
    return { source: item, primary: String(item ?? ''), secondary: '' }
  })
)

function resolveKey(item, index) {
  if (props.itemKey) return props.itemKey(item.source)
  if (item.source && typeof item.source === 'object') {
    return (
      item.source.key ||
      item.source.id ||
      item.source.hostId ||
      item.source.hostKey ||
      `${index}-${item.primary}`
    )
  }
  return `${index}-${item.primary}`
}
</script>

<style scoped lang="scss">
.patch-task-summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
}

.patch-task-summary-row__label {
  flex-shrink: 0;
  min-width: 90px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.patch-task-summary-row__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.patch-task-summary-row__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  margin-bottom: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;

  .el-input {
    width: 200px;
  }
}

.patch-task-summary-row__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;

  &.is-contained {
    box-sizing: border-box;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
  }
}

.patch-task-summary-row__item {
  color: var(--el-text-color-primary);
  line-height: 1.5;
  word-break: break-all;

  .is-contained & {
    padding: 4px 0;
    border-bottom: 1px dashed var(--el-border-color-extra-light);

    &:last-child {
      border-bottom: none;
    }
  }

  &.is-package {
    padding: 2px 0;
    font-family: monospace;
    font-size: 14px;
  }
}

.patch-task-summary-row__subtext {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.patch-task-summary-row__empty {
  color: var(--el-text-color-placeholder);

  &.is-filtered {
    font-size: 12px;
  }
}

.patch-task-summary-row__more {
  padding-top: 8px;
  text-align: center;
}
</style>
