<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="650px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="任务描述" prop="jobDesc">
        <el-input v-model="formData.jobDesc" placeholder="请输入任务描述" />
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
        <el-input v-model="formData.scheduleConf" placeholder="例: 0 0 12 * * ?">
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

      <el-form-item label="执行作业类型" prop="jobType">
        <el-select v-model="formData.jobType" placeholder="请选择作业类型" @change="handleJobTypeChange">
          <el-option label="" value="" />
          <el-option label="脚本任务" value="script" />
          <el-option label="REST接口" value="rest" />
          <el-option label="巡检任务" value="cac" />
          <el-option label="命令任务" value="cmd" />
          <el-option label="流程任务" value="flows" />
        </el-select>
      </el-form-item>

      <el-form-item label="选择执行作业" prop="jobId">
        <el-select
          v-if="!isMultipleJobType"
          v-model="formData.jobId"
          placeholder="请选择作业"
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
        <el-select
          v-else
          v-model="multipleJobIds"
          placeholder="请选择作业"
          multiple
          filterable
        >
          <el-option
            v-for="job in jobList"
            :key="job.id"
            :label="getJobLabel(job)"
            :value="job.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          v-if="formData.jobId || ['cmd', 'cac'].includes(formData.jobType)"
          @click="paramsDialogVisible = true"
        >
          运行参数
        </el-button>
        <div style="flex: 1"></div>
        <el-button @click="visible = false">
          取消
        </el-button>
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

    <!-- 运行参数对话框 -->
    <CronJobParamsDialog
      v-model="paramsDialogVisible"
      :params="jobParams"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Calendar, Operation, Back, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CronGeneratorDialog from '../CronGeneratorDialog.vue'
import CronJobParamsDialog from './CronJobParamsDialog.vue'
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
  set: (val) => emit('update:modelValue', val)
})

const title = computed(() => {
  return props.editingId ? `编辑CRON任务 ID: ${props.editingId}` : '新增CRON任务'
})

const cronGeneratorVisible = ref(false)
const paramsDialogVisible = ref(false)

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

/**
 * CRON 表达式生成器确认
 */
function handleCronConfirm(cronExpression) {
  formData.value.scheduleConf = cronExpression
  ElMessage.success('CRON表达式已设置')
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  align-items: center;
  width: 100%;
}
</style>
