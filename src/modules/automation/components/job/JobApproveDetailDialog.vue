<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('automation.approval.requestTitle')"
    width="600px"
    :close-on-click-modal="!canEdit"
    @close="handleClose"
    :close-on-press-escape="!canEdit"
  >
    <el-form ref="formRef" :model="formData" :label-width="currentLocale === 'en-US' ? '180px' : '120px'" size="default">
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
        <el-input-number
          v-model="formData.validHour"
          :min="1"
          :max="999"
          :step="1"
          :disabled="!canEdit"
          controls-position="right"
        />
        <span style="margin-left: 8px">{{ t('automation.list.hours') }}</span>
        <el-tooltip :content="t('automation.list.approvalValidityHint')" placement="top">
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help" />
        </el-tooltip>
      </el-form-item>

      <el-form-item :label="t('automation.job.description')">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          :disabled="!canEdit"
          :placeholder="t('automation.list.requestDescriptionPlaceholder')"
        />
      </el-form-item>

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
      <el-button v-if="canEdit" type="primary" :loading="submitting" @click="handleResubmit">
        {{ t('automation.list.submitRequest') }}
      </el-button>
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
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/modules/automation/utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'
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
      approver: '',
      approveTime: '',
      expirationTime: '',
      status: 0,
      params: null
    })
  }
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const jobDialogVisible = ref(false)

const formData = reactive({
  validHour: 1,
  description: ''
})

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

// 判断是否可以编辑和重新提交（状态为未通过或作废时可编辑）
const canEdit = computed(() => {
  return props.approveData.status === 2 || props.approveData.status === 3
})

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
    if (val) {
      initForm()
    }
  },
  { immediate: true }
)

watch(
  dialogVisible,
  val => {
    if (!val) {
      emit('update:visible', false)
    }
  },
  { immediate: true }
)

function initForm() {
  formData.validHour = props.approveData.validHour || 1
  formData.description = props.approveData.description || ''
}

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

async function handleResubmit() {
  if (!canEdit.value) {
    ElMessage.warning(t('automation.approval.resubmitUnavailable'))
    return
  }

  submitting.value = true

  try {
    const payload = {
      jobId: props.approveData.jobId,
      approveMode: props.approveData.approveMode,
      validHour: formData.validHour,
      description: formData.description
    }

    // 如果是限定参数模式，需要传递参数
    if (props.approveData.approveMode === 'limitParams') {
      payload.params = props.approveData.params
    } else {
      payload.params = null
    }

    await jaoApi.submitApprove(payload)
    ElMessage.success(t('automation.approval.resubmitted'))
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error?.message || t('automation.list.submitFailed'))
  } finally {
    submitting.value = false
  }
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
