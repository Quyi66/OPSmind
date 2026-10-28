<template>
  <el-dialog
    :model-value="visible"
    title="扫描主机"
    width="900px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
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
            :disabled="attempted"
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

    <el-alert
      v-if="taskMessage"
      :title="taskMessage"
      :description="taskDescription"
      :type="taskType"
      :closable="false"
      show-icon
    />
    <p v-if="attempted">关闭窗口不会取消已提交的后台任务；结果未知时请先核实，勿重复操作。</p>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ attempted ? '关闭窗口' : '取消' }}</el-button>
        <el-button
          type="primary"
          :loading="busy"
          :disabled="attempted || !selectedHosts.length"
          @click="handleExecute"
        >
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const selectedHosts = ref([])
const task = useUserDialogTask({
  visible: () => props.visible,
  emit,
  onSuccess: handleClose,
  successMessage: '扫描完成',
  maxAttempts: 120
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const buttonText = computed(() =>
  busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '开始扫描'
)
watch(
  () => props.visible,
  value => {
    if (value) selectedHosts.value = []
  },
  { flush: 'sync' }
)
function handleExecute() {
  if (attempted.value) return
  const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')
  if (!hosts.length) {
    ElMessage.warning('请先选择要扫描的主机')
    return
  }
  return task.run('hTzJfM', { hosts })
}
function handleClose(done) {
  task.reset()
  visible.value = false
  selectedHosts.value = []
  if (typeof done === 'function') done()
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
