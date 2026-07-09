<template>
  <el-dialog
    v-model="dialogVisible"
    title="审批详情"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px" size="default">
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
        <span>{{ approveData.validHour }} 小时</span>
        <el-tooltip content="审批通过后，在有效期内可以执行运维工具" placement="top">
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help" />
        </el-tooltip>
      </el-form-item>

      <el-form-item label="描述">
        <span>{{ approveData.description || '-' }}</span>
      </el-form-item>

      <!-- <el-form-item label="申请人" v-if="approveData.applicant">
        <span>{{ approveData.applicant }}</span>
      </el-form-item>

      <el-form-item label="申请时间" v-if="approveData.applyTime">
        <span>{{ formatDateTime(approveData.applyTime) }}</span>
      </el-form-item> -->

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

function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
