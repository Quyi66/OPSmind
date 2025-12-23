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
            <div class="host-selector-row">
              <el-button type="primary" plain size="small" @click="showDeviceSelector = true">
                <i class="fa fa-plus"></i> 选择设备
              </el-button>
              <span class="host-count" v-if="selectedHosts.length">
                已选择 <strong>{{ selectedHosts.length }}</strong> 台主机
              </span>
            </div>
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
          </el-form-item>

          <el-form-item label="组名" required>
            <el-input v-model="groupName" placeholder="输入要删除的用户组名称" />
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleSubmit">
          <i class="fa fa-minus-circle" v-if="!submitting"></i>
          {{ submitting ? '删除中...' : '确认删除' }}
        </el-button>
      </div>
    </template>

    <!-- 设备选择器 -->
    <AcmDeviceSelectorDialog
      v-model="showDeviceSelector"
      :ci-types="'linux'"
      :initial-selection="selectedHosts"
      @confirm="handleDeviceConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { apiService } from '@/core/api'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  groupData: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'success'])

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const showDeviceSelector = ref(false)
const selectedHosts = ref([])
const groupName = ref('')
const submitting = ref(false)

// 轮询定时器
let pollingTimer = null

watch(() => props.groupData, (val) => {
  if (val) {
    groupName.value = val.group_name || ''
  }
})

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

  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在删除用户组...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  submitting.value = true
  try {
    // 调用作业执行接口
    const cacheBuster = Date.now()
    const { data } = await apiService.post(`/jao/api/jao/jobs/J0PRi7/run?cacheBuster=${cacheBuster}`, {
      params: {
        group_name: gName,
        hosts: hostId
      }
    })

    const result = Array.isArray(data) ? data[0] : data
    console.log('删除用户组作业启动结果:', result)

    if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
      await pollResult(result.runId, loadingInstance)
    } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
      loadingInstance.close()
      ElMessage.success('用户组删除成功')
      emit('success')
      handleClose()
    } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
      loadingInstance.close()
      ElMessage.error(result?.error || '删除失败')
    } else {
      loadingInstance.close()
      ElMessage.success('用户组删除任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    loadingInstance?.close()
    console.error('删除用户组失败:', error)
    ElMessage.error('删除失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 轮询结果
async function pollResult(runId, loadingInstance) {
  const maxAttempts = 60
  let attempts = 0

  const poll = async () => {
    attempts++
    try {
      const cacheBuster = Date.now()
      const { data: result } = await apiService.get(`/jao/api/jao/runlogs/${runId}/result?cacheBuster=${cacheBuster}`)

      if (result?.status === 'WAITING' || result?.status === 'RUNNING') {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          loadingInstance.close()
          ElMessage.warning('删除超时，请稍后查看结果')
          emit('success')
          handleClose()
        }
      } else if (result?.status === 'COMPLETED' || result?.status === 'SUCCESS') {
        loadingInstance.close()
        ElMessage.success('用户组删除成功')
        emit('success')
        handleClose()
      } else if (result?.status === 'FAILED' || result?.status === 'ERROR') {
        loadingInstance.close()
        ElMessage.error(result?.error || '删除失败')
        emit('success')
        handleClose()
      } else {
        if (attempts < maxAttempts) {
          pollingTimer = setTimeout(poll, 5000)
        } else {
          loadingInstance.close()
          emit('success')
          handleClose()
        }
      }
    } catch (error) {
      console.error('轮询失败:', error)
      if (attempts < maxAttempts) {
        pollingTimer = setTimeout(poll, 5000)
      } else {
        loadingInstance.close()
        ElMessage.error('状态查询失败')
      }
    }
  }

  pollingTimer = setTimeout(poll, 5000)
}

function handleClose() {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
  visible.value = false
  selectedHosts.value = []
  groupName.value = ''
}

onUnmounted(() => {
  if (pollingTimer) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
})
</script>

<style scoped lang="scss">
.delete-group-dialog {
  .mb-4 { margin-bottom: 16px; }
}

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
