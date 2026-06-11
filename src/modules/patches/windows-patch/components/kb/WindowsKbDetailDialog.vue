<template>
  <el-dialog
    v-model="visibleModel"
    :title="dialogTitle"
    width="88%"
    top="4vh"
    append-to-body
    destroy-on-close
    class="win-kb-detail-dialog"
    :close-on-click-modal="false"
  >
    <div class="win-kb-detail-dialog__body">
      <WindowsKbDetail
        v-if="currentKbNumber"
        :kb-number="currentKbNumber"
        :show-breadcrumb="false"
      />
    </div>
    <template #footer>
      <el-button @click="visibleModel = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WindowsKbDetail from './WindowsKbDetail.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  kbNumber: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const currentKbNumber = ref('')

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const dialogTitle = computed(() =>
  currentKbNumber.value ? `Windows KB 详情 - ${currentKbNumber.value}` : 'Windows KB 详情'
)

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

watch(
  [() => props.modelValue, () => props.kbNumber],
  ([open, kbNumber]) => {
    if (open) {
      currentKbNumber.value = normalizeKbNumber(kbNumber)
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.win-kb-detail-dialog__body {
  height: clamp(360px, calc(84vh - 120px), 760px);
  overflow: hidden;
}

:deep(.el-dialog__body) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
