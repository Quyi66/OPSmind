<template>
  <el-dialog
    v-model="visible"
    :title="file?.path || file?.name || '文件内容'"
    width="80%"
    top="5vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="file-content-dialog"
  >
    <div class="content-wrapper">
      <FileContentViewer
        v-if="file"
        :path="file.path"
        :repo-type="repoType"
        :repo="repo"
        height="60vh"
      />
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
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
  file: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<style scoped>
.file-content-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.content-wrapper {
  height: 60vh;
  display: flex;
  flex-direction: column;
}
</style>
