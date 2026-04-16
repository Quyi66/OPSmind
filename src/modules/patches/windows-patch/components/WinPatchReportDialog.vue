<template>
  <el-dialog
    v-model="visibleModel"
    title="导出 Windows 补丁报告"
    width="720px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="win-patch-dialog-body">
      <el-form label-width="110px">
        <el-form-item label="目标主机">
          <AcmDeviceSelector
            v-model="selection"
            ci-types="windows"
            :options="selectorOptions"
          />
          <div class="win-patch-form-hint">不选择主机时，将导出全部 Windows 主机的补丁数据。</div>
        </el-form-item>
        <el-form-item label="严重级别">
          <el-select v-model="form.severity" clearable placeholder="全部" style="width: 240px">
            <el-option
              v-for="item in WIN_PATCH_SEVERITY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="补丁状态">
          <el-select v-model="form.patchStatus" clearable placeholder="全部" style="width: 240px">
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
        <div class="win-patch-export-preview__title">本次导出范围</div>
        <div class="win-patch-export-preview__line">主机范围：{{ hostScopeLabel }}</div>
        <div class="win-patch-export-preview__line">严重级别：{{ severityDisplayLabel }}</div>
        <div class="win-patch-export-preview__line">补丁状态：{{ patchStatusDisplayLabel }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleReset">重置</el-button>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="exporting" @click="handleExport">导出 Excel</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { winPatchApi } from '../api'
import { WIN_PATCH_SEVERITY_OPTIONS, WIN_PATCH_STATUS_OPTIONS } from '../constants'
import {
  buildSelectorHostItems,
  downloadBlobResponse,
  extractHostIds,
  getPatchStatusLabel,
  getSeverityLabel
} from '../utils'

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
  label: '选择 Windows 主机'
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
const hostScopeLabel = computed(() => (hostIds.value.length ? `${hostIds.value.length} 台主机` : '全部主机'))
const severityDisplayLabel = computed(() => (form.severity ? getSeverityLabel(form.severity) : '全部'))
const patchStatusDisplayLabel = computed(() =>
  form.patchStatus ? getPatchStatusLabel(form.patchStatus) : '全部'
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
    ElMessage.success('导出任务已完成')
    visibleModel.value = false
  } catch (error) {
    console.error('导出 Windows 补丁报表失败:', error)
    ElMessage.error('导出 Windows 补丁报表失败')
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
