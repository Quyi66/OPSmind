<template>
  <el-dialog
    v-model="visible"
    title="删除用户"
    width="520px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="delete-user-dialog">
      <div class="user-info">
        <p>
          <strong>IP：</strong>
          {{ userData.host_key || '-' }}
        </p>
        <p>
          <strong>Hostname：</strong>
          {{ userData.hostname || '-' }}
        </p>
      </div>

      <el-form :model="formData" label-width="120px">
        <el-form-item label="用户名">
          <el-input v-model="formData.username" disabled />
        </el-form-item>

        <el-form-item label="是否删除主目录">
          <el-radio-group v-model="formData.user_remove_home">
            <el-radio value="yes">是</el-radio>
            <el-radio value="no">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-alert
        title="删除用户后不可恢复，请确认用户名和主机信息无误后再执行。"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">
          {{ getSubmitButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import { useJobPolling } from '@/composables/useJobPolling'

const DELETE_USER_JOB_ID = '5XLCC1'

const STATUS_MAP = {
  WAITING: '等待中',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  SUCCESS: '已完成',
  FAILED: '失败',
  ERROR: '错误'
}

const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  user: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const submitting = ref(false)
const currentStatus = ref('')
const userData = ref({})
const formData = reactive({
  username: '',
  user_remove_home: 'yes'
})

watch(
  () => props.user,
  newUser => {
    userData.value = newUser && Object.keys(newUser).length > 0 ? { ...newUser } : {}
    formData.username = newUser?.username || ''
  },
  { immediate: true }
)

watch(
  () => props.visible,
  val => {
    if (val) {
      formData.username = props.user?.username || ''
      formData.user_remove_home = 'yes'
    }
  }
)

function getSubmitButtonText() {
  if (submitting.value && currentStatus.value) {
    return STATUS_MAP[currentStatus.value] || currentStatus.value
  }

  return submitting.value ? '提交中...' : '删除用户'
}

async function handleSubmit() {
  const hostId = userData.value.host_id || userData.value.id
  if (!hostId || !formData.username) {
    ElMessage.warning('缺少用户信息，无法执行删除')
    return
  }

  submitting.value = true
  currentStatus.value = ''

  try {
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/${DELETE_USER_JOB_ID}/run?cacheBuster=${cacheBuster}`,
      {
        params: {
          user_name: formData.username,
          hosts: hostId,
          user_remove_home: formData.user_remove_home
        }
      }
    )

    const result = Array.isArray(data) ? data[0] : data
    currentStatus.value = result?.status || ''
    ElMessage.success('删除任务已提交，后台正在执行，可关闭此窗口')

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
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
          ElMessage.success('删除成功')
          emit('success')
          handleClose()
        },
        onError: res => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.error(res?.error || '删除失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          submitting.value = false
          currentStatus.value = ''
          ElMessage.warning('删除超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
      return
    }

    submitting.value = false
    currentStatus.value = ''

    if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      ElMessage.success('删除成功')
      emit('success')
      handleClose()
      return
    }

    if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      ElMessage.error(result?.error || '删除失败')
      emit('success')
      handleClose()
      return
    }

    ElMessage.success('删除任务已提交')
  } catch (error) {
    submitting.value = false
    currentStatus.value = ''
    console.error('删除用户失败:', error)
    ElMessage.error(`删除用户失败: ${error?.message || '未知错误'}`)
  }
}

function handleClose() {
  stopPolling()
  visible.value = false
  submitting.value = false
  currentStatus.value = ''
  formData.user_remove_home = 'yes'
}
</script>

<style scoped lang="scss">
.delete-user-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-info {
  background: var(--el-color-danger-light-9);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--el-color-danger-light-7);

  p {
    margin: 4px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
