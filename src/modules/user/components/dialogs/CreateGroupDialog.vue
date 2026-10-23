<template>
  <el-dialog
    :model-value="visible"
    title="创建用户组"
    width="700px"
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :disabled="attempted || validating"
      label-width="100px"
      @submit.prevent
    >
      <!-- 选择主机 -->
      <el-form-item label="选择主机" required>
        <AcmDeviceSelector
          v-model="selectedHosts"
          :disabled="attempted || validating"
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
          :loading="busy || validating"
          :disabled="attempted || validating || !selectedHosts.length"
          @click="handleSubmit"
        >
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const formRef = ref(null)
const selectedHosts = ref([])
const validating = ref(false)
const formData = reactive({ group_name: '' })
const formRules = { group_name: [{ required: true, message: '请输入组名', trigger: 'blur' }] }
const task = useUserDialogTask({
  visible: () => props.visible,
  emit,
  onSuccess: handleClose,
  successMessage: '用户组创建成功'
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const buttonText = computed(() =>
  busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '确认创建用户组'
)
watch(
  () => props.visible,
  () => {
    validating.value = false
    selectedHosts.value = []
    formData.group_name = ''
  },
  { flush: 'sync' }
)
async function handleSubmit() {
  if (attempted.value || validating.value) return
  if (!selectedHosts.value.length) {
    ElMessage.warning('请先选择主机')
    return
  }
  const ready = task.captureReady()
  if (!ready()) return
  validating.value = true
  try {
    await formRef.value?.validate()
  } catch {
    return
  } finally {
    if (ready()) validating.value = false
  }
  if (!ready()) return
  const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')
  if (!hosts.length || !formData.group_name) {
    ElMessage.warning('请选择主机并输入组名')
    return
  }
  return task.run('zrYK7K', { hosts, group_name: formData.group_name })
}
function handleClose(done) {
  task.reset()
  visible.value = false
  validating.value = false
  formRef.value?.resetFields()
  selectedHosts.value = []
  formData.group_name = ''
  if (typeof done === 'function') done()
}
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
