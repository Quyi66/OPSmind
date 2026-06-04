<template>
  <el-dialog
    v-model="visibleModel"
    title="创建扫描任务"
    width="760px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="win-patch-dialog-body">
      <el-form label-width="110px">
        <el-form-item label="选择主机" required>
          <AcmDeviceSelector v-model="selection" ci-types="windows" :options="selectorOptions" />
        </el-form-item>
        <el-form-item label="扫描模式">
          <el-select v-model="form.scanMode" style="width: 100%">
            <el-option
              v-for="item in WIN_PATCH_SCAN_MODE_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <div class="win-patch-form-hint">{{ currentScanModeDescription }}</div>
        </el-form-item>
        <el-form-item label="WSUS 配置">
          <el-select
            v-model="form.wsusConfigId"
            clearable
            placeholder="请选择 WSUS 配置"
            style="width: 100%"
            :disabled="form.scanMode === 'online'"
          >
            <el-option
              v-for="item in wsusConfigs"
              :key="resolveWsusConfigId(item)"
              :label="getWsusConfigLabel(item)"
              :value="resolveWsusConfigId(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="更新类别">
          <el-select
            v-model="form.categories"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            filterable
            placeholder="可按类别过滤"
            style="width: 100%"
          >
            <el-option
              v-for="item in WIN_PATCH_CATEGORY_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="hostIds.length === 0"
        @click="handleSubmit"
      >
        提交扫描任务
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { winPatchApi } from '../../api'
import { WIN_PATCH_CATEGORY_OPTIONS, WIN_PATCH_SCAN_MODE_OPTIONS } from '../../constants'
import {
  buildSelectorHostItems,
  extractHostIds,
  getWsusConfigLabel,
  resolveWsusConfigId,
  unwrapResponse
} from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  preselectedHosts: {
    type: Array,
    default: () => []
  },
  wsusConfigs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'multiple',
  label: '选择 Windows 主机'
}

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const submitting = ref(false)
const selection = ref([])
const form = reactive({
  scanMode: 'auto',
  wsusConfigId: '',
  categories: []
})

const hostIds = computed(() => extractHostIds(selection.value))

const currentScanModeDescription = computed(() => {
  const match = WIN_PATCH_SCAN_MODE_OPTIONS.find(item => item.value === form.scanMode)
  return match?.description || ''
})

function resetForm() {
  selection.value = buildSelectorHostItems(props.preselectedHosts)
  form.scanMode = 'auto'
  form.wsusConfigId = resolveWsusConfigId(props.wsusConfigs[0])
  form.categories = []
}

async function handleSubmit() {
  if (!hostIds.value.length) {
    ElMessage.warning('请先选择至少一台主机')
    return
  }

  if (form.scanMode === 'wsus' && !form.wsusConfigId) {
    ElMessage.warning('WSUS 模式下必须选择 WSUS 配置')
    return
  }

  submitting.value = true
  try {
    const payload = {
      hostIds: hostIds.value,
      scanMode: form.scanMode,
      rescanAfter: false
    }

    if (form.wsusConfigId) {
      payload.wsusConfigId = form.wsusConfigId
    }
    if (form.categories.length) {
      payload.categories = form.categories.join(',')
    }

    const response = await winPatchApi.createScanTask(payload)
    ElMessage.success('扫描任务已提交')
    visibleModel.value = false
    emit('submitted', unwrapResponse(response))
  } catch (error) {
    console.error('提交扫描任务失败:', error)
    ElMessage.error('提交扫描任务失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      resetForm()
    }
  }
)

watch(
  () => form.scanMode,
  value => {
    if (value === 'online') {
      form.wsusConfigId = ''
    } else if (!form.wsusConfigId) {
      form.wsusConfigId = resolveWsusConfigId(props.wsusConfigs[0])
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
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
