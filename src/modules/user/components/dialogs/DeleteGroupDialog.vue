<template>
  <el-dialog
    :model-value="visible"
    title="删除用户组"
    width="600px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
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
        <p>请选择要操作的主机并输入同一个组名；此处不使用列表行选择。</p>
        <el-form :disabled="attempted" label-width="100px" @submit.prevent>
          <el-form-item label="选择主机">
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
          </el-form-item>

          <el-form-item label="组名" required>
            <el-input v-model="groupName" placeholder="输入要删除的用户组名称" maxlength="32" />
          </el-form-item>
        </el-form>
      </template>
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
        <el-button type="danger" :loading="busy" :disabled="attempted" @click="handleSubmit">
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
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({
  visible: { type: Boolean, default: false },
  groupData: { type: Object, default: null }
})
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const selectedHosts = ref([])
const groupName = ref('')
const task = useUserDialogTask({
  visible: () => props.visible,
  context: () => props.groupData,
  emit,
  onSuccess: handleClose,
  successMessage: '用户组删除成功'
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const buttonText = computed(() =>
  busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '确认删除用户组'
)
watch(
  [() => props.visible, () => props.groupData],
  () => {
    selectedHosts.value = []
    groupName.value = props.visible ? props.groupData?.group_name || '' : ''
  },
  { immediate: true, flush: 'sync' }
)
function handleSubmit() {
  if (attempted.value) return
  let hostId, name
  if (props.groupData) {
    hostId = props.groupData.hostId || props.groupData.host_id
    name = props.groupData.group_name
    if (!hostId || !name) {
      ElMessage.warning('缺少主机标识或组名，无法执行删除')
      return
    }
  } else {
    if (!selectedHosts.value.length) {
      ElMessage.warning('请先选择主机')
      return
    }
    if (!groupName.value) {
      ElMessage.warning('请输入组名')
      return
    }
    const ids = selectedHosts.value.map(host => host.key || host.id)
    if (ids.some(id => !id)) {
      ElMessage.warning('所选主机缺少标识，请重新选择')
      return
    }
    hostId = ids.join(',')
    name = groupName.value
  }
  return task.run('J0PRi7', { group_name: name, hosts: hostId })
}
function handleClose(done) {
  task.reset()
  visible.value = false
  selectedHosts.value = []
  groupName.value = ''
  if (typeof done === 'function') done()
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
