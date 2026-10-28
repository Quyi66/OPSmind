<template>
  <el-dialog
    :model-value="visible"
    title="删除用户"
    width="520px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
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

      <el-form :model="formData" :disabled="attempted" label-width="120px">
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
          {{ getSubmitButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({
  visible: { type: Boolean, default: false },
  user: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const userData = ref({})
const formData = reactive({ username: '', user_remove_home: 'yes' })
const task = useUserDialogTask({
  visible: () => props.visible,
  context: () => props.user,
  emit,
  onSuccess: handleClose,
  successMessage: '删除成功'
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
watch(
  [() => props.visible, () => props.user],
  () => {
    if (!props.visible) return
    userData.value = { ...props.user }
    formData.username = props.user.username || ''
    formData.user_remove_home = 'yes'
  },
  { immediate: true, flush: 'sync' }
)
function getSubmitButtonText() {
  return busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '删除用户'
}
function handleSubmit() {
  if (attempted.value) return
  const hostId = userData.value.host_id || userData.value.id
  if (!hostId || !formData.username) {
    ElMessage.warning('缺少用户信息，无法执行删除')
    return
  }
  return task.run('5XLCC1', {
    user_name: formData.username,
    hosts: hostId,
    user_remove_home: formData.user_remove_home
  })
}
function handleClose(done) {
  task.reset()
  visible.value = false
  formData.user_remove_home = 'yes'
  if (typeof done === 'function') done()
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
