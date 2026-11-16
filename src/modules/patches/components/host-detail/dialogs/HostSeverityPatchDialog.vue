<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="dialogTitle"
    width="1350px"
    destroy-on-close
    :close-on-click-modal="!patchesTabRef?.hasPendingSelection"
    class="host-severity-patch-dialog"
    :close-on-press-escape="!patchesTabRef?.hasPendingSelection"
  >
    <template v-if="hasHostReference">
      <PatchesTab
        ref="patchesTabRef"
        :key="patchesTabKey"
        :host-id="resolvedHostId"
        :host-key="resolvedHostKey"
        :os-distro="resolvedOsDistro"
        :default-severities="dialogSeverities"
        @patch-click="handlePatchClick"
        @fix-patches="handleFixPatches"
      />
    </template>
    <el-empty v-else :description="t('patches.linux.hostPatchQueryMissing')" />
  </el-dialog>

  <PatchInstallWizard
    v-model:visible="installDialogVisible"
    :patches-to-install="patchesToInstall"
    :fixed-host="fixedHostInfo"
    operation-type="patch"
    :selection-summary-items="installSelectionSummary"
    @success="handleInstallSuccess"
  />
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PatchesTab from '../tabs/PatchesTab.vue'
import PatchInstallWizard from '../../patch-task/wizard/PatchInstallWizard.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  host: {
    type: Object,
    default: null
  },
  severity: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'patch-click', 'install-success'])

const severityLabelMap = {
  get Critical() { return t('patches.catalog.critical') },
  get Important() { return t('patches.catalog.important') },
  get Moderate() { return t('patches.catalog.moderate') },
  get Low() { return t('patches.catalog.low') }
}

const patchesTabRef = ref(null)
const installDialogVisible = ref(false)
const patchesToInstall = ref([])
const installSelectionSummary = ref([])

const resolvedHostId = computed(
  () => props.host?.host_id || props.host?.hostId || props.host?.id || ''
)
const resolvedHostKey = computed(() => props.host?.host_key || props.host?.hostKey || '')
const resolvedOsDistro = computed(() => props.host?.os_distro || props.host?.osDistro || '')
const resolvedOsVersion = computed(() => props.host?.os_version || props.host?.osVersion || '')
const resolvedHostname = computed(() => props.host?.hostname || '')
const hasHostReference = computed(() => Boolean(resolvedHostId.value || resolvedHostKey.value))
const dialogSeverities = computed(() =>
  props.severity ? [props.severity] : ['Critical', 'Important', 'Moderate', 'Low']
)
const dialogTitle = computed(() => {
  const hostLabel = resolvedHostKey.value || resolvedHostname.value || t('patches.linux.currentHost')
  const severityLabel = severityLabelMap[props.severity] || t('patches.linux.availablePatches')
  return t('patches.linux.hostSeverityTitle', { host: hostLabel, severity: severityLabel })
})
const patchesTabKey = computed(
  () =>
    [resolvedHostId.value, resolvedHostKey.value, props.severity].filter(Boolean).join('-') ||
    'host-severity-patches'
)
const fixedHostInfo = computed(() => {
  if (!hasHostReference.value) {
    return null
  }

  return {
    hostId: resolvedHostId.value,
    hostKey: resolvedHostKey.value,
    hostname: resolvedHostname.value,
    os_distro: resolvedOsDistro.value,
    os_version: resolvedOsVersion.value
  }
})

function handlePatchClick(row) {
  emit('patch-click', {
    ...row,
    os_distro: row?.os_distro || resolvedOsDistro.value
  })
}

function handleFixPatches(patches) {
  if (!patches || patches.length === 0) {
    ElMessage.warning(t('patches.linux.selectPatches'))
    return
  }

  if (!resolvedHostId.value) {
    ElMessage.warning(t('patches.linux.hostIdMissingInstall'))
    return
  }

  patchesToInstall.value = patches
  installSelectionSummary.value = patches.map(item => ({
    key: item.patch_id,
    primary: item.patch_id,
    secondary: item.patch_name || item.title || item.description || ''
  }))
  installDialogVisible.value = true
}

function handleInstallSuccess() {
  patchesTabRef.value?.loadPatchList?.()
  emit('install-success')
}
</script>

<style scoped lang="scss">
.host-severity-patch-dialog {
  :deep(.el-dialog__body) {
    padding-top: 12px;
  }
}
</style>
