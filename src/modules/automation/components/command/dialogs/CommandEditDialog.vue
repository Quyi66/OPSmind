<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="1000px"
    :close-on-click-modal="isViewMode"
    destroy-on-close
    @close="handleClose"
    :close-on-press-escape="isViewMode"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :validate-on-rule-change="false"
      :disabled="isViewMode"
      :label-width="currentLocale === 'en-US' ? '160px' : '100px'"
      label-position="left"
    >
      <el-form-item :label="t('automation.command.name')" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('automation.command.nameRequired')"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item :label="t('automation.command.syntaxType')" prop="type">
        <el-select v-model="formData.type" :placeholder="t('automation.command.syntaxTypeRequired')" style="width: 100%">
          <el-option v-for="type in commandTypes" :key="type" :label="type" :value="type" />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('automation.command.content')" prop="command">
        <div class="code-editor-wrapper">
          <div class="code-editor">
            <div class="line-numbers">
              <div v-for="n in commandLineCount" :key="n" class="line-number">{{ n }}</div>
            </div>
            <textarea
              v-model="formData.command"
              class="code-textarea"
              :disabled="isViewMode"
              :placeholder="t('automation.command.contentRequired')"
              @input="updateLineNumbers"
            />
          </div>
        </div>
      </el-form-item>

      <el-form-item :label="t('automation.job.description')" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          :placeholder="t('automation.command.descriptionOptional')"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <!-- 仅查看模式显示审核原因 -->
      <el-form-item v-if="isViewMode && formData.unapprovedReason" :label="t('automation.command.reviewReason')">
        <el-input v-model="formData.unapprovedReason" type="textarea" :rows="2" disabled />
      </el-form-item>

      <!-- 显示命令状态 -->
      <el-form-item v-if="isViewMode || isEditMode" :label="t('automation.workbench.status')">
        <el-tag :type="getStatusType(formData.status)" size="default">
          {{ getStatusText(formData.status) }}
        </el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <div v-if="isViewMode" class="footer-left">
          <el-button type="primary" @click="handleEdit">
            <i class="fas fa-edit"></i>
            {{ t('automation.command.edit') }}
          </el-button>
        </div>
        <div class="footer-right">
          <el-button @click="handleClose">
            {{ isViewMode ? t('common.close') : t('common.cancel') }}
          </el-button>
          <el-button v-if="!isViewMode" type="primary" :loading="saving" @click="handleSave">
            {{ t('common.save') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  saveCommand,
  findCommandById,
  COMMAND_TYPES,
  getCommandStatusInfo
} from '@/modules/automation/api/command'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create', // 'create', 'edit', 'view'
    validator: value => ['create', 'edit', 'view'].includes(value)
  },
  command: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

// 当前模式
const currentMode = ref(props.mode)
const isViewMode = computed(() => currentMode.value === 'view')
const isEditMode = computed(() => currentMode.value === 'edit')
const isCreateMode = computed(() => currentMode.value === 'create')

// 对话框标题
const dialogTitle = computed(() => {
  switch (currentMode.value) {
    case 'create':
      return t('automation.command.new')
    case 'edit':
      return t('automation.command.edit')
    case 'view':
      return t('automation.command.details')
    default:
      return t('automation.command.commands')
  }
})

// 计算命令行数
const commandLineCount = computed(() => {
  if (!formData.value.command) return 8
  return Math.max(formData.value.command.split('\n').length + 1, 8)
})

// 更新行号
function updateLineNumbers() {
  // 行号会自动通过 computed 更新
}

// 命令类型
const commandTypes = COMMAND_TYPES

// 表单引用
const formRef = ref(null)
useLocalizedValidation(formRef)

// 表单数据
const formData = ref({
  id: null,
  name: '',
  type: '',
  command: '',
  description: '',
  status: 1,
  unapprovedCommand: '',
  unapprovedReason: ''
})

// 表单验证规则
const formRules = computed(() => ({
  name: [
    { required: true, message: t('automation.command.nameRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('automation.command.nameLength'), trigger: 'blur' }
  ],
  type: [{ required: true, message: t('automation.command.syntaxTypeRequired'), trigger: 'change' }],
  command: [{ required: true, message: t('automation.command.contentRequired'), trigger: 'blur' }]
}))

// 保存状态
const saving = ref(false)

// 监听 props 变化
watch(
  () => props.visible,
  async val => {
    if (val) {
      currentMode.value = props.mode
      if (props.command) {
        await loadCommandData()
      } else {
        resetForm()
      }
    }
  }
)

// 加载命令数据
async function loadCommandData() {
  if (!props.command?.id) {
    // 新建模式或无ID
    Object.assign(formData.value, props.command || {})
    return
  }

  try {
    const response = await findCommandById(props.command.id)
    const data = response.data || response

    // 处理待审核或审核失败状态的命令
    if (data.status === 1 || data.status === 2) {
      // 显示待审核的命令内容
      data.command = data.unapprovedCommand || data.command
    }

    Object.assign(formData.value, data)
  } catch (error) {
    console.error('加载命令详情失败:', error)
    ElMessage.error(t('automation.command.detailFailed'))
    // 使用传入的数据
    Object.assign(formData.value, props.command)
  }
}

// 重置表单
function resetForm() {
  formData.value = {
    id: null,
    name: '',
    type: '',
    command: '',
    description: '',
    status: 1,
    unapprovedCommand: '',
    unapprovedReason: ''
  }
  formRef.value?.clearValidate()
}

// 切换到编辑模式
function handleEdit() {
  currentMode.value = 'edit'
}

// 保存命令
async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const command = { ...formData.value }

    if (isCreateMode.value) {
      // 新建命令
      command.unapprovedCommand = command.command
      command.command = null
      command.status = 1 // 待审核
    } else {
      // 编辑命令
      const oldCommand = props.command?.command
      command.unapprovedCommand = command.command
      command.command = oldCommand
      command.status = 1 // 修改后需要重新审核
    }

    await saveCommand(command)
    ElMessage.success(isCreateMode.value ? t('automation.command.createdForReview') : t('automation.command.updatedForReview'))
    emit('success')
    handleClose()
  } catch (error) {
    console.error('保存命令失败:', error)
    ElMessage.error(t('automation.command.saveFailed'))
  } finally {
    saving.value = false
  }
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  resetForm()
}

// 获取状态类型
function getStatusType(status) {
  const info = getCommandStatusInfo(status)
  return info.type
}

// 获取状态文本
function getStatusText(status) {
  const info = getCommandStatusInfo(status)
  return info.text
}
</script>

<style scoped lang="scss">
.code-editor-wrapper {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
}

.code-editor {
  display: flex;
  background: #282c34;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow: hidden;
}

.line-numbers {
  padding: 12px 8px;
  background: #21252b;
  color: var(--el-text-color-regular);
  text-align: right;
  user-select: none;
  min-width: 40px;
  border-right: 1px solid #181a1f;
}

.line-number {
  height: 20.8px;
}

.code-textarea {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: var(--el-text-color-secondary);
  resize: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  min-height: 400px;
  white-space: pre;
  overflow-x: auto;

  &::placeholder {
    color: var(--el-text-color-regular);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
