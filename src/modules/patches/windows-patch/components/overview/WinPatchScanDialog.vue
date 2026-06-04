<template>
  <el-dialog
    v-model="visibleModel"
    title="创建扫描任务"
    width="760px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="win-patch-dialog-body">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="目标机本地采集已装 KB 与系统 build（不依赖 WSUS / 联网），完成后由回调落库并自动刷新主机列表。"
      />
      <el-form label-width="110px">
        <el-form-item label="选择主机" required>
          <AcmDeviceSelector v-model="selection" ci-types="windows" :options="selectorOptions" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="submitting" @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="hostIds.length === 0"
        @click="handleSubmit"
      >
        {{ submitButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'
import { winPatchApi } from '../../api'
import { buildSelectorHostItems, extractHostIds, unwrapResponse } from '../../utils'

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

const { startPolling, stopPolling } = useJobPolling()

const submitting = ref(false)
const selection = ref([])

const hostIds = computed(() => extractHostIds(selection.value))

const submitButtonText = computed(() => (submitting.value ? '扫描中…' : '提交扫描任务'))

function resetForm() {
  selection.value = buildSelectorHostItems(props.preselectedHosts)
}

function resolveScanErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?._status ||
    error?.message ||
    '提交扫描任务失败'
  )
}

function finishScan(scanResult, { message, type = 'success' } = {}) {
  submitting.value = false
  if (message) {
    ElMessage[type](message)
  }
  visibleModel.value = false
  // 扫描为异步本地采集，结果经 runId 轮询确认后，触发主机列表刷新（无任务 id，不打开任务详情）
  emit('submitted', { ...(scanResult || {}), refreshOverview: true })
}

async function handleSubmit() {
  if (!hostIds.value.length) {
    ElMessage.warning('请先选择至少一台主机')
    return
  }

  submitting.value = true
  try {
    const response = await winPatchApi.createScanTask(hostIds.value)
    const scanResult = unwrapResponse(response)
    const runId = scanResult?.runId || scanResult?.run_id

    if (!runId) {
      // 没有 runId 时退回到「已提交」语义，直接刷新列表
      finishScan(scanResult, { message: '扫描任务已提交，完成后将自动刷新主机列表' })
      return
    }

    ElMessage.success('扫描任务已提交，正在采集补丁信息…')

    // 根据 runId 轮询作业结果，完成后刷新主机列表
    startPolling(runId, {
      interval: 5000,
      maxAttempts: 120,
      showMessage: false,
      onSuccess: () => finishScan(scanResult, { message: '扫描完成，主机列表已刷新' }),
      onError: res =>
        finishScan(scanResult, {
          message: res?.error || '扫描执行失败，请稍后查看结果',
          type: 'error'
        }),
      onTimeout: () =>
        finishScan(scanResult, { message: '扫描超时，请稍后查看结果', type: 'warning' })
    })
  } catch (error) {
    submitting.value = false
    console.error('提交扫描任务失败:', error)
    ElMessage.error(resolveScanErrorMessage(error))
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      resetForm()
    } else {
      stopPolling()
      submitting.value = false
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
</style>
