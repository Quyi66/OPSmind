<template>
  <el-dialog v-model="visible" :title="t('patches.changeControl.inspection')" width="min(960px, 95vw)"
    append-to-body destroy-on-close>
    <div v-loading="loading">
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-alert v-else-if="data?.reason" :title="data.reason" type="info" :closable="false" show-icon />
      <template v-if="data">
        <p v-if="data.presetByApprover">{{ t('patches.changeControl.approverPreset') }}</p>
        <el-select v-model="selectedHosts" multiple filterable :disabled="running || submitting"
          :placeholder="t('patches.changeControl.inspectionHosts')" style="width: 100%">
          <el-option v-for="host in hosts" :key="host.value" :label="host.label" :value="host.value" />
        </el-select>
        <el-input v-if="isAdmin" v-model="additionalHosts" :disabled="running || submitting"
          :placeholder="t('patches.changeControl.extraHosts')" class="inspection-extra-hosts" />
        <p v-if="data.inspectionStatus">
          {{ t('common.status') }} · {{ runStatus(data.inspectionStatus) }}
          <span v-if="data.lastRun?.hostTotal != null">
            · {{ data.lastRun.hostChecked ?? 0 }} / {{ data.lastRun.hostTotal }}
          </span>
        </p>
        <p v-if="data.lastRun?.message">{{ data.lastRun.message }}</p>
        <p v-if="data.inspectionBy || data.inspectionTime">
          {{ [data.inspectionBy, data.inspectionTime].filter(Boolean).join(' · ') }}
        </p>
        <div v-if="data.lastRun?.counts" class="inspection-counts">
          <el-tag v-for="(count, status) in data.lastRun.counts" :key="status" effect="plain">
            {{ healthText('status', status) }} · {{ count }}
          </el-tag>
        </div>
        <el-table v-if="data.lastRun" :data="data.lastRun.hosts || []" max-height="480">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="inspection-result">
                <ul v-if="row.risks?.length">
                  <li v-for="(risk, index) in row.risks" :key="index">{{ risk }}</li>
                </ul>
                <el-table :data="row.items || []" size="small">
                  <el-table-column :label="t('inspection.report.checkItem')" min-width="170">
                    <template #default="{ row: item }">{{ itemLabel(item) }}</template>
                  </el-table-column>
                  <el-table-column prop="value" :label="t('patches.changeControl.value')" min-width="140" />
                  <el-table-column :label="t('patches.changeControl.level')" width="145">
                    <template #default="{ row: item }">{{ healthText('level', item.level) }}</template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="hostIp" :label="t('execution.ui.host')" min-width="150">
            <template #default="{ row }">{{ row.hostIp || row.hostId }}</template>
          </el-table-column>
          <el-table-column prop="hostname" :label="t('common.name')" min-width="145" />
          <el-table-column prop="score" :label="t('patches.changeControl.score')" width="90" />
          <el-table-column :label="t('common.status')" min-width="150">
            <template #default="{ row }">{{ healthText('status', row.status) }}</template>
          </el-table-column>
        </el-table>
      </template>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.close') }}</el-button>
      <el-button v-if="error && !running" :disabled="loading || submitting" @click="load()">{{ t('common.retry') }}</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!canStart" @click="execute">
        {{ t('patches.changeControl.startInspection') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { currentLocale, t } from '@/core/i18n'
import { patchInstallApi } from '../../api'
import { apiErrorText } from '../../utils/changeControl'
import { secopsText, useSecopsMessages } from '../../utils/secopsMessages'

const props = defineProps({ taskId: [String, Number], isAdmin: Boolean })
const visible = defineModel({ type: Boolean, default: false })
const loading = ref(false)
const submitting = ref(false)
const data = ref(null)
const error = ref('')
const selectedHosts = ref([])
const additionalHosts = ref('')
let timer
let version = 0

useSecopsMessages()

const hostValue = host => host?.hostId || host?.hostIp
const hosts = computed(() => [...new Map(
  [...(data.value?.taskHosts || []), ...(data.value?.defaultHosts || [])]
    .filter(hostValue)
    .map(host => [hostValue(host), { value: hostValue(host), label: host.hostIp || host.hostId }])
).values()])
const running = computed(() => data.value?.inspectionStatus === 'RUNNING')
const targets = computed(() => [...new Set([
  ...selectedHosts.value,
  ...(props.isAdmin ? additionalHosts.value.split(/[\s,，]+/).filter(Boolean) : [])
])])
const canStart = computed(() => data.value?.inspectable && !running.value &&
  !loading.value && !submitting.value && !error.value && targets.value.length > 0)

function runStatus(status) {
  const fallback = {
    RUNNING: t('patches.linux.running'),
    COMPLETED: t('automation.workbench.completed'),
    FAILED: t('execution.taskStatus.failed')
  }
  return secopsText(`secops.status.${status}`, fallback[status] || status)
}

function healthText(group, value) {
  return secopsText(`secops.health.${group}.${value}`, t(`patches.changeControl.health.${value}`, {}, value || '-'))
}

function itemLabel(item) {
  return currentLocale.value === 'en-US' && item.code
    ? secopsText(`secops.health.item.${item.code}`, item.name || item.code)
    : item.name || item.code || '-'
}

function schedulePoll() {
  clearTimeout(timer)
  if (visible.value && running.value) timer = setTimeout(() => load(true), 7000)
}

async function load(silent = false) {
  if (!visible.value || !props.taskId || loading.value || submitting.value) return
  const token = version
  loading.value = !silent
  error.value = ''
  try {
    const response = await patchInstallApi.getInspection(props.taskId)
    if (token !== version) return
    if (!data.value) selectedHosts.value = (response.data?.defaultHosts || []).map(hostValue).filter(Boolean)
    data.value = response.data
  } catch (failure) {
    if (token === version) error.value = apiErrorText(failure, t('patches.changeControl.inspectionLoadFailed'))
  } finally {
    if (token === version) {
      loading.value = false
      schedulePoll()
    }
  }
}

async function execute() {
  if (!canStart.value) return
  const token = version
  submitting.value = true
  try {
    const response = await patchInstallApi.executeInspection(props.taskId, targets.value)
    if (token === version) data.value = response.data
  } catch (failure) {
    if (token === version) error.value = apiErrorText(failure, t('patches.changeControl.inspectionFailed'))
  } finally {
    if (token === version) {
      submitting.value = false
      schedulePoll()
    }
  }
}

function reset() {
  version += 1
  clearTimeout(timer)
  loading.value = false
  submitting.value = false
  data.value = null
  error.value = ''
  selectedHosts.value = []
  additionalHosts.value = ''
}

watch([visible, () => props.taskId], () => {
  reset()
  load()
}, { immediate: true })
onUnmounted(reset)
</script>

<style scoped>
.inspection-extra-hosts { margin-top: 10px; }
.inspection-counts { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.inspection-result { padding: 12px 20px; overflow-wrap: anywhere; }
</style>
