<template>
  <AcmDeviceSelectorDialog
    v-if="!isCreateJobMode"
    v-model="dialogVisible"
    ci-types="linux"
    :initial-selection="formData.hosts"
    :options="{ selectMode: 'host,group,tag,input,recently', selector: 'multiple' }"
    :title="t('automation.command.deviceRunTitle')"
    :confirm-text="t('automation.command.execute')"
    :description="executionDescription"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleRunCommand"
  >
    <template #context>
      <CommandExecutionPreview :commands="commandList" />
    </template>
  </AcmDeviceSelectorDialog>
  <el-dialog
    v-else
    v-model="dialogVisible"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
    :close-on-press-escape="false"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" :validate-on-rule-change="false" :label-width="currentLocale === 'en-US' ? '160px' : '100px'">
      <!-- 创建作业时需要填写标题和描述 -->
      <template v-if="isCreateJobMode">
        <el-form-item :label="t('automation.command.toolTitle')" prop="title">
          <el-input
            v-model="formData.title"
            :placeholder="t('automation.command.toolTitleRequired')"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('automation.command.toolDescription')" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            :placeholder="t('automation.command.optionalToolDescription')"
          />
        </el-form-item>
      </template>

      <!-- 命令信息 -->
      <el-form-item :label="t('automation.command.selectedCommands')">
        <div class="selected-commands">
          <el-tag v-for="cmd in commandList" :key="cmd.id" type="info" class="command-tag">
            {{ cmd.name }}
          </el-tag>
        </div>
      </el-form-item>

      <!-- 主机选择 -->
      <el-form-item :label="t('automation.command.targetHosts')" prop="hosts" required>
        <AcmDeviceSelector
          v-model="formData.hosts"
          ci-types="linux"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: t('automation.command.selectHosts')
          }"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
      <el-button
        v-if="isCreateJobMode"
        type="primary"
        :loading="submitting"
        :disabled="formData.hosts.length === 0"
        @click="handleSaveJob"
      >
        {{ t('automation.command.saveTool') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { runJobByRequest, saveJob } from '@/modules/automation/api/command'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import CommandExecutionPreview from './CommandExecutionPreview.vue'
import {
  buildCommandJobConfig,
  buildDynamicCommandRunRequest
} from '@/modules/automation/components/command/commandJob.utils'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  command: {
    type: [Object, Array],
    default: null
  },
  mode: {
    type: String,
    default: 'run', // 'run' 或 'createJob'
    validator: value => ['run', 'createJob'].includes(value)
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

// 是否创建作业模式
const isCreateJobMode = computed(() => props.mode === 'createJob')

// 对话框标题
const dialogTitle = computed(() => {
  return isCreateJobMode.value ? t('automation.command.createCommandTool') : t('automation.command.execute')
})

// 命令列表（支持单个或多个命令）
const commandList = computed(() => {
  if (!props.command) return []
  return Array.isArray(props.command) ? props.command : [props.command]
})

const executionDescription = computed(
  () =>
    t('automation.command.runDescription', { commands: commandList.value.map(cmd => cmd.name).join(t('common.listSeparator')) })
)

// 表单引用
const formRef = ref(null)
useLocalizedValidation(formRef)

// 表单数据
const formData = reactive({
  title: '',
  description: '',
  hosts: []
})

// 表单验证规则
const formRules = computed(() => ({
  title: isCreateJobMode.value
    ? [{ required: true, message: t('automation.command.toolTitleRequired'), trigger: 'blur' }]
    : [],
  hosts: [
    {
      validator: (rule, value, callback) => {
        const hostList = Array.isArray(value) ? value.filter(Boolean) : []
        if (hostList.length === 0) {
          callback(new Error(t('automation.command.selectOneHost')))
        } else {
          callback()
        }
      },
      trigger: ['change', 'blur']
    }
  ]
}))

// 提交状态
const submitting = ref(false)

// 选择主机后清除校验错误
watch(
  () => formData.hosts,
  () => formRef.value?.clearValidate('hosts'),
  { deep: true }
)

// 监听对话框打开
watch(
  () => props.visible,
  val => {
    if (val) {
      resetForm()
      // 如果是创建作业模式，默认使用命令名称作为标题
      if (isCreateJobMode.value && commandList.value.length === 1) {
        formData.title = t('automation.command.defaultToolTitle', { name: commandList.value[0].name })
      }
    }
  }
)

// 重置表单
function resetForm() {
  formData.title = ''
  formData.description = ''
  formData.hosts = []
  formRef.value?.clearValidate()
}

// 执行命令
async function handleRunCommand(selection = formData.hosts) {
  if (submitting.value) return
  formData.hosts = [...selection]
  if (!formData.hosts.length) {
    ElMessage.warning(t('automation.command.selectOneHost'))
    return
  }

  submitting.value = true
  try {
    const response = await runJobByRequest(
      buildDynamicCommandRunRequest(commandList.value, formData.hosts, 'linux')
    )
    const result = response.data || response
    const runResult = Array.isArray(result) ? result[0] : result
    if (['FAILED', 'ERROR'].includes(runResult?.status)) {
      ElMessage.error(runResult.error || t('automation.command.executeFailed'))
      return
    }

    ElMessage.success(t('automation.command.submittedRecords'))
    emit('success', result)
    handleClose()
  } catch (error) {
    console.error('执行命令失败:', error)
    ElMessage.error(t('automation.command.executeFailedReason', { reason: error.message || t('automation.file.unknownError') }))
  } finally {
    submitting.value = false
  }
}

// 保存作业
async function handleSaveJob() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const job = {
      title: formData.title,
      description: formData.description,
      type: 'command',
      configJson: buildCommandJobConfig(commandList.value, formData.hosts, 'linux')
    }

    const response = await saveJob(job)
    const result = response.data || response

    ElMessage.success(t('automation.command.toolCreated'))
    emit('success', result)
    handleClose()
  } catch (error) {
    console.error('创建运维工具失败:', error)
    ElMessage.error(t('automation.command.createToolFailedReason', { reason: error.message || t('automation.file.unknownError') }))
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  resetForm()
}
</script>

<style scoped lang="scss">
.selected-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.command-tag {
  font-size: 13px;
}

.host-selector {
  width: 100%;
}

.select-device-btn {
  margin-bottom: 12px;

  .el-button {
    padding: 0;
  }
}

.host-list {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 12px;
  min-height: 60px;
}

.host-list-header {
  margin-bottom: 8px;

  .host-count {
    font-size: 13px;
    color: var(--el-text-color-regular);

    strong {
      color: var(--el-color-primary);
    }
  }
}

.host-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.no-hosts {
  padding: 24px;
  text-align: center;
  background: var(--el-fill-color-light);
  border-radius: 6px;

  .text-muted {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
  }
}

.me-1 {
  margin-right: 4px;
}
</style>
