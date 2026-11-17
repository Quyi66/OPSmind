<template>
  <div class="ops-action-bar">
    <el-select v-model="status" size="small" :aria-label="t('patches.linux.taskStatus')" style="width: 180px" @change="search">
      <el-option :label="t('patches.linux.allTasks')" value="" />
      <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>
    <span style="flex: 1" />
    <el-button v-if="isAdmin" size="small" @click="configVisible = true">
      {{ t('patches.changeControl.title') }}
    </el-button>
    <el-button
      class="toolbar-icon-btn"
      circle
      size="small"
      :loading="loading"
      :title="t('common.refresh')"
      :aria-label="t('common.refresh')"
      @click="load"
    >
      <el-icon v-show="!loading"><Refresh /></el-icon>
    </el-button>
  </div>
  <div class="ops-table-wrapper">
    <el-table v-loading="loading" :data="rows" height="100%">
      <el-table-column prop="createdBy" :label="t('automation.approval.applicant')" width="120" />
      <el-table-column :label="t('patches.windows.taskType')" min-width="142">
        <template #default="{ row }">{{ formatTaskType(row.taskType) }}</template>
      </el-table-column>
      <el-table-column :label="t('patches.linux.package')" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.packages) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('execution.ui.targetHost')" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.hostIds) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('patches.linux.scheduledTime')" width="180">
        <template #default="{ row }">{{ formatDateTime(row.scheduledTime) }}</template>
      </el-table-column>
      <el-table-column :label="t('patches.changeControl.plan')" min-width="205" show-overflow-tooltip>
        <template #default="{ row }">
          <div v-if="row.planStartTime || row.planEndTime">{{ formatDateTime(row.planStartTime) }} – {{ formatDateTime(row.planEndTime) }}</div>
          <div v-if="row.applyReason">{{ row.applyReason }}</div>
          <el-tag v-if="row.nonWindowConfirmed" size="small" type="warning" effect="plain">
            {{ t('patches.changeControl.nonWindow') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('common.status')" width="140">
        <template #default="{ row }">
          <el-tag :type="getTaskStatusTagType(row.status)" :style="getTaskStatusTagStyle(row.status)" size="small" effect="light" round>{{ row.status === 'CREATED' && row.scheduledTime ? t('patches.linux.waitingScheduledExecution') : formatTaskStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="errorMessage" :label="t('patches.linux.errorReason')" min-width="160" show-overflow-tooltip />
      <el-table-column :label="t('common.actions')" :width="actionColumnWidth" fixed="right">
        <template #default="{ row }">
          <div v-if="currentLocale === 'en-US'" class="package-task-actions is-english">
            <el-button text type="primary" size="small" @click="$emit('detail', row)">{{ t('automation.records.details') }}</el-button>
            <el-dropdown v-if="row.taskType !== 'rollback' || (isAdmin && row.status === 'PENDING_APPROVAL')" trigger="click">
              <el-button text type="primary" size="small">{{ t('common.moreActions') }}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="row.taskType !== 'rollback'" @click="openFailedHosts(row)">{{ t('patches.linux.failedHosts') }}</el-dropdown-item>
                  <template v-if="isAdmin && row.status === 'PENDING_APPROVAL'">
                    <el-dropdown-item :disabled="approving || isApprovalExpired(row)" @click="approve(row, true)">{{ t('automation.workbench.approve') }}</el-dropdown-item>
                    <el-dropdown-item :disabled="approving" @click="approve(row, false)">{{ t('patches.linux.reject') }}</el-dropdown-item>
                  </template>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <template v-else>
            <el-button text type="primary" size="small" @click="$emit('detail', row)">{{ t('automation.records.details') }}</el-button>
            <el-button
              v-if="row.taskType !== 'rollback'"
              text
              type="primary"
              size="small"
              @click="openFailedHosts(row)"
            >
              {{ t('patches.linux.failedHosts') }}
            </el-button>
            <template v-if="isAdmin && row.status === 'PENDING_APPROVAL'">
              <el-button text type="success" size="small" :disabled="approving || isApprovalExpired(row)" @click="approve(row, true)">{{ t('automation.workbench.approve') }}</el-button>
              <el-button text type="danger" size="small" :disabled="approving" @click="approve(row, false)">{{ t('patches.linux.reject') }}</el-button>
            </template>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <div class="ops-pagination-wrapper">
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" background @current-change="load" />
  </div>
  <PatchTaskFailedHostsDialog v-model="failedHostsVisible" :task-id="failedHostsTaskId" />
  <PatchChangeControlDialog v-if="configVisible && isAdmin" v-model="configVisible" :is-admin="isAdmin" />
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { ElInput, ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { formatDateTime, formatJsonArray, formatTaskStatus, formatTaskType, getTaskStatusTagType, getTaskStatusTagStyle } from '../utils/patchProcessLogs'
import { isApprovalExpired, isFutureSchedule, isPackageInstallFinished } from '../utils/patchInstallSchedule'
import PatchTaskFailedHostsDialog from './patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import PatchChangeControlDialog from './change-control/PatchChangeControlDialog.vue'
import { useSecopsMessages } from '../utils/secopsMessages'

const props = defineProps({ isAdmin: Boolean })
useSecopsMessages()
defineEmits(['detail'])
const status = ref('PENDING_APPROVAL')
const statuses = [
  { value: 'PENDING_APPROVAL', get label() { return t('patches.linux.pendingApproval') } },
  { value: 'CREATED', get label() { return t('patches.linux.createdWaiting') } },
  { value: 'REJECTED', get label() { return t('patches.linux.approvalRejected') } },
  { value: 'EXPIRED', get label() { return t('patches.linux.expired') } }
]
const rows = ref([])
const actionColumnWidth = computed(() => {
  if (currentLocale.value !== 'en-US') return 270
  const hasMoreActions = rows.value.some(row =>
    row.taskType !== 'rollback' || (props.isAdmin && row.status === 'PENDING_APPROVAL')
  )
  return hasMoreActions ? 128 : 88
})
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const approving = ref(false)
const configVisible = ref(false)
const failedHostsVisible = ref(false)
const failedHostsTaskId = ref('')
let requestId = 0
let timer

function openFailedHosts(task) {
  failedHostsTaskId.value = String(task.id || task.taskId || '')
  failedHostsVisible.value = true
}

async function load() {
  const id = ++requestId
  loading.value = true
  try {
    const response = await patchInstallApi.listTasks({ status: status.value, page: page.value - 1, size: 20 })
    if (id !== requestId) return
    rows.value = response?.data?.content || []
    total.value = response?.data?.totalElements || 0
  } catch (error) {
    if (id === requestId) ElMessage.error(error?.message || t('patches.linux.installTasksFailed'))
  } finally {
    if (id === requestId) loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function approve(task, approved) {
  if (!props.isAdmin || approving.value || task.status !== 'PENDING_APPROVAL' ||
    (approved && isApprovalExpired(task))) return
  approving.value = true
  try {
    const presetHosts = ref('')
    const prompt = t('patches.linux.approvalPrompt', {
      applicant: task.createdBy || '-',
      time: formatDateTime(task.scheduledTime || task.planStartTime)
    })
    const allowPreset = approved && !String(task.osType || '').toLowerCase().includes('win')
    const { value } = await ElMessageBox.prompt(
      allowPreset ? () => h('div', [
        h('p', prompt),
        task.applyReason ? h('p', task.applyReason) : null,
        h('label', [
          t('patches.changeControl.approvalHosts'),
          h(ElInput, {
            modelValue: presetHosts.value,
            'onUpdate:modelValue': value => { presetHosts.value = value },
            placeholder: t('patches.changeControl.hostsPlaceholder')
          })
        ]),
        h('p', t('patches.changeControl.approvalComment'))
      ]) : prompt,
      approved ? t('patches.linux.approveInstall') : t('patches.linux.rejectInstall'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: approved ? t('patches.linux.confirmApprove') : t('patches.linux.confirmReject'),
        get cancelButtonText() { return t('common.cancel') },
        inputType: 'textarea'
      }
    )
    const inspectionHostIds = [...new Set(presetHosts.value.split(/[\s,，]+/).filter(Boolean))]
    await patchInstallApi.approveTask(task.id, {
      approved, comment: value || '', ...(allowPreset && inspectionHostIds.length && { inspectionHostIds })
    })
    ElMessage.success(approved ? t('patches.linux.approvedWaiting') : t('patches.linux.installRejected'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || t('patches.linux.approvalFailed'))
    }
  } finally {
    approving.value = false
    await load()
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => {
    const hasDueTask = rows.value.some(task =>
      !isPackageInstallFinished(task.status) &&
      (task.status === 'PENDING_APPROVAL' || !isFutureSchedule(task.scheduledTime))
    )
    if (!loading.value && !approving.value && hasDueTask) load()
  }, 15000)
})
onUnmounted(() => {
  clearInterval(timer)
  requestId += 1
})
</script>
<style scoped>
.package-task-actions.is-english {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
</style>
