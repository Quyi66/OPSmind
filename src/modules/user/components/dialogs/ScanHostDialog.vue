<template>
  <el-dialog
    v-model="visible"
    title="扫描主机"
    width="900px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="scan-host-dialog">
      <!-- 设备选择器 -->
      <div class="section">
        <div class="section__title">
          <i class="fa fa-server"></i>
          选择主机
        </div>
        <div class="section__content">
          <AcmDeviceSelector
            v-model="selectedHosts"
            ci-types="linux"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择设备'
            }"
          />
        </div>
      </div>

      <!-- 扫描说明 -->
      <div class="section">
        <div class="section__title">
          <i class="fa fa-info-circle"></i>
          说明
        </div>
        <div class="section__content scan-info">
          <p>扫描主机将收集以下信息：</p>
          <ul>
            <li>系统用户列表及属性</li>
            <li>用户组信息</li>
            <li>用户home目录大小</li>
            <li>sudo权限配置</li>
            <li>定时任务(crontab)</li>
          </ul>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="executing"
          :disabled="!selectedHosts.length"
          @click="handleExecute"
        >
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling, stopPolling } = useJobPolling()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const selectedHosts = ref([])
const executing = ref(false)
const currentStatus = ref('')

// 状态中文映射
const STATUS_MAP = {
  WAITING: '等待中',
  RUNNING: '扫描中',
  COMPLETED: '已完成',
  SUCCESS: '已完成',
  FAILED: '失败',
  ERROR: '错误'
}

// 按钮文字
const buttonText = computed(() => {
  if (executing.value && currentStatus.value) {
    return STATUS_MAP[currentStatus.value] || currentStatus.value
  }
  return '开始扫描'
})

// 执行扫描
async function handleExecute() {
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择要扫描的主机')
    return
  }

  executing.value = true
  currentStatus.value = ''

  try {
    // 构造主机参数
    const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(
      `/workflow/api/workflow/jobs/hTzJfM/run?cacheBuster=${cacheBuster}`,
      {
        params: { hosts }
      }
    )

    const result = Array.isArray(data) ? data[0] : data
    currentStatus.value = result?.status || ''

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 120,
        showMessage: false,
        onProgress: res => {
          const batchInfo = res?.detail?.batches?.[0]
          currentStatus.value = batchInfo?.status || res.status || currentStatus.value
        },
        onSuccess: () => {
          executing.value = false
          currentStatus.value = ''
          ElMessage.success('扫描完成')
          emit('success')
          handleClose()
        },
        onError: res => {
          executing.value = false
          currentStatus.value = ''
          ElMessage.error(res?.error || '扫描失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          executing.value = false
          currentStatus.value = ''
          ElMessage.warning('扫描超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      executing.value = false
      currentStatus.value = ''
      ElMessage.success('扫描完成')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      executing.value = false
      currentStatus.value = ''
      ElMessage.error(result?.error || '扫描失败')
    } else {
      executing.value = false
      currentStatus.value = ''
      ElMessage.success('扫描任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    executing.value = false
    currentStatus.value = ''
    console.error('执行扫描失败:', error)
    ElMessage.error(`执行失败: ${error?.message || '未知错误'}`)
  }
}

// 关闭对话框
function handleClose() {
  stopPolling()
  visible.value = false
  selectedHosts.value = []
  executing.value = false
  currentStatus.value = ''
}
</script>

<style scoped lang="scss">
.scan-host-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;

    i {
      color: var(--el-color-primary);
    }
  }

  &__content {
    padding-left: 20px;
  }
}

.scan-info {
  font-size: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-color-primary-light-9);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--el-color-primary-light-8);

  p {
    margin: 0 0 8px 0;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      margin: 4px 0;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
