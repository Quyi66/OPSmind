<template>
  <el-dialog
    v-model="visible"
    title="创建用户组"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
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
          {{ submitting ? '创建中...' : '创建用户组' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref(null)
const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const submitting = ref(false)

// 轮询定时器
let pollingTimer = null

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

  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在创建用户组...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  submitting.value = true
  try {
    // 构造主机参数（对象数组格式）
    const hosts = selectedHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip || h.host_key,
      assetType: h.assetType || h.ciType || 'linux'
    }))

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(`/jao/api/jao/jobs/zrYK7K/run?cacheBuster=${cacheBuster}`, {
      params: {
        hosts,
        group_name: formData.group_name
      }
    })

    const result = Array.isArray(data) ? data[0] : data

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 60,
        successMessage: '用户组创建成功',
        errorMessage: '创建失败',
        timeoutMessage: '创建超时，请稍后查看结果',
        showMessage: false, // 我们自己处理消息
        onSuccess: () => {
          loadingInstance.close()
          ElMessage.success('用户组创建成功')
          emit('success')
          handleClose()
        },
        onError: (res) => {
          loadingInstance.close()
          ElMessage.error(res?.error || '创建失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          loadingInstance.close()
          ElMessage.warning('创建超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      loadingInstance.close()
      ElMessage.success('用户组创建成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      loadingInstance.close()
      ElMessage.error(result?.error || '创建失败')
    } else {
      loadingInstance.close()
      ElMessage.success('用户组创建任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    loadingInstance?.close()
    console.error('创建用户组失败:', error)
    ElMessage.error('创建失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  stopPolling()
  visible.value = false
  formRef.value?.resetFields()
  selectedHosts.value = []
  formData.group_name = ''
}

// composable 会自动在 onUnmounted 时停止轮询
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
  color: #64748b;
  strong { color: #3b82f6; }
}

.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
