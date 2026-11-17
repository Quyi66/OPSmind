<template>
  <fieldset class="implementation-plan">
    <legend>{{ t('patches.changeControl.plan') }}</legend>
    <p>{{ t('patches.changeControl.serverTime') }}</p>
    <div class="implementation-plan__fields">
      <label v-if="!scheduled">
        {{ t('patches.changeControl.planStart') }}
        <el-date-picker v-model="model.planStartTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
          :aria-label="t('patches.changeControl.planStart')" :disabled="disabled" />
      </label>
      <label>
        {{ t('patches.changeControl.planEnd') }}
        <el-date-picker v-model="model.planEndTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss"
          :aria-label="t('patches.changeControl.planEnd')" :disabled="disabled" />
      </label>
      <label>
        {{ t('patches.changeControl.reason') }}
        <el-input v-model="model.applyReason" :aria-label="t('patches.changeControl.reason')" :disabled="disabled" />
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { t } from '@/core/i18n'

const model = defineModel({ type: Object, required: true })
defineProps({ scheduled: Boolean, disabled: Boolean })
</script>

<style scoped>
.implementation-plan {
  min-width: 0;
  padding: 10px 14px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin: 12px 0;
}
.implementation-plan p { margin: 0 0 8px; color: var(--el-text-color-secondary); }
.implementation-plan__fields { display: flex; flex-wrap: wrap; gap: 12px; }
.implementation-plan label { display: grid; gap: 4px; }
.implementation-plan :deep(.el-date-editor) { width: 220px; }
</style>
