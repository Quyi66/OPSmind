<template>
  <el-dialog
    :model-value="visible"
    :title="t('hostUser.editUser')"
    width="600px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
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
      <el-form
        :model="formData"
        :disabled="attempted"
        :label-width="currentLocale === 'en-US' ? '160px' : '120px'"
        class="edit-form"
      >
        <el-form-item :label="t('hostUser.operationType')">
          <el-radio-group v-model="formData.operate" @change="handleOperateChange">
            <el-radio value="modify_base">{{ t('hostUser.editBasicInformation') }}</el-radio>
            <el-radio value="lock">{{ t('hostUser.lockUnlock') }}</el-radio>
            <el-radio value="ssh">{{ t('hostUser.sshSignIn') }}</el-radio>
            <el-radio value="modify_password">{{ t('hostUser.changePassword') }}</el-radio>
            <el-radio value="sudo">{{ t('hostUser.sudoPermissions') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('common.username')">
          <el-input v-model="formData.username" disabled />
        </el-form-item>

        <!-- 修改基本信息 -->
        <template v-if="formData.operate === 'modify_base'">
          <el-form-item :label="t('hostUser.additionalGroups')">
            <el-input
              v-model="formData.user_groups"
              :placeholder="t('hostUser.separateGroupNamesWithCommas')"
              maxlength="100"
            />
          </el-form-item>
          <el-form-item :label="t('hostUser.homeDirectory')">
            <el-input v-model="formData.user_home" maxlength="256" />
          </el-form-item>
          <el-form-item label="Shell">
            <el-input v-model="formData.user_shell" maxlength="100" />
          </el-form-item>
          <el-form-item :label="t('hostUser.notes')">
            <el-input v-model="formData.user_comment" maxlength="200" />
          </el-form-item>
          <el-form-item :label="t('hostUser.expiryDate')">
            <el-date-picker
              v-model="formData.user_expires"
              type="date"
              :placeholder="t('hostUser.optional')"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </template>

        <!-- 锁定/解锁 -->
        <template v-if="formData.operate === 'lock'">
          <el-form-item :label="t('hostUser.listedLockStatus')">{{ lockStatusText }}</el-form-item>
          <el-form-item :label="t('hostUser.lockTheUser')">
            <el-radio-group v-model="formData.user_lock">
              <el-radio value="yes">{{ t('hostUser.locked') }}</el-radio>
              <el-radio value="no">{{ t('hostUser.unlock') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- SSH登录 -->
        <template v-if="formData.operate === 'ssh'">
          <p>{{ t('hostUser.selectTheTargetActionTheseOptionsDoNot') }}</p>
          <el-form-item :label="t('hostUser.allowSshSignIn')">
            <el-radio-group v-model="formData.user_login">
              <el-radio value="yes">{{ t('hostUser.yes') }}</el-radio>
              <el-radio value="no">{{ t('hostUser.no') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <!-- 修改密码 -->
        <template v-if="formData.operate === 'modify_password'">
          <el-form-item :label="t('hostUser.newPassword')" required>
            <el-input
              v-model="formData.user_password"
              type="password"
              show-password
              :placeholder="t('hostUser.enterANewPassword')"
              autocomplete="new-password"
              maxlength="32"
            />
          </el-form-item>
        </template>

        <!-- sudo权限 -->
        <template v-if="formData.operate === 'sudo'">
          <el-form-item :label="t('hostUser.sudoTemplate')">
            <el-select
              v-model="formData.templateId"
              :placeholder="t('hostUser.selectASudoTemplate')"
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
          <el-form-item v-if="templatesError" :label="t('hostUser.sudoTemplate')">
            <el-alert :title="templatesError" type="warning" :closable="false" />
            <el-button @click="loadSudoTemplates">{{ t('hostUser.retryTemplates') }}</el-button>
          </el-form-item>
          <el-form-item v-if="formData.templateId !== 'N/A'" :label="t('hostUser.sudoLoading')">
            <span v-if="commandsLoading">{{ t('hostUser.readingTemplateCommands') }}</span>
            <template v-else-if="commandsError">
              <el-alert :title="commandsError" type="warning" :closable="false" />
              <el-button @click="loadSudoCommands">{{ t('hostUser.retryCommands') }}</el-button>
            </template>
            <span v-else-if="!canSubmitSudo">
              {{ t('hostUser.theTemplateIsNotConfirmedCompleteLoadThe') }}
            </span>
            <span v-else>
              {{ t('hostUser.submitAllTemplateCommands', { count: sudoCommands.length }) }}
            </span>
          </el-form-item>
          <el-form-item v-if="sudoCommands.length" :label="t('hostUser.sudoCommands')">
            <el-table :data="sudoCommands" size="small" max-height="200">
              <el-table-column
                prop="command"
                :label="t('hostUser.command')"
                min-width="200"
                show-overflow-tooltip
              />
              <el-table-column
                prop="description"
                :label="t('hostUser.description')"
                width="150"
                show-overflow-tooltip
              />
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
    <p v-if="attempted">{{ t('hostUser.closingThisWindowDoesNotCancelSubmittedTasks') }}</p>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ attempted ? t('hostUser.closeWindow') : t('common.cancel') }}
        </el-button>
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
import { t, currentLocale } from '@/core/i18n'

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
  successMessage: () => t('hostUser.operationCompleted')
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
  () =>
    ({ 1: t('hostUser.locked'), 2: t('hostUser.unlocked') })[userData.value.lock_status] ||
    t('hostUser.unknown')
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
  if (busy.value) return t('hostUser.processing')
  if (attempted.value) return t('hostUser.verifyTheResultFirst')
  return (
    {
      modify_base: t('common.save'),
      lock:
        formData.user_lock === 'yes'
          ? t('hostUser.lockUser')
          : formData.user_lock === 'no'
            ? t('hostUser.unlockUser')
            : t('hostUser.selectALockAction'),
      ssh:
        formData.user_login === 'yes'
          ? t('hostUser.allowSshSignIn')
          : formData.user_login === 'no'
            ? t('hostUser.denySshSignIn')
            : t('hostUser.selectAnSshAction'),
      modify_password: t('hostUser.changePassword'),
      sudo: t('hostUser.saveSudoPermissions')
    }[formData.operate] || t('common.confirm')
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
    ElMessage.warning(t('hostUser.userDetailsAreRequiredForThisOperation'))
    return
  }
  if (formData.operate === 'modify_password' && !formData.user_password) {
    ElMessage.warning(t('hostUser.enterANewPassword'))
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
