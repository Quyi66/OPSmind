<template>
  <el-dialog
    :model-value="visible"
    :title="t('hostUser.createUser')"
    width="800px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="currentLocale === 'en-US' ? '160px' : '120px'"
      class="create-user-form"
      :disabled="attempted || validating"
    >
      <!-- 选择主机 -->
      <el-form-item :label="t('hostUser.selectHosts')">
        <AcmDeviceSelector
          v-model="selectedHosts"
          :disabled="attempted || validating"
          ci-types="linux"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: t('hostUser.selectDevices')
          }"
        />
      </el-form-item>

      <!-- 用户名 -->
      <el-form-item :label="t('common.username')" prop="username" required>
        <el-input
          v-model="formData.username"
          :placeholder="t('hostUser.usernameToCreateOnTheHost')"
          maxlength="32"
        />
      </el-form-item>

      <!-- 密码 -->
      <el-form-item :label="t('common.password')" prop="password" required>
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          :placeholder="t('hostUser.passwordMustMeetTheConfiguredComplexityRules')"
          autocomplete="new-password"
          maxlength="32"
        />
      </el-form-item>

      <!-- 主用户组 -->
      <el-form-item :label="t('hostUser.primaryGroup')" prop="group">
        <el-input
          v-model="formData.group"
          :placeholder="t('hostUser.optionalDefaultsToTheUsername')"
          maxlength="32"
        />
      </el-form-item>

      <!-- 附加用户组 -->
      <el-form-item :label="t('hostUser.additionalGroups')" prop="groups">
        <el-input
          v-model="formData.groups"
          :placeholder="t('hostUser.optionalSeparateGroupNamesWithCommas')"
          maxlength="100"
        />
      </el-form-item>

      <!-- 主目录 -->
      <el-form-item :label="t('hostUser.homeDirectory')" prop="home">
        <el-input
          v-model="formData.home"
          :placeholder="t('hostUser.optionalUsuallyNotRequired')"
          maxlength="256"
        />
      </el-form-item>

      <!-- Shell -->
      <el-form-item label="Shell" prop="shell">
        <el-input
          v-model="formData.shell"
          :placeholder="t('hostUser.optionalUsuallyNotRequired')"
          maxlength="100"
        />
      </el-form-item>

      <!-- 备注 -->
      <el-form-item :label="t('hostUser.notes')" prop="comment">
        <el-input
          v-model="formData.comment"
          :placeholder="t('hostUser.optionalUserComment')"
          maxlength="200"
        />
      </el-form-item>

      <!-- 过期时间 -->
      <el-form-item :label="t('hostUser.expiryDate')" prop="expiredDate">
        <el-date-picker
          v-model="formData.expiredDate"
          type="date"
          :placeholder="t('hostUser.optionalNeverExpiresByDefault')"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <!-- sudo模板 -->
      <el-form-item :label="t('hostUser.sudoTemplate')" prop="templateId">
        <el-select
          v-model="formData.templateId"
          :placeholder="t('hostUser.optionalConfigureUserSudoPermissions')"
          style="width: 100%"
          :loading="templatesLoading"
        >
          <el-option label="N/A" value="N/A" />
          <el-option v-for="tpl in sudoTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
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
      <!-- sudo命令列表 -->
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
    </el-form>

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
import { t, currentLocale } from '@/core/i18n'

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
  username: [
    {
      required: true,
      get message() {
        return t('auth.usernamePlaceholder')
      },
      trigger: 'blur'
    }
  ],
  password: [
    {
      required: true,
      get message() {
        return t('auth.passwordPlaceholder')
      },
      trigger: 'blur'
    }
  ]
}
const task = useUserDialogTask({
  visible: () => props.visible,
  emit,
  onSuccess: handleClose,
  successMessage: () => t('hostUser.userCreated'),
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
  busy.value
    ? t('hostUser.processing')
    : attempted.value
      ? t('hostUser.verifyTheResultFirst')
      : t('hostUser.confirmCreation')
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
    ElMessage.warning(t('hostUser.selectHostsFirst'))
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
    ElMessage.warning(t('hostUser.selectHostsFirst'))
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
