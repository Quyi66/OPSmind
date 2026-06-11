<template>
  <div v-if="kbList.length" class="win-kb-link-list">
    <button
      v-for="kbNumber in visibleKbs"
      :key="kbNumber"
      type="button"
      class="win-kb-link"
      @click.stop="selectKb(kbNumber)"
    >
      {{ kbNumber }}
    </button>
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
        <button
          v-for="kbNumber in kbList"
          :key="kbNumber"
          type="button"
          class="win-kb-link"
          @click.stop="selectKb(kbNumber, true)"
        >
          {{ kbNumber }}
        </button>
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
