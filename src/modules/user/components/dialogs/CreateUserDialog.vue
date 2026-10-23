<template>
  <el-dialog
    :model-value="visible"
    title="创建用户"
    width="800px"
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      class="create-user-form"
      :disabled="attempted || validating"
    >
      <!-- 选择主机 -->
      <el-form-item label="选择主机">
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

      <!-- 用户名 -->
      <el-form-item label="用户名" prop="username" required>
        <el-input v-model="formData.username" placeholder="在主机上创建的用户名称" maxlength="32" />
      </el-form-item>

      <!-- 密码 -->
      <el-form-item label="密码" prop="password" required>
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          placeholder="密码复杂度需满足功能配置中的规则"
          autocomplete="new-password"
          maxlength="32"
        />
      </el-form-item>

      <!-- 主用户组 -->
      <el-form-item label="主用户组" prop="group">
        <el-input v-model="formData.group" placeholder="选填，默认与用户名同名" maxlength="32" />
      </el-form-item>

      <!-- 附加用户组 -->
      <el-form-item label="附加用户组" prop="groups">
        <el-input
          v-model="formData.groups"
          placeholder="选填，多个组名用逗号隔开"
          maxlength="100"
        />
      </el-form-item>

      <!-- 主目录 -->
      <el-form-item label="主目录" prop="home">
        <el-input v-model="formData.home" placeholder="选填，一般情况无需指定" maxlength="256" />
      </el-form-item>

      <!-- Shell -->
      <el-form-item label="Shell" prop="shell">
        <el-input v-model="formData.shell" placeholder="选填，一般情况无需指定" maxlength="100" />
      </el-form-item>

      <!-- 备注 -->
      <el-form-item label="备注" prop="comment">
        <el-input v-model="formData.comment" placeholder="选填，用户注释信息" maxlength="200" />
      </el-form-item>

      <!-- 过期时间 -->
      <el-form-item label="过期时间" prop="expiredDate">
        <el-date-picker
          v-model="formData.expiredDate"
          type="date"
          placeholder="选填，默认永不失效"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <!-- sudo模板 -->
      <el-form-item label="sudo模板" prop="templateId">
        <el-select
          v-model="formData.templateId"
          placeholder="选填，设置用户sudo权限"
          style="width: 100%"
          :loading="templatesLoading"
        >
          <el-option label="N/A" value="N/A" />
          <el-option v-for="tpl in sudoTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="templatesError" label="sudo模板">
        <el-alert :title="templatesError" type="warning" :closable="false" />
        <el-button @click="loadSudoTemplates">重试模板读取</el-button>
      </el-form-item>
      <el-form-item v-if="formData.templateId !== 'N/A'" label="sudo读取">
        <span v-if="commandsLoading">正在读取模板命令…</span>
        <template v-else-if="commandsError">
          <el-alert :title="commandsError" type="warning" :closable="false" />
          <el-button @click="loadSudoCommands">重试命令读取</el-button>
        </template>
        <span v-else-if="!canSubmitSudo">模板尚未确认完整，请先完成模板读取。</span>
        <span v-else>将提交本模板的全部 {{ sudoCommands.length }} 条命令。</span>
      </el-form-item>
      <!-- sudo命令列表 -->
      <el-form-item v-if="sudoCommands.length" label="sudo命令">
        <el-table :data="sudoCommands" size="small" max-height="200">
          <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
        </el-table>
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
          :disabled="attempted || validating || !selectedHosts.length || !canSubmitSudo"
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
import { useUserSudoRead } from '@/modules/user/composables/useUserSudoRead'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const formRef = ref(null)
const selectedHosts = ref([])
const validating = ref(false)
const defaults = () => ({
  username: '',
  password: '',
  group: '',
  groups: '',
  home: '',
  shell: '',
  comment: '',
  expiredDate: '',
  templateId: 'N/A'
})
const formData = reactive(defaults())
const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const task = useUserDialogTask({
  visible: () => props.visible,
  emit,
  onSuccess: handleClose,
  successMessage: '用户创建成功',
  maxAttempts: 120
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const sudoRead = useUserSudoRead({
  visible: () => props.visible,
  templateId: () => formData.templateId
})
const {
  sudoTemplates,
  sudoCommands,
  templatesLoading,
  commandsLoading,
  templatesError,
  commandsError,
  canSubmitSudo,
  loadSudoTemplates,
  loadSudoCommands
} = sudoRead
const buttonText = computed(() =>
  busy.value ? '正在处理…' : attempted.value ? '请先核实结果' : '确认创建'
)
watch(
  () => props.visible,
  () => {
    validating.value = false
    selectedHosts.value = []
    Object.assign(formData, defaults())
  },
  { flush: 'sync' }
)
async function handleSubmit() {
  if (validating.value || attempted.value || !canSubmitSudo.value) return
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
  if (!ready() || !canSubmitSudo.value) return
  const hosts = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')
  if (!hosts.length) {
    ElMessage.warning('请先选择主机')
    return
  }
  const request = task.run('6snZO9', {
    user_name: formData.username,
    user_password: formData.password,
    user_group: formData.group || '',
    groups: formData.groups || '',
    user_home: formData.home || '',
    user_shell: formData.shell || '',
    user_expires: formData.expiredDate || '',
    user_sudo_command: sudoCommands.value.map(c => c.command).join(','),
    user_comment: formData.comment || '',
    hosts: JSON.stringify(hosts)
  })
  if (attempted.value) formData.password = ''
  return request
}
function handleClose(done) {
  task.reset()
  sudoRead.clear()
  validating.value = false
  visible.value = false
  formRef.value?.resetFields()
  selectedHosts.value = []
  Object.assign(formData, defaults())
  if (typeof done === 'function') done()
}
</script>

<style scoped lang="scss">
.create-user-form {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 12px;
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
  gap: 12px;
}
</style>
