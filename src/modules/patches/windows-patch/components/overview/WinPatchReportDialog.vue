<template>
  <el-dialog
    v-model="visibleModel"
    :title="t('patches.windows.exportReport')"
    width="720px"
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="win-patch-dialog-body">
      <el-form label-width="110px">
        <el-form-item :label="t('execution.ui.targetHost')">
          <AcmDeviceSelector v-model="selection" ci-types="windows" :options="selectorOptions" />
          <div class="win-patch-form-hint">{{ t('patches.windows.allHostsReportHint') }}</div>
        </el-form-item>
        <el-form-item :label="t('patches.catalog.severity')">
          <el-select v-model="form.severity" clearable :placeholder="t('common.all')" style="width: 240px">
            <el-option
              v-for="item in WIN_PATCH_SEVERITY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('patches.linux.patchStatus')">
          <el-select v-model="form.patchStatus" clearable :placeholder="t('common.all')" style="width: 240px">
            <el-option
              v-for="item in WIN_PATCH_STATUS_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <div class="win-patch-export-preview">
        <div class="win-patch-export-preview__title">{{ t('patches.windows.exportScope') }}</div>
        <div class="win-patch-export-preview__line">{{ t('patches.windows.hostScopeLabel') }}{{ hostScopeLabel }}</div>
        <div class="win-patch-export-preview__line">{{ t('patches.windows.severityLabel') }}{{ severityDisplayLabel }}</div>
        <div class="win-patch-export-preview__line">{{ t('patches.windows.patchStatusLabel') }}{{ patchStatusDisplayLabel }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleReset">{{ t('common.reset') }}</el-button>
      <el-button @click="visibleModel = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="exporting" @click="handleExport">{{ t('patches.windows.exportExcel') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { winPatchApi } from '../../api'
import { WIN_PATCH_SEVERITY_OPTIONS, WIN_PATCH_STATUS_OPTIONS } from '../../constants'
import {
  buildSelectorHostItems,
  downloadBlobResponse,
  extractHostIds,
  getPatchStatusLabel,
  getSeverityLabel
} from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  preselectedHosts: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  get label() { return t('patches.windows.selectWindowsHosts') }
}

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const exporting = ref(false)
const selection = ref([])
const form = reactive({
  severity: '',
  patchStatus: ''
})

const hostIds = computed(() => extractHostIds(selection.value))
const hostScopeLabel = computed(() =>
  hostIds.value.length ? t('patches.windows.hostCount', { p0: hostIds.value.length }) : t('execution.ui.allHosts')
)
const severityDisplayLabel = computed(() =>
  form.severity ? getSeverityLabel(form.severity) : t('common.all')
)
const patchStatusDisplayLabel = computed(() =>
  form.patchStatus ? getPatchStatusLabel(form.patchStatus) : t('common.all')
)

function handleReset() {
  selection.value = buildSelectorHostItems(props.preselectedHosts)
  form.severity = ''
  form.patchStatus = ''
}

async function handleExport() {
  exporting.value = true
  try {
    const payload = {
      severity: form.severity || undefined,
      patchStatus: form.patchStatus || undefined
    }

    if (hostIds.value.length) {
      payload.hostIds = hostIds.value
    }

    const response = await winPatchApi.exportReport(payload)
    downloadBlobResponse(response)
    ElMessage.success(t('patches.windows.exportCompleted'))
    visibleModel.value = false
  } catch (error) {
    console.error('导出 Windows 补丁报表失败:', error)
    ElMessage.error(t('patches.windows.exportFailed'))
  } finally {
    exporting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      handleReset()
    }
  }
)
</script>

<style scoped lang="scss">
.win-patch-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-form-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.win-patch-export-preview {
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.win-patch-export-preview__title {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.win-patch-export-preview__line {
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}
</style>
