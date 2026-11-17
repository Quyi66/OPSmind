<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('patches.cve.affectedHostsTitle', { cve: cveId || t('patches.cve.middlewareCve') })"
    width="1200px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <div class="ops-action-bar">
        <span>{{ t('patches.cve.middlewareColon') }}{{ middlewareType || t('common.all') }}</span>
        <span>{{ t('patches.cve.affectedRecordCount', { count: hosts.length }) }}</span>
        <span class="action-spacer" />
        <el-button size="small" :loading="loading" @click="load">{{ t('common.refresh') }}</el-button>
      </div>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
      <el-table v-else :data="hosts" max-height="480" size="small" :empty-text="t('patches.cve.noAffectedHosts')">
        <el-table-column prop="hostKey" :label="t('execution.ui.host')" min-width="150">
          <template #default="{ row }">{{ row.hostKey || '-' }}</template>
        </el-table-column>
        <el-table-column prop="middlewareType" :label="t('patches.cve.middleware')" min-width="100" />
        <el-table-column prop="pkgName" :label="t('patches.linux.package')" min-width="120" show-overflow-tooltip />
        <el-table-column
          prop="installedVersion"
          :label="t('patches.cve.installedVersion')"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="installedPkg"
          :label="t('patches.cve.installedPackages')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="affectedRange"
          :label="t('patches.cve.affectedRange')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="fixedVersion" :label="t('patches.cve.fixedVersion')" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.fixedVersion || '-' }}</template>
        </el-table-column>
        <el-table-column prop="osScanStatus" :label="t('patches.cve.osScanStatus')" :min-width="currentLocale === 'en-US' ? 184 : 150">
          <template #default="{ row }">{{ row.osScanStatus ?? '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { onBeforeUnmount, ref, watch } from 'vue'
import { middlewareCveApi } from '../../api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cveId: { type: String, default: '' },
  middlewareType: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)
const hosts = ref([])
const errorMessage = messageRef('')
let requestId = 0

async function load() {
  const id = ++requestId
  hosts.value = []
  errorMessage.value = ''
  if (!props.cveId) {
    errorMessage.value = message('patches.cve.missingCve')
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await middlewareCveApi.getAffectedHosts(props.cveId, props.middlewareType)
    if (id !== requestId) return
    const data = response?.data ?? response
    hosts.value = Array.isArray(data) ? data : []
  } catch {
    if (id !== requestId) return
    errorMessage.value = message('patches.cve.affectedHostsFailed')
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch(
  () => [props.modelValue, props.cveId, props.middlewareType],
  ([visible]) => {
    requestId += 1
    loading.value = false
    hosts.value = []
    errorMessage.value = ''
    if (visible) load()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  requestId += 1
})
</script>

<style scoped>
.action-spacer {
  flex: 1;
}
</style>
