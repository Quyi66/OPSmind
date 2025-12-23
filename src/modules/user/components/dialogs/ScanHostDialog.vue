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
          <div class="host-selector">
            <el-button type="primary" size="small" @click="showDeviceSelector = true">
              <i class="fa fa-plus"></i> 选择设备
            </el-button>
            <span class="host-count" v-if="selectedHosts.length">
              已选择 <strong>{{ selectedHosts.length }}</strong> 台主机
            </span>
          </div>

          <!-- 已选主机预览 -->
          <div class="selected-hosts" v-if="selectedHosts.length">
            <el-tag
              v-for="(host, index) in selectedHosts"
              :key="host.key || index"
              closable
              size="small"
              @close="removeHost(index)"
            >
              {{ host.value || host.ip || host.host_key }}
            </el-tag>
          </div>
          <div class="empty-tip" v-else>
            <i class="fa fa-info-circle"></i> 请选择要扫描的主机
          </div>
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

    <!-- 设备选择器对话框 -->
    <AcmDeviceSelectorDialog
      v-model="showDeviceSelector"
      :ci-types="'linux'"
      :initial-selection="selectedHosts"
      @confirm="handleDeviceConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

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

// 轮询定时器
let pollingTimer = null

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
      // 开始轮询
      const runId = result.runId
      await pollScanResult(runId, loadingInstance)
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

// 轮询扫描结果
async function pollScanResult(runId, loadingInstance) {
  const maxAttempts = 120 // 最多轮询 10 分钟 (120 * 5秒)
  let attempts = 0

  const poll = async () => {
    attempts++
    try {
      const cacheBuster = Date.now()
      const { data: result } = await apiService.get(`/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`)
      console.log(`扫描轮询结果 (第${attempts}次):`, result)

      if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
        // 更新加载提示
        const batchInfo = result?.detail?.batches?.[0]
        if (batchInfo) {
          loadingInstance.setText(`正在扫描主机... (状态: ${batchInfo.status || result.status})`)
        }

        if (attempts < maxAttempts) {
          // 5秒后继续轮询
          pollingTimer = setTimeout(poll, 5000)
        } else {
          loadingInstance.close()
          ElMessage.warning('扫描超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
        loadingInstance.close()
        ElMessage.success('扫描完成')
        emit('success')
        handleClose()
      } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
        loadingInstance.close()
        ElMessage.error(result?.error || '扫描失败')
        emit('success') // 仍然触发刷新
        handleClose()
      } else {
        // 其他状态，继续轮询
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          loadingInstance.close()
          emit('success')
          handleClose()
        }
      }
    } catch (error) {
      console.error('扫描轮询失败:', error)
      if (attempts < maxAttempts) {
        // 出错后继续轮询
        pollingTimer = setTimeout(poll, 5000)
      } else {
        loadingInstance.close()
        ElMessage.error('扫描状态查询失败')
      }
    }
  }

  // 开始轮询
  pollingTimer = setTimeout(poll, 5000)
}

// 关闭对话框
function handleClose() {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
  visible.value = false
  selectedHosts.value = []
  executing.value = false
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
})
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
