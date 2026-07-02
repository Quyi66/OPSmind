<template>
  <el-dialog
    v-model="visible"
    title="创建用户组"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
      <!-- 选择主机 -->
      <el-form-item label="选择主机" required>
        <AcmDeviceSelector
          v-model="selectedHosts"
          ci-types="linux"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择设备'
          }"
        />
      </el-form-item>

      <!-- 组名 -->
      <el-form-item label="组名" prop="group_name" required>
        <el-input v-model="formData.group_name" placeholder="输入用户组名称" maxlength="32" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const formRef = ref(null)
const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const submitting = ref(false)
const currentStatus = ref('')

// 状态中文映射
const STATUS_MAP = {
  WAITING: '等待中',
  RUNNING: '创建中',
  COMPLETED: '已完成',
  SUCCESS: '已完成',
  FAILED: '失败',
  ERROR: '错误'
}

// 按钮文字
const buttonText = computed(() => {
  if (submitting.value && currentStatus.value) {
    return STATUS_MAP[currentStatus.value] || currentStatus.value
  }
  if (submitting.value) {
    return '提交中...'
  }
  return '确认'
})

const formData = reactive({
  group_name: ''
})

const formRules = {
  group_name: [{ required: true, message: '请输入组名', trigger: 'blur' }]
}

function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

function removeHost(index) {
  selectedHosts.value.splice(index, 1)
}

async function handleSubmit() {
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择主机')
    return
  }

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  currentStatus.value = ''

  try {
    // 构造主机参数（对象数组格式）
    const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/zrYK7K/run?cacheBuster=${cacheBuster}`,
      {
        params: {
          hosts,
          group_name: formData.group_name
        }
      }
    )

    const result = Array.isArray(data) ? data[0] : data
    currentStatus.value = result?.status || ''

    // 提交成功，提示用户可以关闭
    ElMessage.success('任务已提交，后台正在执行，可关闭此窗口')

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 60,
        showMessage: false,
        onProgress: res => {
          const batchInfo = res?.detail?.batches?.[0]
          currentStatus.value = batchInfo?.status || res.status || currentStatus.value
        },
        onSuccess: () => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.success('用户组创建成功')
          emit('success')
          handleClose()
        },
        onError: res => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.error(res?.error || '创建失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.warning('创建超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('用户组创建成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.error(result?.error || '创建失败')
      emit('success')
      handleClose()
    } else {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('用户组创建任务已提交')
    }
  } catch (error) {
    submitting.value = false
    currentStatus.value = ''
    console.error('创建用户组失败:', error)
    ElMessage.error(`创建失败: ${error?.message || '未知错误'}`)
  }
}

function handleClose() {
  stopPolling()
  visible.value = false
  submitting.value = false
  currentStatus.value = ''
  formRef.value?.resetFields()
  selectedHosts.value = []
  formData.group_name = ''
}
</script>

<style scoped lang="scss">
.host-selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.host-count {
  font-size: 13px;
  color: var(--el-text-color-regular);
  strong {
    color: var(--el-color-primary);
  }
}

.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
