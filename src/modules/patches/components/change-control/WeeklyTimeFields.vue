<template>
  <div class="weekly-time-fields">
    <el-form-item :label="t('patches.changeControl.weekdays')">
      <el-checkbox-group v-model="model.days" class="weekdays">
        <el-checkbox v-for="day in days" :key="day.value" :value="day.value">
          {{ day.label }}
        </el-checkbox>
      </el-checkbox-group>
    </el-form-item>

    <div class="time-fields">
      <el-form-item :label="t('patches.changeControl.start')">
        <el-time-picker
          v-model="model.start"
          format="HH:mm"
          value-format="HH:mm"
          :editable="false"
          :clearable="false"
        />
      </el-form-item>
      <div class="end-time">
        <el-form-item :label="t('patches.changeControl.end')">
          <el-time-picker
            v-model="endTime"
            format="HH:mm"
            value-format="HH:mm"
            :editable="false"
            :clearable="false"
            :disabled="endOfDay"
            :placeholder="endOfDay ? '24:00' : undefined"
          />
        </el-form-item>
        <el-checkbox v-model="endOfDay" class="end-of-day">
          {{ t('patches.changeControl.endOfDay') }}
        </el-checkbox>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { currentLocale, t } from '@/core/i18n'

const model = defineModel({ type: Object, required: true })

const days = computed(() => {
  const formatter = new Intl.DateTimeFormat(currentLocale.value, {
    weekday: 'short',
    timeZone: 'UTC'
  })
  return Array.from({ length: 7 }, (_, index) => ({
    value: index + 1,
    label: formatter.format(Date.UTC(2026, 0, index + 5))
  }))
})

// The API distinguishes the end-of-day marker from a selectable clock time.
const endOfDay = computed({
  get: () => model.value.end === '24:00',
  set: checked => { model.value.end = checked ? '24:00' : '00:00' }
})
const endTime = computed({
  get: () => endOfDay.value ? '' : model.value.end,
  set: value => { model.value.end = value }
})
</script>

<style scoped>
.weekly-time-fields {
  display: grid;
  gap: 12px;
}

.weekly-time-fields :deep(.el-form-item) {
  margin-bottom: 0;
}

.weekdays {
  display: flex;
  flex-wrap: wrap;
  gap: 0 14px;
}

.weekdays :deep(.el-checkbox) {
  margin-right: 0;
}

.time-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 12px 16px;
}

.time-fields :deep(.el-date-editor) {
  width: 100%;
}

.end-time {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.end-of-day {
  justify-self: start;
  height: auto;
}
</style>
