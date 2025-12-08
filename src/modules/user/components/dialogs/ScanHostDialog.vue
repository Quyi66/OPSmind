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
            <el-button type="primary" plain size="small" @click="showDeviceSelector = true">
              <i class="fa fa-plus"></i> 选择设备
            </el-button>
            <span class="host-count" v-if="selectedHosts.length">
              已选择 <strong>{{ selectedHosts.length }}</strong> 台主机
            </span>
          </div>

          <!-- 已选主机预览 -->
          <div class="selected-hosts" v-if="selectedHosts.length">
            <el-tag
              v-for="host in selectedHosts"
              :key="host.id || host.host_key"
              closable
              size="small"
              @close="removeHost(host)"
            >
              {{ host.host_key || host.ip }}
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
          <i class="fa fa-running" v-if="!executing"></i>
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
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

// 处理设备选择确认
function handleDeviceConfirm(hosts) {
  selectedHosts.value = hosts || []
  showDeviceSelector.value = false
}

// 移除主机
function removeHost(host) {
  const index = selectedHosts.value.findIndex(
    h => (h.id || h.host_key) === (host.id || host.host_key)
  )
  if (index > -1) {
    selectedHosts.value.splice(index, 1)
  }
}

// 执行扫描
async function handleExecute() {
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择要扫描的主机')
    return
  }

  executing.value = true
  try {
    // TODO: 调用作业执行接口
    // 作业ID: hTzJfM
    const hostKeys = selectedHosts.value.map(h => h.host_key || h.ip).join(',')
    console.log('执行扫描作业，主机:', hostKeys)

    // 模拟执行
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('扫描任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error('执行失败: ' + (error?.message || '未知错误'))
  } finally {
    executing.value = false
  }
}

// 关闭对话框
function handleClose() {
  visible.value = false
  selectedHosts.value = []
  executing.value = false
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
