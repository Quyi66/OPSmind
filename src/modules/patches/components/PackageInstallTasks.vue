<template>
  <div class="ops-action-bar">
    <el-select v-model="status" size="small" :aria-label="t('patches.linux.taskStatus')" style="width: 180px" @change="search">
      <el-option :label="t('patches.linux.allTasks')" value="" />
      <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>
    <span style="flex: 1" />
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
      <el-table-column :label="t('patches.linux.package')" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.packages) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('execution.ui.targetHost')" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.hostIds) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('patches.linux.scheduledTime')" width="180">
        <template #default="{ row }">{{ formatDateTime(row.scheduledTime) }}</template>
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
                    <el-dropdown-item :disabled="approving || !isFutureSchedule(row.scheduledTime)" @click="approve(row, true)">{{ t('automation.workbench.approve') }}</el-dropdown-item>
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
              <el-button text type="success" size="small" :disabled="approving || !isFutureSchedule(row.scheduledTime)" @click="approve(row, true)">{{ t('automation.workbench.approve') }}</el-button>
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
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { formatDateTime, formatJsonArray, formatTaskStatus, getTaskStatusTagType, getTaskStatusTagStyle } from '../utils/patchProcessLogs'
import { isFutureSchedule, isPackageInstallFinished } from '../utils/patchInstallSchedule'
import PatchTaskFailedHostsDialog from './patch-task/dialogs/PatchTaskFailedHostsDialog.vue'

const props = defineProps({ isAdmin: Boolean })
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
  if (!props.isAdmin || approving.value || task.status !== 'PENDING_APPROVAL') return
  approving.value = true
  try {
    const { value } = await ElMessageBox.prompt(
      t('patches.linux.approvalPrompt', { applicant: task.createdBy || '-', time: formatDateTime(task.scheduledTime) }),
      approved ? t('patches.linux.approveInstall') : t('patches.linux.rejectInstall'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        confirmButtonText: approved ? t('patches.linux.confirmApprove') : t('patches.linux.confirmReject'),
        get cancelButtonText() { return t('common.cancel') },
        inputType: 'textarea'
      }
    )
    await patchInstallApi.approveTask(task.id, { approved, comment: value || '' })
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
      !isPackageInstallFinished(task.status) && !isFutureSchedule(task.scheduledTime)
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
