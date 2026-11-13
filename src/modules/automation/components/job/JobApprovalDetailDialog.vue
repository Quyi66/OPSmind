<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('automation.approval.detailTitle')"
    width="600px"
    :close-on-click-modal="true"
    @close="handleClose"
  >
    <el-form :label-width="currentLocale === 'en-US' ? '180px' : '120px'" size="default">
      <el-form-item :label="t('automation.list.toolName')">
        <span>{{ getAutomationToolTitle({ jobId: approveData.jobId, title: approveData.jobName }) }}</span>
      </el-form-item>

      <el-form-item :label="t('automation.approval.executionPolicy')">
        <span>{{ getApproveModeLabel(approveData.approveMode) }}</span>

        <div
          v-if="approveData.approveMode === 'limitParams' && paramsArray.length > 0"
          style="margin-top: 12px"
        >
          <el-tag
            v-for="(param, index) in paramsArray"
            :key="index"
            style="margin-bottom: 8px; max-width: 100%; display: block; white-space: pre-wrap"
          >
            {{ param.name }} : {{ param.value }}
          </el-tag>
        </div>
      </el-form-item>

      <el-form-item :label="t('automation.types.script')">
        <el-button type="primary" @click="handleViewJob" size="small">
          <i class="fa fa-eye" />
          {{ t('automation.approval.view') }}
        </el-button>
      </el-form-item>

      <el-form-item :label="t('automation.list.validDuration')" v-if="approveData.approveMode !== 'limitParams'">
        <span>{{ approveData.validHour }} {{ t('automation.list.hours') }}</span>
        <el-tooltip :content="t('automation.list.approvalValidityHint')" placement="top">
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help" />
        </el-tooltip>
      </el-form-item>

      <el-form-item :label="t('automation.job.description')">
        <span>{{ approveData.description || '-' }}</span>
      </el-form-item>

      <!-- <el-form-item label="申请人" v-if="approveData.applicant">
        <span>{{ approveData.applicant }}</span>
      </el-form-item>

      <el-form-item label="申请时间" v-if="approveData.applyTime">
        <span>{{ formatDateTime(approveData.applyTime) }}</span>
      </el-form-item> -->

      <el-form-item :label="t('automation.approval.approver')" v-if="approveData.approver">
        <span>{{ approveData.approver }}</span>
      </el-form-item>

      <el-form-item :label="t('automation.approval.approvedAt')" v-if="approveData.approveTime">
        <span>{{ formatDateTime(approveData.approveTime) }}</span>
      </el-form-item>

      <el-form-item :label="t('automation.approval.expiresAt')" v-if="approveData.expirationTime && approveData.status > 0">
        <span>{{ formatExpirationTime(approveData.expirationTime) }}</span>
      </el-form-item>

      <el-form-item :label="t('automation.workbench.status')">
        <el-tag :type="getStatusType(approveData.status)">
          {{ getStatusLabel(approveData.status) }}
        </el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.close') }}</el-button>
    </template>

    <!-- 作业详情弹窗 -->
    <CreateJobDialog
      v-if="jobDialogVisible"
      v-model="jobDialogVisible"
      :job-id="approveData.jobId"
      :applet-code="approveData.appletCode"
      :applets-list="[]"
      :view-mode="true"
    />
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { getAutomationToolTitle } from '@/modules/automation/utils/resourcePresentation'
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/modules/automation/utils/helpers'
import CreateJobDialog from './JobListView/CreateJobDialog.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  approveData: {
    type: Object,
    default: () => ({
      id: '',
      jobId: '',
      jobName: '',
      jobType: '',
      appletCode: '',
      approveMode: '',
      validHour: 1,
      description: '',
      applicant: '',
      applyTime: '',
      approver: '',
      approveTime: '',
      expirationTime: '',
      status: 0,
      params: null
    })
  }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = ref(false)
const jobDialogVisible = ref(false)

const approveModeMap = computed(() => ({
  limitParams: t('automation.list.restrictedParams'),
  noLimitParams: t('automation.list.unrestrictedParams')
}))

const statusMap = computed(() => ({
  0: { label: t('automation.approval.pending'), type: 'primary' },
  1: { label: t('automation.approval.approved'), type: 'success' },
  2: { label: t('automation.approval.rejected'), type: 'danger' },
  3: { label: t('automation.approval.discarded'), type: 'info' }
}))

const paramsArray = computed(() => {
  if (!props.approveData.params) return []
  try {
    const parsed =
      typeof props.approveData.params === 'string'
        ? JSON.parse(props.approveData.params)
        : props.approveData.params
    if (Array.isArray(parsed)) {
      return parsed
    }
    return Object.entries(parsed).map(([name, value]) => ({ name, value }))
  } catch {
    return []
  }
})

watch(
  () => props.visible,
  val => {
    dialogVisible.value = val
  },
  { immediate: true }
)

watch(dialogVisible, val => {
  if (!val) {
    emit('update:visible', false)
  }
})

function getApproveModeLabel(mode) {
  return approveModeMap.value[mode] || '-'
}

function getStatusLabel(status) {
  return statusMap.value[status]?.label || '-'
}

function getStatusType(status) {
  return statusMap.value[status]?.type || 'info'
}



function formatExpirationTime(value) {
  if (!value) return '-'
  if (value === 'expired') return t('automation.approval.expired')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function handleViewJob() {
  if (!props.approveData.jobId) {
    ElMessage.warning(t('automation.list.missingTool'))
    return
  }
  jobDialogVisible.value = true
}

function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
