<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="760px"
    class="cron-job-form-dialog"
    destroy-on-close
    :close-on-press-escape="false"
    :close-on-click-modal="false"
  >
    <el-alert
      v-if="initializationError"
      :title="initializationError"
      type="error"
      :closable="false"
    >
      <el-button link type="primary" @click="initializeFromJob">{{ t('automation.schedule.reloadTool') }}</el-button>
    </el-alert>
    <el-form
      ref="formRef"
      v-loading="initializing"
      :model="formData"
      :rules="formRules" :validate-on-rule-change="false"
      :disabled="initializing || !!initializationError"
      :label-width="currentLocale === 'en-US' ? '180px' : '140px'"
    >
      <h4 class="form-section__title">{{ t('automation.schedule.executionContent') }}</h4>
      <el-form-item :label="t('automation.schedule.taskName')" prop="jobDesc">
        <el-input v-model="formData.jobDesc" :placeholder="t('automation.schedule.taskNameExample')" maxlength="200" />
      </el-form-item>

      <el-form-item :label="t('automation.schedule.toolType')" prop="jobType">
        <el-select
          v-model="formData.jobType"
          :placeholder="t('automation.schedule.selectType')"
          clearable
          @change="handleJobTypeChange"
        >
          <el-option :label="t('automation.schedule.scriptTask')" value="script" />
          <el-option :label="t('automation.schedule.restApi')" value="rest" />
          <el-option :label="t('automation.schedule.inspectionTask')" value="audit" />
          <el-option :label="t('automation.schedule.commandTask')" value="cmd" />
          <el-option :label="t('automation.schedule.flowTask')" value="flows" />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('automation.schedule.executionTool')" prop="jobId">
        <el-select
          v-if="!isMultipleJobType"
          v-model="formData.jobId"
          :placeholder="t('automation.schedule.selectTool')"
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
        <el-select v-else v-model="multipleJobIds" :placeholder="t('automation.schedule.selectTool')" multiple filterable>
          <el-option
            v-for="job in jobList"
            :key="job.id"
            :label="getJobLabel(job)"
            :value="job.id"
          />
        </el-select>
      </el-form-item>

      <div class="form-section">
        <h4 class="form-section__title">{{ t('automation.schedule.executionTime') }}</h4>
        <el-form-item :label="t('automation.schedule.expression')" prop="scheduleConf">
          <el-input v-model="formData.scheduleConf" :placeholder="t('automation.schedule.expressionExample')" maxlength="100">
            <template #append>
              <el-button @click="cronGeneratorVisible = true" :icon="Calendar">{{ t('automation.schedule.generator') }}</el-button>
            </template>
          </el-input>
          <div class="form-help">
            <el-button
              link
              type="primary"
              :disabled="!formData.scheduleConf?.trim()"
              @click="nextTimeVisible = true"
            >
              {{ t('automation.schedule.previewTimes') }}
            </el-button>
            <span>{{ t('automation.schedule.previewHint') }}</span>
          </div>
        </el-form-item>
      </div>

      <div v-if="showParamsSection" class="form-section">
        <div class="form-section__header">
          <div>
            <h4 class="form-section__title">{{ t('automation.schedule.params') }}</h4>
            <p class="form-section__subtitle">{{ t('automation.schedule.paramsHint') }}</p>
          </div>
          <span class="form-section__count">{{ t('automation.schedule.itemCount', { count: jobParams.length }) }}</span>
        </div>
        <CronJobParamsSection :params="jobParams" />
      </div>

      <el-collapse v-model="expandedSections" class="advanced-settings">
        <el-collapse-item name="advanced">
          <template #title>
            <span>{{ t('automation.schedule.advancedSettings') }}</span>
            <span class="advanced-settings__summary">
              {{ formData.logOutput === '0' ? t('automation.schedule.outputLogs') : t('automation.schedule.noOutputLogs') }} ·
              {{ formData.isEncrypt === '0' ? t('automation.schedule.encryptParams') : t('automation.schedule.noEncryptParams') }}
            </span>
          </template>
          <el-form-item :label="t('automation.schedule.outputLogs')" prop="logOutput">
            <el-select v-model="formData.logOutput">
              <el-option :label="t('automation.schedule.noOutput')" value="1" />
              <el-option :label="t('automation.schedule.output')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('automation.schedule.encryptParams')" prop="isEncrypt">
            <el-select v-model="formData.isEncrypt">
              <el-option :label="t('automation.schedule.noEncryption')" value="1" />
              <el-option :label="t('automation.schedule.encryption')" value="0" />
            </el-select>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <div class="dialog-footer__spacer"></div>
        <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!isFormValid || initializing || !!initializationError"
          @click="handleSubmit"
        >
          {{ t('common.save') }}
        </el-button>
      </div>
    </template>

    <!-- CRON 表达式生成器 -->
    <CronGeneratorDialog
      v-model="cronGeneratorVisible"
      :initial-value="formData.scheduleConf"
      @confirm="handleCronConfirm"
    />
    <NextExecutionTimeDialog
      v-if="nextTimeVisible"
      v-model="nextTimeVisible"
      :schedule-conf="formData.scheduleConf"
      :empty-description="t('automation.schedule.noPreviewTimes')"
    />
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, computed, watch } from 'vue'
import { Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CronGeneratorDialog from '../CronGeneratorDialog.vue'
import CronJobParamsSection from './CronJobParamsSection.vue'
import NextExecutionTimeDialog from './NextExecutionTimeDialog.vue'
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
  initialJob: {
    type: Object,
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
  return props.editingId ? t('automation.schedule.editTask') : t('automation.schedule.newTask')
})

const cronGeneratorVisible = ref(false)
const nextTimeVisible = ref(false)
const expandedSections = ref([])

watch(
  () => [props.modelValue, props.editingId],
  () => {
    nextTimeVisible.value = false
  }
)

// 使用表单管理 composable
const {
  formRef,
  formData,
  formRules,
  submitting,
  initializing,
  initializationError,
  jobList,
  multipleJobIds,
  isMultipleJobType,
  jobParams,
  isFormValid,
  handleJobTypeChange,
  handleJobChange,
  getJobLabel,
  handleSubmit,
  initializeFromJob
} = useCronJobForm(props, emit)

const showParamsSection = computed(() => {
  const hasSelectedJob = isMultipleJobType.value
    ? multipleJobIds.value.length > 0
    : !!formData.value.jobId

  return (
    jobParams.value.length > 0 &&
    (hasSelectedJob || ['cmd', 'audit'].includes(formData.value.jobType))
  )
})

/**
 * CRON 表达式生成器确认
 */
function handleCronConfirm(cronExpression) {
  formData.value.scheduleConf = cronExpression
  ElMessage.success(t('automation.schedule.expressionSet'))
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
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.form-help {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.advanced-settings {
  margin-top: 20px;
}

.advanced-settings__summary {
  margin-left: 12px;
  font-size: 12px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
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
