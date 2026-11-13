<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('automation.workbench.toolApprovals')"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :label-width="currentLocale === 'en-US' ? '180px' : '120px'" size="default">
      <el-form-item :label="t('automation.list.toolName')">
        <span>{{ getAutomationToolTitle({ id: jobId, title: jobTitle }) }}</span>
      </el-form-item>

      <el-form-item :label="t('automation.list.approvalMode')" required>
        <el-radio-group v-model="formData.approveMode">
          <el-radio value="noLimitParams">{{ t('automation.list.unrestrictedParams') }}</el-radio>
          <el-radio value="limitParams" v-if="hasParams">{{ t('automation.list.restrictedParams') }}</el-radio>
        </el-radio-group>

        <div
          v-if="formData.approveMode === 'limitParams' && hasParams"
          style="margin-top: 12px; padding-left: 20px"
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

      <el-form-item :label="t('automation.job.scriptPath')" v-if="scriptPaths.length > 0">
        <div v-for="(scriptPath, index) in scriptPaths" :key="index" style="margin-bottom: 8px">
          <el-button type="primary" link @click="handleViewScript(scriptPath)">
            <i class="fa fa-eye" />
            {{ scriptPath }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item :label="t('automation.list.validDuration')" v-if="formData.approveMode !== 'limitParams'">
        <el-input-number
          v-model="formData.validHour"
          :min="1"
          :max="999"
          :step="1"
          controls-position="right"
        />
        <span style="margin-left: 8px">{{ t('automation.list.hours') }}</span>
        <el-tooltip :content="t('automation.list.approvalValidityHint')" placement="top">
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help" />
        </el-tooltip>
      </el-form-item>

      <el-form-item :label="t('automation.list.requestDescription')">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          :placeholder="t('automation.list.requestDescriptionPlaceholder')"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ t('automation.list.submitRequest') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getAutomationToolTitle } from '@/modules/automation/utils/resourcePresentation'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  visible: { type: Boolean, default: false },
  jobId: { type: String, required: true },
  jobTitle: { type: String, default: '' },
  appletCode: { type: String, default: '' },
  params: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const scriptPaths = ref([])

const formData = reactive({
  jobId: '',
  params: null,
  approveMode: 'noLimitParams',
  validHour: 1,
  description: ''
})

const paramsArray = computed(() => {
  if (!props.params || typeof props.params !== 'object') return []
  return Object.entries(props.params).map(([name, value]) => ({ name, value }))
})

const hasParams = computed(() => paramsArray.value.length > 0)

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
  formData.jobId = props.jobId
  formData.params = null
  formData.approveMode = 'noLimitParams'
  formData.validHour = 1
  formData.description = ''

  // 获取脚本路径
  if (props.jobId) {
    jaoApi
      .getScriptPath(props.jobId)
      .then(data => {
        scriptPaths.value = data || []
      })
      .catch(() => {
        scriptPaths.value = []
      })
  }

}

function handleViewScript(scriptPath) {
  ElMessage.info(t('automation.list.viewScriptPending'))
}

async function handleSubmit() {
  if (!formData.approveMode) {
    ElMessage.warning(t('automation.list.approvalModeRequired'))
    return
  }

  submitting.value = true

  try {
    const payload = {
      jobId: props.jobId,
      approveMode: formData.approveMode,
      validHour: formData.validHour,
      description: formData.description
    }

    // 如果是限定参数模式，需要传递参数
    if (formData.approveMode === 'limitParams') {
      payload.params = JSON.stringify(paramsArray.value)
    } else {
      payload.params = null
    }

    await jaoApi.submitApprove(payload)
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
