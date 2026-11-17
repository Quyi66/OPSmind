<template>
  <el-dialog v-model="visible" :title="t('patches.changeControl.title')" width="min(900px, 95vw)"
    append-to-body :close-on-click-modal="false" :show-close="!saving" :close-on-press-escape="!saving">
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-form v-loading="loading" label-position="top" :disabled="saving">
      <template v-if="draft">
        <div class="change-control-flags">
          <el-form-item :label="t('patches.changeControl.enable')">
            <el-switch v-model="draft.windowEnabled" />
          </el-form-item>
          <el-form-item :label="t('patches.changeControl.requireApproval')">
            <el-switch v-model="draft.approvalRequired" />
          </el-form-item>
          <el-form-item :label="t('patches.changeControl.timezone')">
            <el-input v-model="draft.timezone" placeholder="Asia/Shanghai" />
          </el-form-item>
          <el-form-item :label="t('patches.changeControl.offHoursPolicy')">
            <el-select v-model="draft.offHoursPolicy" style="width: 180px">
              <el-option v-for="policy in policies" :key="policy" :value="policy"
                :label="t(`patches.changeControl.policies.${policy}`)" />
            </el-select>
          </el-form-item>
        </div>

        <fieldset class="change-control-period">
          <legend>{{ t('patches.changeControl.workHours') }}</legend>
          <el-checkbox-group v-model="draft.workHours.days">
            <el-checkbox v-for="day in days" :key="day" :value="day">{{ dayLabel(day) }}</el-checkbox>
          </el-checkbox-group>
          <div class="change-control-times">
            <el-input v-model="draft.workHours.start" :aria-label="t('patches.changeControl.start')" placeholder="09:00" />
            <el-input v-model="draft.workHours.end" :aria-label="t('patches.changeControl.end')" placeholder="18:00" />
          </div>
        </fieldset>

        <fieldset v-for="(window, index) in draft.windows" :key="index" class="change-control-period">
          <legend>{{ t('patches.changeControl.window') }} {{ index + 1 }}</legend>
          <div class="change-control-flags">
            <el-select v-model="window.type" :aria-label="t('automation.job.type')" style="width: 180px">
              <el-option v-for="type in ['WEEKLY', 'DATE_RANGE']" :key="type" :value="type"
                :label="t(`patches.changeControl.types.${type}`)" />
            </el-select>
            <el-button type="danger" text @click="draft.windows.splice(index, 1)">{{ t('common.delete') }}</el-button>
          </div>
          <template v-if="window.type === 'WEEKLY'">
            <el-checkbox-group v-model="window.days">
              <el-checkbox v-for="day in days" :key="day" :value="day">{{ dayLabel(day) }}</el-checkbox>
            </el-checkbox-group>
            <div class="change-control-times">
              <el-input v-model="window.start" :aria-label="t('patches.changeControl.start')" placeholder="22:00" />
              <el-input v-model="window.end" :aria-label="t('patches.changeControl.end')" placeholder="06:00" />
            </div>
          </template>
          <div v-else class="change-control-flags">
            <el-date-picker v-model="window.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm"
              :placeholder="t('patches.changeControl.start')" />
            <el-date-picker v-model="window.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm"
              :placeholder="t('patches.changeControl.end')" />
          </div>
        </fieldset>
        <el-button @click="draft.windows.push(newWindow())">{{ t('patches.changeControl.addWindow') }}</el-button>
        <p>{{ t('patches.changeControl.weeklyHint') }}</p>
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
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { currentLocale, t } from '@/core/i18n'
import { patchChangeControlApi } from '../../api'
import { apiErrorText } from '../../utils/changeControl'

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({ isAdmin: Boolean })
const loading = ref(false)
const saving = ref(false)
const draft = ref(null)
const error = ref('')
const policies = ['ALLOW', 'CONFIRM', 'REJECT']
const days = [1, 2, 3, 4, 5, 6, 7]
let version = 0

const newWindow = () => ({
  type: 'WEEKLY', days: [6, 7], start: '00:00', end: '24:00', startTime: '', endTime: ''
})
const dayLabel = day => new Intl.DateTimeFormat(currentLocale.value, { weekday: 'short', timeZone: 'UTC' })
  .format(Date.UTC(2026, 0, day + 4))

async function load() {
  if (!visible.value || !props.isAdmin) return
  const token = ++version
  loading.value = true
  error.value = ''
  try {
    const { data } = await patchChangeControlApi.getConfig()
    if (token !== version) return
    draft.value = {
      windowEnabled: data.windowEnabled ?? false,
      timezone: data.timezone || 'Asia/Shanghai',
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
.change-control-flags { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.change-control-times { display: flex; flex-wrap: wrap; gap: 12px; }
.change-control-times .el-input { width: 120px; }
.change-control-period { margin-bottom: 12px; padding: 10px; border: 1px solid var(--el-border-color); }
</style>
