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
          <i class="fa fa-server"></i> 选择主机
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
          <i class="fa fa-info-circle"></i> 说明
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
          {{ executing ? '执行中...' : '开始扫描' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
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
  set: (val) => emit('update:visible', val)
})

const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const executing = ref(false)

// 处理设备选择确认
function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

// 移除主机
function removeHost(index) {
  selectedHosts.value.splice(index, 1)
}

// 执行扫描
async function handleExecute() {
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择要扫描的主机')
    return
  }

  // 显示加载状态
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在扫描主机...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  executing.value = true
  try {
    // 构造主机参数
    const hosts = selectedHosts.value.map(h => ({
      key: h.key || h.id,
      value: h.value || h.ip || h.host_key,
      assetType: h.assetType || h.ciType || 'linux'
    }))

    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(`/jao/api/jao/jobs/hTzJfM/run?cacheBuster=${cacheBuster}`, {
      params: { hosts }
    })

    const result = Array.isArray(data) ? data[0] : data
    console.log('扫描作业启动结果:', result)

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      // 使用 composable 开始轮询
      startPolling(result.runId, {
        interval: 5000,
        maxAttempts: 120,
        successMessage: '扫描完成',
        errorMessage: '扫描失败',
        timeoutMessage: '扫描超时，请稍后查看结果',
        showMessage: false,
        onProgress: (res) => {
          const batchInfo = res?.detail?.batches?.[0]
          if (batchInfo) {
            loadingInstance.setText(`正在扫描主机... (状态: ${batchInfo.status || res.status})`)
          }
        },
        onSuccess: () => {
          loadingInstance.close()
          ElMessage.success('扫描完成')
          emit('success')
          handleClose()
        },
        onError: (res) => {
          loadingInstance.close()
          ElMessage.error(res?.error || '扫描失败')
          emit('success')
          handleClose()
        },
        onTimeout: () => {
          loadingInstance.close()
          ElMessage.warning('扫描超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      })
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      loadingInstance.close()
      ElMessage.success('扫描完成')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      loadingInstance.close()
      ElMessage.error(result?.error || '扫描失败')
    } else {
      loadingInstance.close()
      ElMessage.success('扫描任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    loadingInstance?.close()
    console.error('执行扫描失败:', error)
    ElMessage.error('执行失败: ' + (error?.message || '未知错误'))
  } finally {
    executing.value = false
  }
}

// 关闭对话框
function handleClose() {
  stopPolling()
  visible.value = false
  selectedHosts.value = []
  executing.value = false
}

// composable 会自动在 onUnmounted 时停止轮询
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
    color: #1e293b;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;

    i {
      color: #3b82f6;
    }
  }

  &__content {
    padding-left: 20px;
  }
}

.host-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.host-count {
  font-size: 13px;
  color: #64748b;

  strong {
    color: #3b82f6;
  }
}

.selected-hosts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.empty-tip {
  color: #94a3b8;
  font-size: 13px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e1;
  text-align: center;

  i {
    margin-right: 6px;
  }
}

.scan-info {
  font-size: 13px;
  color: #475569;
  background: #f0f9ff;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #bae6fd;

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
