<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('asset.health.rulesTitle')"
    width="720px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <el-alert
      :title="t('asset.health.rulesHint')"
      type="info"
      show-icon
      :closable="false"
      class="mb-3"
    />

    <div class="ops-table-wrapper">
      <el-table :data="HEALTH_SCORING_RULES" max-height="440" style="width: 100%">
        <el-table-column type="index" label="#" width="52" />
        <el-table-column prop="label" :label="t('asset.health.checkItem')" min-width="240" show-overflow-tooltip />
        <el-table-column prop="threshold" :label="t('asset.health.thresholdLabel')" min-width="160" />
        <el-table-column prop="deduction" :label="t('asset.health.deductions')" width="160" />
      </el-table>
    </div>

    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">{{ t('asset.health.gotIt') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

import { HEALTH_SCORING_RULES } from '../../constants/hostHealth'

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
</script>
