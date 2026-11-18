<template>
  <div class="ops-action-bar">
    <el-button v-if="isAdmin" type="primary" size="small" :icon="Setting" @click="configVisible = true">
      {{ t('patches.changeControl.title') }}
    </el-button>
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
      <el-table-column :label="t('patches.windows.taskType')" min-width="142">
        <template #default="{ row }">{{ formatTaskType(row.taskType) }}</template>
      </el-table-column>
      <el-table-column :label="t('patches.linux.package')" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.packages) || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('execution.ui.targetHost')" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.hostIds) || '-' }}</template>
      </el-table-column>
      <el-table-column v-if="rows.some(row => row.scheduledTime)" :label="t('patches.linux.scheduledTime')" width="180">
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
          <div class="package-task-actions">
            <el-button text type="primary" size="small" @click="$emit('detail', row)">{{ t('automation.records.details') }}</el-button>
            <el-button
              v-if="canViewPatchTaskFailedHosts(row)"
              text
              type="primary"
              size="small"
              @click="openFailedHosts(row)"
            >
              {{ t('patches.linux.failedHosts') }}
            </el-button>
            <template v-if="canReview(row)">
              <el-button text type="success" size="small" :disabled="approving || isApprovalExpired(row)" @click="openReview(row, true)">{{ t('automation.workbench.approve') }}</el-button>
              <el-button text type="danger" size="small" :disabled="approving" @click="openReview(row, false)">{{ t('patches.linux.reject') }}</el-button>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <div class="ops-pagination-wrapper">
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" background @current-change="load" />
  </div>
  <PatchTaskFailedHostsDialog v-model="failedHostsVisible" :task-id="failedHostsTaskId" />
  <PatchChangeControlDialog v-if="configVisible && isAdmin" v-model="configVisible" :is-admin="isAdmin" />
  <el-dialog
    v-if="review"
    v-model="reviewVisible"
    class="patch-approval-dialog"
    :title="t(review.approved ? 'patches.linux.approveInstall' : 'patches.linux.rejectInstall')"
    width="min(560px, calc(100vw - 32px))"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!approving"
  >
    <el-form label-position="top" :disabled="approving">
      <p class="patch-approval-context">
        <strong>{{ t('patches.linux.applicantLabel') }}</strong> {{ review.task.createdBy || '-' }}
      </p>
      <p v-if="review.task.scheduledTime" class="patch-approval-context">
        <strong>{{ t('patches.linux.scheduledTimeLabel') }}</strong> {{ formatDateTime(review.task.scheduledTime) }}
      </p>
      <p v-if="review.task.planStartTime || review.task.planEndTime" class="patch-approval-context">
        <strong>{{ t('patches.changeControl.plan') }}</strong>
        {{ formatDateTime(review.task.planStartTime) }} – {{ formatDateTime(review.task.planEndTime) }}
      </p>
      <p v-if="canPresetInspection && review.task.applyReason" class="patch-approval-context">
        {{ review.task.applyReason }}
      </p>
      <el-form-item v-if="canPresetInspection" :label="t('patches.changeControl.approvalHosts')">
        <AcmDeviceSelector
          v-model="review.inspectionHosts"
          ci-types="linux"
          :options="{ selectMode: 'host', selector: 'multiple', label: t('patches.changeControl.inspectionHosts') }"
          :disabled="approving"
        />
      </el-form-item>
      <el-form-item :label="t('patches.changeControl.approvalComment')">
        <el-input v-model="review.comment" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="approving" @click="reviewVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="approving" @click="submitReview">
        {{ t(review.approved ? 'patches.linux.confirmApprove' : 'patches.linux.confirmReject') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Setting } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { formatDateTime, formatJsonArray, formatTaskStatus, formatTaskType, getTaskStatusTagType, getTaskStatusTagStyle } from '../utils/patchProcessLogs'
import { canViewPatchTaskFailedHosts, isApprovalExpired, isFutureSchedule, isPackageInstallFinished } from '../utils/patchInstallSchedule'
import PatchTaskFailedHostsDialog from './patch-task/dialogs/PatchTaskFailedHostsDialog.vue'
import PatchChangeControlDialog from './change-control/PatchChangeControlDialog.vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
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
  const isEnglish = currentLocale.value === 'en-US'
  const hasReview = rows.value.some(canReview)
  if (hasReview) return isEnglish ? 184 : 136
  if (rows.value.some(canViewPatchTaskFailedHosts)) return isEnglish ? 160 : 128
  return isEnglish ? 88 : 72
})
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const approving = ref(false)
const reviewVisible = ref(false)
const review = ref(null)
const canPresetInspection = computed(() => review.value?.approved &&
  !String(review.value.task.osType || review.value.task.os_type || '').toLowerCase().includes('win'))
const configVisible = ref(false)
const failedHostsVisible = ref(false)
const failedHostsTaskId = ref('')
let requestId = 0
let timer

function canReview(task) {
  return props.isAdmin && task.status === 'PENDING_APPROVAL'
}

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

function openReview(task, approved) {
  if (!canReview(task) || reviewVisible.value || approving.value || (approved && isApprovalExpired(task))) return
  review.value = { task, approved, comment: '', inspectionHosts: [] }
  reviewVisible.value = true
}

async function submitReview() {
  if (!reviewVisible.value || approving.value || !review.value || !canReview(review.value.task)) return
  const { task, approved, comment, inspectionHosts } = review.value
  approving.value = true
  try {
    const inspectionHostIds = [...new Set(inspectionHosts.map(host => String(host.key ?? '')).filter(Boolean))]
    await patchInstallApi.approveTask(task.id, {
      approved, comment, ...(canPresetInspection.value && inspectionHostIds.length && { inspectionHostIds })
    })
    ElMessage.success(approved ? t('patches.linux.approvalSucceeded') : t('patches.linux.installRejected'))
    reviewVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || t('patches.linux.approvalFailed'))
  } finally {
    approving.value = false
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => {
    const hasDueTask = rows.value.some(task =>
      !isPackageInstallFinished(task.status) &&
      (task.status === 'PENDING_APPROVAL' || !isFutureSchedule(task.scheduledTime))
    )
    if (!loading.value && !reviewVisible.value && !approving.value && hasDueTask) load()
  }, 15000)
})
onUnmounted(() => {
  clearInterval(timer)
  requestId += 1
})
</script>
<style scoped>
.package-task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.package-task-actions :deep(.el-button.is-text) {
  margin-left: 0;
}

.patch-approval-context {
  margin: 0 0 12px;
  overflow-wrap: anywhere;
}
</style>
