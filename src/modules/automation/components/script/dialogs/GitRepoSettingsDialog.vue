<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? t('automation.library.editSettings') : t('automation.library.settings')"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <!-- 说明信息 -->
    <el-alert type="success" :closable="false" class="mb-4">
      <p class="help-text">
        <strong>{{ t('automation.library.settingsDescriptionLabel') }}</strong>
        {{ t('automation.library.settingsHint') }}
      </p>
    </el-alert>

    <el-form ref="formRef" :model="form" :rules="rules" :validate-on-rule-change="false" :label-width="currentLocale === 'en-US' ? '180px' : '120px'">
      <!-- 认证方式 -->
      <el-form-item :label="t('automation.library.authMethod')" prop="authType">
        <el-tooltip placement="top">
          <template #content>
            <div style="max-width: 300px">
              {{ t('automation.library.httpsHint') }}
              <br />
              {{ t('automation.library.sshHint') }}
            </div>
          </template>
          <el-radio-group v-model="form.authType">
            <el-radio value="https">HTTPS</el-radio>
            <el-radio value="ssh">SSH</el-radio>
          </el-radio-group>
        </el-tooltip>
      </el-form-item>

      <!-- 仓库名 -->
      <el-form-item :label="t('automation.library.repoName')" prop="repoName">
        <el-tooltip :content="t('automation.library.repoNameHint')" placement="top">
          <el-input v-model="form.repoName" :disabled="!form.canEdit" :placeholder="t('automation.library.repoNamePlaceholder')" />
        </el-tooltip>
      </el-form-item>

      <!-- 同步策略 -->
      <el-form-item :label="t('automation.library.syncPolicy')" prop="jobInterval">
        <el-tooltip :content="t('automation.library.syncMinutesHint')" placement="top">
          <div class="interval-input">
            <el-input-number
              v-model="form.jobInterval"
              :min="0"
              :max="60"
              controls-position="right"
            />
            <span class="interval-unit">{{ t('automation.library.minutes') }}</span>
          </div>
        </el-tooltip>
      </el-form-item>

      <!-- Git库地址 -->
      <el-form-item :label="t('automation.library.repoUrl')" prop="repoUrl">
        <el-tooltip :content="t('automation.library.repoUrlHint')" placement="top">
          <el-input
            v-model="form.repoUrl"
            :disabled="!form.canEdit"
            :placeholder="
              form.authType === 'ssh'
                ? 'git@github.com:user/repo.git'
                : 'https://github.com/user/repo.git'
            "
          />
        </el-tooltip>
      </el-form-item>

      <!-- SSH 认证 -->
      <template v-if="form.authType === 'ssh'">
        <el-form-item :label="t('automation.library.keyPath')">
          <div class="key-file-info">
            ~&nbsp;&nbsp;/&nbsp;&nbsp;
            <strong>{{ form.authFile?.name || t('automation.library.notSelected') }}</strong>
          </div>
        </el-form-item>
        <el-form-item :label="t('automation.library.selectKeyFile')" prop="authFile">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleKeyFileChange"
            accept="*"
          >
            <el-button type="primary" plain>
              <i class="fa fa-file-upload" />
              {{ t('automation.library.privateKeyFile') }}
            </el-button>
          </el-upload>
        </el-form-item>
      </template>

      <!-- HTTPS 认证 -->
      <template v-if="form.authType === 'https'">
        <el-form-item :label="t('automation.library.repoAccount')" prop="authName">
          <el-tooltip :content="t('automation.library.repoAccountHint')" placement="top">
            <el-input v-model="form.authName" :placeholder="t('automation.library.username')" />
          </el-tooltip>
        </el-form-item>
        <el-form-item :label="t('automation.library.repoPassword')" prop="authPass">
          <el-tooltip :content="t('automation.library.repoPasswordHint')" placement="top">
            <el-input
              v-model="form.authPass"
              type="password"
              :placeholder="t('automation.library.password')"
              show-password
              autocomplete="new-password"
            />
          </el-tooltip>
        </el-form-item>
      </template>
    </el-form>

    <!-- 进度条 -->
    <el-progress
      v-if="progress > 0 && progress < 100"
      :percentage="progress"
      :stroke-width="8"
      class="mt-4"
    />

    <template #footer>
      <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" :disabled="!isFormValid" @click="handleSave">
        {{ t('automation.file.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'

import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success', 'closed'])

const dialogVisible = ref(false)
const formRef = ref(null)
useLocalizedValidation(formRef)
const saving = ref(false)
const progress = ref(0)

const form = ref({
  authType: 'https',
  repoName: '',
  jobInterval: 10,
  repoUrl: '',
  authName: '',
  authPass: '',
  authFile: null,
  canEdit: true
})

const rules = computed(() => ({
  repoUrl: [{ required: true, message: t('automation.library.repoUrlRequired'), trigger: 'blur' }],
  authName: [{ required: true, message: t('automation.library.repoAccountRequired'), trigger: 'blur' }],
  authPass: [{ required: true, message: t('automation.library.repoPasswordRequired'), trigger: 'blur' }]
}))

// 是否编辑模式
const isEdit = computed(() => !!props.editData?.id)

// 表单是否有效
const isFormValid = computed(() => {
  if (!form.value.repoUrl) return false
  if (form.value.authType === 'https') {
    return form.value.authName && form.value.authPass
  } else {
    return !!form.value.authFile
  }
})

// 同步 v-model
watch(
  () => props.modelValue,
  val => {
    dialogVisible.value = val
    if (val) {
      initForm()
    }
  }
)

watch(dialogVisible, val => {
  emit('update:modelValue', val)
})

// 初始化表单
function initForm() {
  progress.value = 0
  if (props.editData) {
    form.value = {
      ...props.editData,
      jobInterval: parseInt(props.editData.jobInterval) || 10,
      authFile: null
    }
  } else {
    form.value = {
      authType: 'https',
      repoName: '',
      jobInterval: 10,
      repoUrl: '',
      authName: '',
      authPass: '',
      authFile: null,
      canEdit: true
    }
  }
}

// 密钥文件选择
function handleKeyFileChange(file) {
  form.value.authFile = file.raw
}

// 保存
async function handleSave() {
  if (!isFormValid.value) return

  // 确认提示
  try {
    await ElMessageBox.confirm(
      t('automation.library.externalSyncConfirm', { url: form.value.repoUrl }),
      t('automation.library.externalSyncTitle'),
      {
        closeOnClickModal: false,
        closeOnPressEscape: false,
        type: 'warning'
      }
    )
  } catch {
    return
  }

  saving.value = true
  progress.value = 0

  try {
    const formData = new FormData()
    formData.append('authType', form.value.authType)
    formData.append('repoUrl', form.value.repoUrl)
    formData.append('jobInterval', form.value.jobInterval)
    if (form.value.repoName) {
      formData.append('repoName', form.value.repoName)
    }

    if (form.value.authType === 'https') {
      formData.append('authName', form.value.authName)
      formData.append('authPass', form.value.authPass)
    } else if (form.value.authFile) {
      formData.append('authFile', form.value.authFile)
    }

    await gfsApi.initGitRepo(props.repo, formData, p => {
      progress.value = p
    })

    ElMessage.success(t('automation.library.externalInitialized'))
    emit('success')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.externalInitFailed'))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭
function handleClosed() {
  formRef.value?.resetFields()
  emit('closed')
}
</script>

<style scoped>
.help-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}

.interval-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-unit {
  color: var(--el-text-color-regular);
}

.key-file-info {
  color: var(--el-text-color-regular);
}

.key-file-info strong {
  color: var(--el-text-color-primary);
}
</style>
