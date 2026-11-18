<template>
  <section class="implementation-plan" :aria-labelledby="`${id}-title`">
    <header class="implementation-plan__header">
      <h3 :id="`${id}-title`">{{ t('patches.changeControl.plan') }}</h3>
      <p>{{ t('patches.changeControl.serverTime') }}</p>
    </header>
    <div class="implementation-plan__dates">
      <div v-if="!scheduled" class="implementation-plan__field">
        <label :for="`${id}-start`">{{ t('patches.changeControl.planStart') }}</label>
        <el-date-picker
          :id="`${id}-start`"
          v-model="model.planStartTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="t('patches.changeControl.selectDateTime')"
          :disabled="disabled"
        />
      </div>
      <div class="implementation-plan__field">
        <label :for="`${id}-end`">{{ t('patches.changeControl.planEnd') }}</label>
        <el-date-picker
          :id="`${id}-end`"
          v-model="model.planEndTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="t('patches.changeControl.selectDateTime')"
          :disabled="disabled"
        />
      </div>
    </div>
    <div class="implementation-plan__field">
      <label :for="`${id}-reason`">{{ t('patches.changeControl.reason') }}</label>
      <el-input
        :id="`${id}-reason`"
        v-model="model.applyReason"
        type="textarea"
        :rows="2"
        :disabled="disabled"
      />
    </div>
  </section>
</template>

<script setup>
import { useId } from 'vue'
import { t } from '@/core/i18n'

const id = useId()
const model = defineModel({ type: Object, required: true })
defineProps({ scheduled: Boolean, disabled: Boolean })
</script>

<style scoped>
.implementation-plan {
  display: grid;
  gap: 14px;
  min-width: 0;
  margin: 8px 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.implementation-plan__header {
  display: grid;
  gap: 4px;
}

.implementation-plan__header h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.implementation-plan__header p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.implementation-plan__dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 12px 16px;
  align-items: end;
}

.implementation-plan__field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.implementation-plan :deep(.el-date-editor) {
  width: 100%;
}
</style>
