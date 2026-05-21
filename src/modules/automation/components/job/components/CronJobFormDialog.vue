<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="760px"
    class="cron-job-form-dialog"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
      <el-form-item label="任务描述" prop="jobDesc">
        <el-input v-model="formData.jobDesc" placeholder="请输入任务描述" maxlength="200" />
      </el-form-item>

      <el-form-item label="是否输出日志" prop="logOutput">
        <el-select v-model="formData.logOutput" placeholder="请选择">
          <el-option label="否" value="1" />
          <el-option label="是" value="0" />
        </el-select>
      </el-form-item>

      <el-form-item label="是否参数加密" prop="isEncrypt">
        <el-select v-model="formData.isEncrypt" placeholder="请选择">
          <el-option label="否" value="1" />
          <el-option label="是" value="0" />
        </el-select>
      </el-form-item>

      <el-form-item label="CRON表达式" prop="scheduleConf">
        <el-input v-model="formData.scheduleConf" placeholder="例: 0 0 12 * * ?" maxlength="100">
          <template #append>
            <el-button @click="cronGeneratorVisible = true" :icon="Calendar">生成器</el-button>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="应用资源" prop="appCode">
        <el-select v-model="formData.appCode" placeholder="请选择应用资源" clearable filterable>
          <el-option label="" value="" />
          <el-option
            v-for="app in appletsList"
            :key="app.name"
            :label="app.displayTitle || app.title || app.name"
            :value="app.name"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="执行运维工具类型" prop="jobType">
        <el-select
          v-model="formData.jobType"
          placeholder="请选择运维工具类型"
          @change="handleJobTypeChange"
        >
          <el-option label="" value="" />
          <el-option label="脚本任务" value="script" />
          <el-option label="REST接口" value="rest" />
          <el-option label="巡检任务" value="cac" />
          <el-option label="命令任务" value="cmd" />
          <el-option label="流程任务" value="flows" />
        </el-select>
      </el-form-item>

      <el-form-item label="选择执行运维工具" prop="jobId">
        <el-select
          v-if="!isMultipleJobType"
          v-model="formData.jobId"
          placeholder="请选择运维工具"
          filterable
          @change="handleJobChange"
        >
          <el-option
            v-for="job in jobList"
            :key="job.id"
            :label="getJobLabel(job)"
            :value="job.id"
          />
        </el-select>
        <el-select v-else v-model="multipleJobIds" placeholder="请选择运维工具" multiple filterable>
          <el-option
            v-for="job in jobList"
            :key="job.id"
            :label="getJobLabel(job)"
            :value="job.id"
          />
        </el-select>
      </el-form-item>

      <div v-if="showParamsSection" class="form-section">
        <div class="form-section__header">
          <div>
            <h4 class="form-section__title">运行参数</h4>
            <p class="form-section__subtitle">以下参数会与当前定时任务一并保存</p>
          </div>
          <span class="form-section__count">{{ jobParams.length }} 项</span>
        </div>
        <CronJobParamsSection :params="jobParams" />
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <div class="dialog-footer__spacer"></div>
        <el-button @click="visible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          保存
        </el-button>
      </div>
    </template>

    <!-- CRON 表达式生成器 -->
    <CronGeneratorDialog
      v-model="cronGeneratorVisible"
      :initial-value="formData.scheduleConf"
      @confirm="handleCronConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CronGeneratorDialog from '../CronGeneratorDialog.vue'
import CronJobParamsSection from './CronJobParamsSection.vue'
import { useCronJobForm } from '../composables/useCronJobForm'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editingId: {
    type: [String, Number],
    default: null
  },
  appletsList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const title = computed(() => {
  return props.editingId ? `编辑CRON任务 ID: ${props.editingId}` : '新增CRON任务'
})

const cronGeneratorVisible = ref(false)

// 使用表单管理 composable
const {
  formRef,
  formData,
  formRules,
  submitting,
  jobList,
  multipleJobIds,
  isMultipleJobType,
  jobParams,
  isFormValid,
  handleJobTypeChange,
  handleJobChange,
  getJobLabel,
  handleSubmit
} = useCronJobForm(props, emit)

const showParamsSection = computed(() => {
  const hasSelectedJob = isMultipleJobType.value
    ? multipleJobIds.value.length > 0
    : !!formData.value.jobId

  return (
    jobParams.value.length > 0 &&
    (hasSelectedJob || ['cmd', 'cac'].includes(formData.value.jobType))
  )
})

/**
 * CRON 表达式生成器确认
 */
function handleCronConfirm(cronExpression) {
  formData.value.scheduleConf = cronExpression
  ElMessage.success('CRON表达式已设置')
}
</script>

<style scoped>
.cron-job-form-dialog :deep(.el-dialog__body) {
  max-height: 68vh;
  overflow-y: auto;
  padding-top: 18px;
}

.dialog-footer {
  display: flex;
  align-items: center;
  width: 100%;
}

.dialog-footer__spacer {
  flex: 1;
}

.form-section {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.form-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 14px;
  padding: 10px 0 2px;
}

.form-section__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.form-section__subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-section__count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
