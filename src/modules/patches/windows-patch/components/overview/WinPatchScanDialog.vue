<template>
  <UnifiedPatchScanDialog
    :model-value="modelValue"
    :preselected-hosts="preselectedHosts"
    @update:model-value="$emit('update:modelValue', $event)"
    @submitted="$emit('submitted', $event)"
  />
</template>
<script setup>
import UnifiedPatchScanDialog from '@/modules/patches/components/common/UnifiedPatchScanDialog.vue'
defineProps({ modelValue: Boolean, preselectedHosts: { type: Array, default: () => [] } })
defineEmits(['update:modelValue', 'submitted'])
</script>
