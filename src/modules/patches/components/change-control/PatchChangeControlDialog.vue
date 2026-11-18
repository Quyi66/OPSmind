<template>
  <el-dialog
    v-model="visible"
    :title="t('patches.changeControl.title')"
    width="min(780px, calc(100vw - 32px))"
    top="6vh"
    append-to-body
    :close-on-click-modal="false"
    :show-close="!saving"
    :close-on-press-escape="!saving"
  >
    <el-form v-loading="loading" label-position="top" :disabled="saving" class="change-control-form">
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <template v-if="draft">
        <section class="change-control-panel">
          <h3>{{ t('patches.changeControl.settings') }}</h3>
          <div class="change-control-grid">
            <div class="change-control-switch">
              <span>{{ t('patches.changeControl.enable') }}</span>
              <el-switch v-model="draft.windowEnabled" :aria-label="t('patches.changeControl.enable')" />
            </div>
            <div class="change-control-switch">
              <span>{{ t('patches.changeControl.requireApproval') }}</span>
              <el-switch v-model="draft.approvalRequired" :aria-label="t('patches.changeControl.requireApproval')" />
            </div>
            <el-form-item :label="t('patches.changeControl.timezone')">
              <el-select-v2
                v-model="draft.timezone"
                :options="timezoneOptions"
                :placeholder="t('patches.changeControl.selectTimezone')"
                filterable
              />
            </el-form-item>
            <el-form-item :label="t('patches.changeControl.offHoursPolicy')">
              <el-select v-model="draft.offHoursPolicy">
                <el-option
                  v-for="policy in policies"
                  :key="policy"
                  :value="policy"
                  :label="t(`patches.changeControl.policies.${policy}`)"
                />
              </el-select>
            </el-form-item>
          </div>
        </section>

        <section class="change-control-panel">
          <h3>{{ t('patches.changeControl.workHours') }}</h3>
          <WeeklyTimeFields v-model="draft.workHours" />
          <p class="change-control-hint">{{ t('patches.changeControl.weeklyHint') }}</p>
        </section>

        <section class="change-control-windows">
          <div class="change-control-heading">
            <h3>{{ t('patches.changeControl.window') }}</h3>
            <el-button type="primary" plain :icon="Plus" @click="draft.windows.push(newWindow())">
              {{ t('patches.changeControl.addWindow') }}
            </el-button>
          </div>
          <p v-if="draft.windows.length === 0" class="change-control-empty">
            {{ t('patches.changeControl.noWindows') }}
          </p>
          <div v-for="(window, index) in draft.windows" :key="index" class="change-control-panel">
            <div class="change-control-heading">
              <h4>{{ t('patches.changeControl.window') }} {{ index + 1 }}</h4>
              <el-button type="danger" link @click="draft.windows.splice(index, 1)">
                {{ t('common.delete') }}
              </el-button>
            </div>
            <el-form-item :label="t('automation.job.type')" class="change-control-type">
              <el-select v-model="window.type">
                <el-option
                  v-for="type in ['WEEKLY', 'DATE_RANGE']"
                  :key="type"
                  :value="type"
                  :label="t(`patches.changeControl.types.${type}`)"
                />
              </el-select>
            </el-form-item>
            <WeeklyTimeFields v-if="window.type === 'WEEKLY'" v-model="draft.windows[index]" />
            <div v-else class="change-control-grid">
              <el-form-item :label="t('patches.changeControl.start')">
                <el-date-picker
                  v-model="window.startTime"
                  type="datetime"
                  :format="dateTimeFormat(window.startTime)"
                  :value-format="dateTimeFormat(window.startTime)"
                  :editable="false"
                  :placeholder="t('patches.changeControl.selectDateTime')"
                />
              </el-form-item>
              <el-form-item :label="t('patches.changeControl.end')">
                <el-date-picker
                  v-model="window.endTime"
                  type="datetime"
                  :format="dateTimeFormat(window.endTime)"
                  :value-format="dateTimeFormat(window.endTime)"
                  :editable="false"
                  :placeholder="t('patches.changeControl.selectDateTime')"
                />
              </el-form-item>
            </div>
          </div>
        </section>
      </template>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button v-if="!draft && error" :disabled="loading" @click="load">{{ t('common.retry') }}</el-button>
      <el-button type="primary" :disabled="!draft || loading" :loading="saving" @click="save">
        {{ t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { t } from '@/core/i18n'
import { patchChangeControlApi } from '../../api'
import { apiErrorText } from '../../utils/changeControl'
import WeeklyTimeFields from './WeeklyTimeFields.vue'

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({ isAdmin: Boolean })
const loading = ref(false)
const saving = ref(false)
const draft = ref(null)
const error = ref('')
const policies = ['ALLOW', 'CONFIRM', 'REJECT']
const defaultTimezone = 'Asia/Shanghai'
const commonTimezones = [
  defaultTimezone, 'Asia/Hong_Kong', 'UTC', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney'
]
const availableTimezones = Intl.supportedValuesOf?.('timeZone') ?? []
const loadedTimezone = ref(defaultTimezone)
const timezoneOptions = computed(() =>
  [...new Set([...commonTimezones, ...availableTimezones, loadedTimezone.value])]
    .map(zone => ({ label: zone, value: zone }))
)
let version = 0

const newWindow = () => ({
  type: 'WEEKLY', days: [6, 7], start: '00:00', end: '24:00', startTime: '', endTime: ''
})
const dateTimeFormat = value => value?.length === 19 ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm'

async function load() {
  if (!visible.value || !props.isAdmin) return
  const token = ++version
  loading.value = true
  error.value = ''
  try {
    const { data } = await patchChangeControlApi.getConfig()
    if (token !== version) return
    loadedTimezone.value = data.timezone || defaultTimezone
    draft.value = {
      windowEnabled: data.windowEnabled ?? false,
      timezone: loadedTimezone.value,
      windows: (data.windows || []).map(window => ({ ...newWindow(), ...window })),
      workHours: { days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', ...data.workHours },
      offHoursPolicy: data.offHoursPolicy || 'CONFIRM',
      approvalRequired: data.approvalRequired ?? true
    }
  } catch (failure) {
    if (token === version) error.value = apiErrorText(failure, t('patches.changeControl.configLoadFailed'))
  } finally {
    if (token === version) loading.value = false
  }
}

async function save() {
  if (!visible.value || !props.isAdmin || !draft.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const { windows, ...config } = draft.value
    await patchChangeControlApi.saveConfig({
      ...config,
      windows: windows.map(({ type, days, start, end, startTime, endTime }) =>
        type === 'WEEKLY' ? { type, days, start, end } : { type, startTime, endTime }
      )
    })
    ElMessage.success(t('patches.changeControl.configSaved'))
    visible.value = false
  } catch (failure) {
    error.value = apiErrorText(failure, t('patches.changeControl.configSaveFailed'))
  } finally {
    saving.value = false
  }
}

watch([visible, () => props.isAdmin], ([open, isAdmin]) => {
  if (open && isAdmin) load()
  else {
    version += 1
    loading.value = false
    draft.value = null
  }
}, { immediate: true })
</script>

<style scoped>
.change-control-form {
  display: grid;
  gap: 20px;
  min-height: 48px;
}

.change-control-panel {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.change-control-panel h3,
.change-control-heading h3,
.change-control-heading h4 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.change-control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  align-items: start;
  gap: 14px 16px;
}

.change-control-grid :deep(.el-form-item),
.change-control-type {
  min-width: 0;
  margin-bottom: 0;
}

.change-control-grid :deep(.el-date-editor),
.change-control-grid :deep(.el-select) {
  width: 100%;
}

.change-control-type {
  width: min(100%, 320px);
}

.change-control-switch,
.change-control-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.change-control-switch {
  min-height: 40px;
  padding: 4px 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.change-control-switch :deep(.el-switch) {
  flex-shrink: 0;
}

.change-control-windows {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.change-control-heading {
  flex-wrap: wrap;
}

.change-control-empty,
.change-control-hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.change-control-empty {
  padding: 14px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}
</style>
