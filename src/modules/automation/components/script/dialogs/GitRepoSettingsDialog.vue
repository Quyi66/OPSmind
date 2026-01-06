<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑脚本库设定' : '脚本库设定'"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <!-- 说明信息 -->
    <el-alert
      type="success"
      :closable="false"
      class="mb-4"
    >
      <p class="help-text">
        <strong>说明：</strong>用于指定脚本库，oplus内置脚本库无需该设定，如需指定外部Git库
        （目前支持Github、Bitbucket、Gitlab、Gitee、Coding），按照以下指定方式配置Oplus同步外部Git库，
        该设定会清空当前已存在脚本库中所有内容，请详细阅读说明后再使用！！
      </p>
    </el-alert>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <!-- 认证方式 -->
      <el-form-item label="Git库认证方式" prop="authType">
        <el-tooltip placement="top">
          <template #content>
            <div style="max-width: 300px">
              HTTPS：基于用户名密码安全认证<br/>
              SSH：基于RSA非对称加密，将自定义生成公钥上传Git库中，将私钥上传Oplus平台
            </div>
          </template>
          <el-radio-group v-model="form.authType">
            <el-radio value="https">HTTPS</el-radio>
            <el-radio value="ssh">SSH</el-radio>
          </el-radio-group>
        </el-tooltip>
      </el-form-item>

      <!-- 仓库名 -->
      <el-form-item label="仓库名" prop="repoName">
        <el-tooltip content="用户指定生成的Git仓库名，未指定则会自动生成仓库名" placement="top">
          <el-input
            v-model="form.repoName"
            :disabled="!form.canEdit"
            placeholder="请输入仓库名"
          />
        </el-tooltip>
      </el-form-item>

      <!-- 同步策略 -->
      <el-form-item label="同步策略" prop="jobInterval">
        <el-tooltip content="设定自动从远程Git服务器拉取最新更新间隔时间(范围10~60)" placement="top">
          <div class="interval-input">
            <el-input-number
              v-model="form.jobInterval"
              :min="0"
              :max="60"
              controls-position="right"
            />
            <span class="interval-unit">分钟</span>
          </div>
        </el-tooltip>
      </el-form-item>

      <!-- Git库地址 -->
      <el-form-item label="Git库地址" prop="repoUrl">
        <el-tooltip content="用于配置外部Git库地址，目前支持Github、Bitbucket、Gitlab、Gitee、Coding" placement="top">
          <el-input
            v-model="form.repoUrl"
            :disabled="!form.canEdit"
            :placeholder="form.authType === 'ssh' ? 'git@github.com:user/repo.git' : 'https://github.com/user/repo.git'"
          />
        </el-tooltip>
      </el-form-item>

      <!-- SSH 认证 -->
      <template v-if="form.authType === 'ssh'">
        <el-form-item label="密钥文件路径">
          <div class="key-file-info">
            ~&nbsp;&nbsp;/&nbsp;&nbsp;<strong>{{ form.authFile?.name || '未选择' }}</strong>
          </div>
        </el-form-item>
        <el-form-item label="选择密钥文件" prop="authFile">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleKeyFileChange"
            accept="*"
          >
            <el-button type="primary" plain>
              <i class="fa fa-file-upload" /> 选择密钥&lt;私钥&gt;文件
            </el-button>
          </el-upload>
        </el-form-item>
      </template>

      <!-- HTTPS 认证 -->
      <template v-if="form.authType === 'https'">
        <el-form-item label="Git库账户" prop="authName">
          <el-tooltip content="用于外部Git库认证的用户名" placement="top">
            <el-input v-model="form.authName" placeholder="请输入用户名" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Git库密码" prop="authPass">
          <el-tooltip content="用于外部Git库认证的用户名密码" placement="top">
            <el-input
              v-model="form.authPass"
              type="password"
              placeholder="请输入密码"
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
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!isFormValid"
        @click="handleSave"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
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

const rules = {
  repoUrl: [{ required: true, message: '请输入Git库地址', trigger: 'blur' }],
  authName: [{ required: true, message: '请输入Git库账户', trigger: 'blur' }],
  authPass: [{ required: true, message: '请输入Git库密码', trigger: 'blur' }]
}

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
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    initForm()
  }
})

watch(dialogVisible, (val) => {
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
      `确认同步 ${form.value.repoUrl} 到Oplus脚本库中？`,
      '外部Git库同步确认',
      { type: 'warning' }
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

    await gfsApi.initGitRepo(props.repo, formData, (p) => {
      progress.value = p
    })

    ElMessage.success('初始化外部Git库成功')
    emit('success')
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error?.message || '初始化外部Git库失败')
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
  color: #606266;
}

.key-file-info {
  color: #606266;
}

.key-file-info strong {
  color: #1e293b;
}
</style>
