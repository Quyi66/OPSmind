<template>
  <el-dialog
    v-model="visible"
    :title="file?.path || file?.name || '文件内容'"
    width="80%"
    :close-on-click-modal="false"
    destroy-on-close
    class="file-content-dialog"
  >
    <div class="content-wrapper">
      <FileContentViewer
        ref="viewerRef"
        v-if="file"
        :path="file.path"
        :repo-type="repoType"
        :repo="repo"
        height="100%"
        @loaded="handleViewerLoaded"
        @updated="handleViewerUpdated"
      />
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import FileContentViewer from '@/modules/automation/components/job/JobListView/FileContentViewer.vue'

const props = defineProps({
  modelValue: Boolean,
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  openMode: {
    type: String,
    default: 'view'
  },
  file: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'updated'])

const viewerRef = ref(null)
const shouldAutoOpenEdit = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

watch(
  () => props.modelValue,
  isVisible => {
    shouldAutoOpenEdit.value = isVisible && props.openMode === 'edit'
  },
  { immediate: true }
)

function handleViewerLoaded() {
  if (!shouldAutoOpenEdit.value) return

  shouldAutoOpenEdit.value = false
  nextTick(() => {
    viewerRef.value?.openEditInfo?.()
  })
}

function handleViewerUpdated(payload) {
  emit('updated', payload)
}
</script>

<style scoped>
.file-content-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.content-wrapper {
  height: calc(100vh - 280px);
  display: flex;
  flex-direction: column;
}
</style>
