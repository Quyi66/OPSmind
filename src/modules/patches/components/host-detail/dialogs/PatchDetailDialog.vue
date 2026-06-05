<template>
  <el-dialog
    v-model="visible"
    title="补丁详情"
    width="800px"
    destroy-on-close
    class="patch-detail-dialog"
  >
    <PatchDetailContent
      :patch="patchData"
      :loading="loading"
      :cve-source="osDistro"
      show-publish-date
    />
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import PatchDetailContent from '../../common/PatchDetailContent.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  patchData: {
    type: Object,
    default: () => ({})
  },
  osDistro: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})
</script>

<style scoped lang="scss">
.patch-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}
</style>
