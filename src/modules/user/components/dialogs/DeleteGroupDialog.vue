<template>
  <el-dialog
    v-model="visible"
    title="删除用户组"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="delete-group-dialog">
      <el-alert type="warning" :closable="false" show-icon class="mb-4">
        <template #title>警告：删除用户组操作不可逆，请谨慎操作！</template>
      </el-alert>

      <!-- 单个删除 -->
      <template v-if="groupData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="主机IP">{{ groupData.host_key }}</el-descriptions-item>
          <el-descriptions-item label="主机名">{{ groupData.hostname }}</el-descriptions-item>
          <el-descriptions-item label="组名">{{ groupData.group_name }}</el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 批量删除 -->
      <template v-else>
        <el-form label-width="100px">
          <el-form-item label="选择主机">
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

          <el-form-item label="组名" required>
            <el-input v-model="groupName" placeholder="输入要删除的用户组名称" maxlength="32" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">
          <!-- <i class="fa fa-minus-circle" v-if="!submitting"></i> -->
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: { type: Boolean, default: false },
  groupData: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const groupName = ref('')
const submitting = ref(false)
const currentStatus = ref('')

// 状态中文映射
const STATUS_MAP = {
  WAITING: '等待中',
  RUNNING: '删除中',
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

watch(
  () => props.groupData,
  val => {
    if (val) {
      groupName.value = val.group_name || ''
    }
  }
)

function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

function removeHost(index) {
  selectedHosts.value.splice(index, 1)
}

async function handleSubmit() {
  let hostId, gName

  if (props.groupData) {
    hostId = props.groupData.hostId || props.groupData.host_id
    gName = props.groupData.group_name
  } else {
    if (!selectedHosts.value.length) {
      ElMessage.warning('请先选择主机')
      return
    }
    if (!groupName.value) {
      ElMessage.warning('请输入组名')
      return
    }
    // 批量删除时，获取第一个主机的 ID（或者需要遍历处理）
    hostId = selectedHosts.value.map(h => h.key || h.id).join(',')
    gName = groupName.value
  }

  submitting.value = true
  currentStatus.value = ''

  try {
    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/jao/api/jao/jobs/J0PRi7/run?cacheBuster=${cacheBuster}`,
      {
        params: {
          group_name: gName,
          hosts: hostId
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
          ElMessage.success('用户组删除成功')
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
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('用户组删除成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.error(result?.error || '删除失败')
      emit('success')
      handleClose()
    } else {
      submitting.value = false
      currentStatus.value = ''
      ElMessage.success('用户组删除任务已提交')
    }
  } catch (error) {
    submitting.value = false
    currentStatus.value = ''
    console.error('删除用户组失败:', error)
    ElMessage.error(`删除失败: ${error?.message || '未知错误'}`)
  }
}

function handleClose() {
  stopPolling()
  visible.value = false
  submitting.value = false
  currentStatus.value = ''
  selectedHosts.value = []
  groupName.value = ''
}
</script>

<style scoped lang="scss">
.delete-group-dialog {
  .mb-4 {
    margin-bottom: 16px;
  }
}

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
