<template>
  <el-dialog
    :model-value="visible"
    :title="t('hostUser.deleteUserGroup')"
    width="600px"
    :close-on-click-modal="false"
    :before-close="handleClose"
    :close-on-press-escape="false"
  >
    <div class="delete-group-dialog">
      <el-alert type="warning" :closable="false" show-icon class="mb-4">
        <template #title>
          {{ t('hostUser.warningDeletingUserGroupsCannotBeUndoneProceed') }}
        </template>
      </el-alert>

      <!-- 单个删除 -->
      <template v-if="groupData">
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="t('hostUser.hostIp')">
            {{ groupData.host_key }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('hostUser.hostname')">
            {{ groupData.hostname }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('hostUser.groupName')">
            {{ groupData.group_name }}
          </el-descriptions-item>
        </el-descriptions>
      </template>

      <!-- 批量删除 -->
      <template v-else>
        <p>{{ t('hostUser.selectTargetHostsAndEnterOneGroupName') }}</p>
        <el-form
          :disabled="attempted"
          :label-width="currentLocale === 'en-US' ? '160px' : '100px'"
          @submit.prevent
        >
          <el-form-item :label="t('hostUser.selectHosts')">
            <AcmDeviceSelector
              v-model="selectedHosts"
              :disabled="attempted"
              ci-types="linux"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: t('hostUser.selectDevices')
              }"
            />
          </el-form-item>

          <el-form-item :label="t('hostUser.groupName')" required>
            <el-input
              v-model="groupName"
              :placeholder="t('hostUser.enterTheUserGroupNameToDelete')"
              maxlength="32"
            />
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
    <p v-if="attempted">{{ t('hostUser.closingThisWindowDoesNotCancelSubmittedTasks') }}</p>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ attempted ? t('hostUser.closeWindow') : t('common.cancel') }}
        </el-button>
        <el-button type="danger" :loading="busy" :disabled="attempted" @click="handleSubmit">
          {{ buttonText }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

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
  successMessage: () => t('hostUser.userGroupDeleted')
})
const { attempted, busy, taskType, taskMessage, taskDescription } = task
const buttonText = computed(() =>
  busy.value
    ? t('hostUser.processing')
    : attempted.value
      ? t('hostUser.verifyTheResultFirst')
      : t('hostUser.confirmGroupDeletion')
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
      ElMessage.warning(t('hostUser.aHostIdAndGroupNameAreRequired'))
      return
    }
  } else {
    if (!selectedHosts.value.length) {
      ElMessage.warning(t('hostUser.selectHostsFirst'))
      return
    }
    if (!groupName.value) {
      ElMessage.warning(t('hostUser.enterAGroupName'))
      return
    }
    const ids = selectedHosts.value.map(host => host.key || host.id)
    if (ids.some(id => !id)) {
      ElMessage.warning(t('hostUser.theSelectedHostsHaveNoIdsSelectThem'))
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
