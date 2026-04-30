<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    :title="dialogTitle"
    width="1350px"
    top="5vh"
    destroy-on-close
    :close-on-click-modal="false"
    class="host-severity-patch-dialog"
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
    <el-empty v-else description="当前主机缺少补丁查询条件，无法加载补丁列表" />
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
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PatchesTab from './PatchesTab.vue'
import PatchInstallWizard from '../patch-task/PatchInstallWizard.vue'

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
  Critical: '严重',
  Important: '重要',
  Moderate: '中等',
  Low: '低危'
}

const patchesTabRef = ref(null)
const installDialogVisible = ref(false)
const patchesToInstall = ref([])
const installSelectionSummary = ref([])

const resolvedHostId = computed(() =>
  props.host?.host_id || props.host?.hostId || props.host?.id || ''
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
  const hostLabel = resolvedHostKey.value || resolvedHostname.value || '当前主机'
  const severityLabel = severityLabelMap[props.severity] || '可用补丁'
  return `${hostLabel} · ${severityLabel}补丁列表`
})
const patchesTabKey = computed(() =>
  [resolvedHostId.value, resolvedHostKey.value, props.severity].filter(Boolean).join('-') || 'host-severity-patches'
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
    ElMessage.warning('请选择要安装的补丁')
    return
  }

  if (!resolvedHostId.value) {
    ElMessage.warning('当前主机缺少 hostId，无法安装选中的补丁')
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
