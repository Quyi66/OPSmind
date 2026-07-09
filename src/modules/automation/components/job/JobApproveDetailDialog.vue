<template>
  <el-dialog
    v-model="dialogVisible"
    title="运维工具申请"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-width="120px" size="default">
      <el-form-item label="运维工具名称">
        <span>{{ approveData.jobName }}</span>
      </el-form-item>

      <el-form-item label="执行策略">
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

      <el-form-item label="脚本运维工具">
        <el-button type="primary" @click="handleViewJob" size="small">
          <i class="fa fa-eye" />
          查看
        </el-button>
      </el-form-item>

      <el-form-item label="有效时长" v-if="approveData.approveMode !== 'limitParams'">
        <el-input-number
          v-model="formData.validHour"
          :min="1"
          :max="999"
          :step="1"
          :disabled="!canEdit"
          controls-position="right"
        />
        <span style="margin-left: 8px">小时</span>
        <el-tooltip content="审批通过后，在有效期内可以执行运维工具" placement="top">
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help" />
        </el-tooltip>
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          :disabled="!canEdit"
          placeholder="请输入申请说明"
        />
      </el-form-item>

      <el-form-item label="审批人" v-if="approveData.approver">
        <span>{{ approveData.approver }}</span>
      </el-form-item>

      <el-form-item label="审批时间" v-if="approveData.approveTime">
        <span>{{ formatDateTime(approveData.approveTime) }}</span>
      </el-form-item>

      <el-form-item label="过期时间" v-if="approveData.expirationTime && approveData.status > 0">
        <span>{{ formatExpirationTime(approveData.expirationTime) }}</span>
      </el-form-item>

      <el-form-item label="状态">
        <el-tag :type="getStatusType(approveData.status)">
          {{ getStatusLabel(approveData.status) }}
        </el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button v-if="canEdit" type="primary" :loading="submitting" @click="handleResubmit">
        提交申请
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

const approveModeMap = {
  limitParams: '限定参数执行',
  noLimitParams: '不限定参数执行'
}

const statusMap = {
  0: { label: '审批中', type: 'primary' },
  1: { label: '审批通过', type: 'success' },
  2: { label: '审批未通过', type: 'danger' },
  3: { label: '审批作废', type: 'info' }
}

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
  return approveModeMap[mode] || '-'
}

function getStatusLabel(status) {
  return statusMap[status]?.label || '-'
}

function getStatusType(status) {
  return statusMap[status]?.type || 'info'
}



function formatExpirationTime(value) {
  if (!value) return '-'
  if (value === 'expired') return '已过期'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function handleViewJob() {
  if (!props.approveData.jobId) {
    ElMessage.warning('无法获取运维工具信息')
    return
  }
  jobDialogVisible.value = true
}

async function handleResubmit() {
  if (!canEdit.value) {
    ElMessage.warning('当前状态不允许重新提交')
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
    ElMessage.success('申请已重新提交')
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error?.message || '提交失败')
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
