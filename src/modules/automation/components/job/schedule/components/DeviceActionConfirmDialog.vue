<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="600px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!submitting"
    :before-close="close"
  >
    <p>{{ description }}</p>
    <DeviceSelectionSummary :selection="selection" show-targets />
    <template #footer>
      <el-button :disabled="submitting" @click="close()">取消</el-button>
      <el-button :disabled="submitting" @click="$emit('change-devices')">更改设备</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="submitting || !selection.length"
        @click="$emit('confirm', selection)"
      >
        开始扫描
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup>
import DeviceSelectionSummary from './DeviceSelectionSummary.vue'
const props = defineProps({
  modelValue: Boolean,
  title: String,
  description: String,
  selection: { type: Array, default: () => [] },
  submitting: Boolean
})
const emit = defineEmits(['update:modelValue', 'confirm', 'change-devices'])
function close(done) {
  if (props.submitting) return
  emit('update:modelValue', false)
  if (typeof done === 'function') done()
}
</script>
