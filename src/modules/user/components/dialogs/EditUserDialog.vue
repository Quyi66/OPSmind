<template>
  <el-dialog
    :model-value="visible"
    title="修改用户"
    width="600px"
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <div class="edit-user-dialog">
      <!-- 用户信息显示 -->
      <div class="user-info">
        <p>
          <strong>IP：</strong>
          {{ userData.host_key }}
        </p>
        <p>
          <strong>Hostname：</strong>
          {{ userData.hostname }}
        </p>
      </div>

      <!-- 操作类型选择 -->
      <el-form :model="formData" :disabled="attempted" label-width="120px" class="edit-form">
        <el-form-item label="操作类型">
          <el-radio-group v-model="formData.operate" @change="handleOperateChange">
            <el-radio value="modify_base">修改基本信息</el-radio>
            <el-radio value="lock">锁定/解锁</el-radio>
            <el-radio value="ssh">SSH登录</el-radio>
            <el-radio value="modify_password">修改密码</el-radio>
            <el-radio value="sudo">sudo权限</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="用户名">
          <el-input v-model="formData.username" disabled />
        </el-form-item>

        <!-- 修改基本信息 -->
        <template v-if="formData.operate === 'modify_base'">
          <el-form-item label="附加用户组">
            <el-input
              v-model="formData.user_groups"
              placeholder="多个组名用逗号隔开"
              maxlength="100"
            />
          </el-form-item>
          <el-form-item label="主目录">
            <el-input v-model="formData.user_home" maxlength="256" />
          </el-form-item>
          <el-form-item label="Shell">
            <el-input v-model="formData.user_shell" maxlength="100" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="formData.user_comment" maxlength="200" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker
              v-model="formData.user_expires"
              type="date"
              placeholder="选填"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>

        <!-- 锁定/解锁 -->
        <template v-if="formData.operate === 'lock'">
          <el-form-item label="列表锁定状态">{{ lockStatusText }}</el-form-item>
          <el-form-item label="是否锁定用户">
            <el-radio-group v-model="formData.user_lock">
              <el-radio value="yes">锁定</el-radio>
              <el-radio value="no">解锁</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- SSH登录 -->
        <template v-if="formData.operate === 'ssh'">
          <p>请选择本次目标动作；以下选项不表示已读取主机当前的SSH配置。</p>
          <el-form-item label="允许SSH登录">
            <el-radio-group v-model="formData.user_login">
              <el-radio value="yes">是</el-radio>
              <el-radio value="no">否</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- 修改密码 -->
        <template v-if="formData.operate === 'modify_password'">
          <el-form-item label="新密码" required>
            <el-input
              v-model="formData.user_password"
              type="password"
              show-password
              placeholder="请输入新密码"
              autocomplete="new-password"
              maxlength="32"
            />
          </el-form-item>
        </template>

        <!-- sudo权限 -->
        <template v-if="formData.operate === 'sudo'">
          <el-form-item label="sudo模板">
            <el-select
              v-model="formData.templateId"
              placeholder="选择sudo模板"
              style="width: 100%"
              :loading="templatesLoading"
            >
              <el-option label="N/A" value="N/A" />
              <el-option
                v-for="tpl in sudoTemplates"
                :key="tpl.id"
                :label="tpl.name"
                :value="tpl.id"
              />
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
          <el-form-item v-if="sudoCommands.length" label="sudo命令">
            <el-table :data="sudoCommands" size="small" max-height="200">
              <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
              <el-table-column prop="description" label="描述" width="150" show-overflow-tooltip />
            </el-table>
          </el-form-item>
        </template>
      </el-form>
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
          :disabled="attempted || missingAction || (formData.operate === 'sudo' && !canSubmitSudo)"
          @click="handleSubmit"
        >
          {{ getSubmitButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserSudoRead } from '@/modules/user/composables/useUserSudoRead'
import { useUserDialogTask } from '@/modules/user/composables/useUserDialogTask'
const props = defineProps({
  visible: { type: Boolean, default: false },
  initialOperate: { type: String, default: 'modify_base' },
  user: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:visible', 'success'])
const visible = computed({ get: () => props.visible, set: val => emit('update:visible', val) })
const userData = ref({})
const defaults = () => ({
  operate: 'modify_base',
  username: '',
  user_groups: '',
  user_home: '',
  user_shell: '',
  user_comment: '',
  user_expires: '',
  user_lock: '',
  user_login: '',
  user_password: '',
  templateId: 'N/A'
})
const formData = reactive(defaults())
const jobIdMap = {
  modify_base: 'EOLAGR',
  lock: '1TKvLB',
  ssh: 'wSVnmq',
  modify_password: 'rbNP8M',
  sudo: 'OHlcdQ'
}
const task = useUserDialogTask({
  visible: () => props.visible,
  context: () => props.user,
  emit,
  onSuccess: handleClose,
  successMessage: '操作成功'
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const sudoRead = useUserSudoRead({
  visible: () => props.visible,
  context: () => props.user,
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
const lockStatusText = computed(
  () => ({ 1: '锁定', 2: '未锁定' })[userData.value.lock_status] || '未知'
)
watch(
  [() => props.visible, () => props.user],
  () => {
    if (!props.visible) {
      formData.user_password = ''
      return
    }
    userData.value = { ...props.user }
    Object.assign(formData, defaults(), {
      username: props.user.username || '',
      user_groups: props.user.secondary_group || '',
      user_home: props.user.home || '',
      user_shell: props.user.shell || '',
      user_comment: props.user.comment || '',
      user_expires: props.user.expired_date || '',
      operate: Object.prototype.hasOwnProperty.call(jobIdMap, props.initialOperate)
        ? props.initialOperate
        : 'modify_base'
    })
    if (formData.operate === 'lock') {
      const status = Number(props.user.lock_status)
      formData.user_lock = status === 1 ? 'no' : status === 2 ? 'yes' : ''
    }
  },
  { immediate: true, flush: 'sync' }
)
function handleOperateChange() {
  formData.templateId = 'N/A'
  formData.user_lock = ''
  formData.user_login = ''
  formData.user_password = ''
}
function getSubmitButtonText() {
  if (busy.value) return '正在处理…'
  if (attempted.value) return '请先核实结果'
  return (
    {
      modify_base: '保存',
      lock:
        formData.user_lock === 'yes'
          ? '锁定用户'
          : formData.user_lock === 'no'
            ? '解锁用户'
            : '请选择锁定动作',
      ssh:
        formData.user_login === 'yes'
          ? '允许SSH登录'
          : formData.user_login === 'no'
            ? '禁止SSH登录'
            : '请选择SSH动作',
      modify_password: '修改密码',
      sudo: '保存sudo权限'
    }[formData.operate] || '确认'
  )
}
const missingAction = computed(() =>
  formData.operate === 'lock'
    ? !formData.user_lock
    : formData.operate === 'ssh'
      ? !formData.user_login
      : false
)
function handleSubmit() {
  if (
    attempted.value ||
    missingAction.value ||
    (formData.operate === 'sudo' && !canSubmitSudo.value)
  )
    return
  const hostId = userData.value.host_id || userData.value.id
  if (!hostId || !formData.username) {
    ElMessage.warning('缺少用户信息，无法执行操作')
    return
  }
  if (formData.operate === 'modify_password' && !formData.user_password) {
    ElMessage.warning('请输入新密码')
    return
  }
  const jobId = jobIdMap[formData.operate]
  if (!jobId) return
  const request = task.run(jobId, buildParams(hostId))
  if (attempted.value) formData.user_password = ''
  return request
}
function buildParams(hostId) {
  const base = { user_name: formData.username, hosts: hostId }
  switch (formData.operate) {
    case 'modify_base':
      return {
        ...base,
        user_groups: formData.user_groups || '',
        user_home: formData.user_home || '',
        user_shell: formData.user_shell || '',
        user_comment: formData.user_comment || '',
        user_expires: formData.user_expires || ''
      }
    case 'lock':
      return { ...base, user_lock: formData.user_lock }
    case 'ssh':
      return { ...base, user_login: formData.user_login }
    case 'modify_password':
      return { ...base, user_password: formData.user_password }
    case 'sudo':
      return { ...base, user_sudo_command: sudoCommands.value.map(c => c.command).join(',') }
    default:
      return base
  }
}
function handleClose(done) {
  task.reset()
  sudoRead.clear()
  visible.value = false
  Object.assign(formData, defaults())
  if (typeof done === 'function') done()
}
</script>

<style scoped lang="scss">
.edit-user-dialog {
  max-height: 60vh;
  overflow-y: auto;
}

.user-info {
  background: var(--el-color-primary-light-9);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid var(--el-color-primary-light-8);

  p {
    margin: 4px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
}

.edit-form {
  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
