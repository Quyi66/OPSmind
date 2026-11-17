<template>
  <div class="profile-page" v-loading="loading">
    <div class="profile-container">
      <el-row :gutter="20">
        <!-- 左侧：个人信息卡片 -->
        <el-col :span="8">
          <div class="profile-card info-card">
            <h3 class="card-title">{{ t('profile.personalInfo') }}</h3>

            <!-- 头像 -->
            <div class="avatar-section">
              <el-upload
                class="avatar-uploader"
                action="#"
                :show-file-list="false"
                :auto-upload="false"
                :on-change="handleAvatarChange"
                accept="image/*"
              >
                <img v-if="avatarUrl" :src="avatarUrl" class="avatar" />
                <div v-else class="avatar-placeholder">
                  <el-icon size="48"><User /></el-icon>
                </div>
              </el-upload>
            </div>

            <!-- 信息列表 -->
            <div class="info-list">
              <div class="info-row">
                <span class="info-label">
                  <el-icon><User /></el-icon>
                  {{ t('profile.username') }}
                </span>
                <span class="info-value">{{ account.login }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Phone /></el-icon>
                  {{ t('profile.mobile') }}
                </span>
                <span class="info-value">{{ originalData.mobile || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Message /></el-icon>
                  {{ t('profile.userEmail') }}
                </span>
                <span class="info-value">{{ originalData.email || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><OfficeBuilding /></el-icon>
                  {{ t('profile.departmentInfo') }}
                </span>
                <span class="info-value">{{ originalData.department || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Medal /></el-icon>
                  {{ t('profile.roles') }}
                </span>
                <span class="info-value">
                  <template v-if="roleNames.length > 0">
                    {{ roleNames.join(t('common.listSeparator')) }}
                  </template>
                  <template v-else>-</template>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Calendar /></el-icon>
                  {{ t('profile.createdAt') }}
                </span>
                <span class="info-value">{{ formatDate(account.createdDate) }}</span>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 右侧：Tab 切换区域 -->
        <el-col :span="16">
          <div class="profile-card form-card">
            <h3 class="card-title">{{ t('profile.basicInfo') }}</h3>

            <el-tabs v-model="activeTab" class="profile-tabs">
              <!-- 基本资料 Tab -->
              <el-tab-pane :label="t('profile.basicInfo')" name="profile">
                <el-form
                  ref="formRef"
                  :model="form"
                  :rules="rules"
                  :validate-on-rule-change="false"
                  :label-width="currentLocale === 'en-US' ? '160px' : '100px'"
                  label-position="left"
                  class="profile-form"
                >
                  <el-form-item :label="t('profile.nickname')" prop="fullName">
                    <el-input v-model="form.fullName" :placeholder="t('profile.nicknameRequired')" maxlength="50" />
                  </el-form-item>

                  <el-form-item :label="t('profile.mobile')" prop="mobile">
                    <el-input v-model="form.mobile" :placeholder="t('profile.mobilePlaceholder')" maxlength="50" />
                  </el-form-item>

                  <el-form-item :label="t('profile.email')" prop="email">
                    <el-input v-model="form.email" :placeholder="t('profile.emailPlaceholder')" maxlength="100" />
                  </el-form-item>

                  <el-form-item :label="t('profile.department')" prop="department">
                    <el-input v-model="form.department" :placeholder="t('profile.departmentPlaceholder')" maxlength="500" />
                  </el-form-item>

                  <!-- <el-form-item label="语言" prop="langKey">
                    <el-select v-model="form.langKey" style="width: 200px">
                      <el-option label="中文简体" value="zh-cn" />
                      <el-option label="English" value="en" />
                    </el-select>
                  </el-form-item> -->

                  <el-form-item>
                    <el-button type="primary" @click="handleSave" :loading="saving">{{ t('common.save') }}</el-button>
                    <el-button @click="handleReset">{{ t('common.close') }}</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>

              <!-- 修改密码 Tab -->
              <el-tab-pane :label="t('profile.changePassword')" name="password" :disabled="authMode === 'AD'">
                <el-form
                  ref="passwordFormRef"
                  :model="passwordForm"
                  :rules="passwordRules"
                  :validate-on-rule-change="false"
                  :label-width="currentLocale === 'en-US' ? '160px' : '100px'"
                  label-position="left"
                  class="profile-form"
                >
                  <!-- 隐藏的用户名输入框，用于提升无障碍访问和协助密码管理器 -->
                  <el-input
                    v-model="account.login"
                    autocomplete="username"
                    style="position: absolute; top: -9999px; left: -9999px; width: 0; height: 0; opacity: 0;"
                  />

                  <el-form-item :label="t('profile.newPassword')" prop="password">
                    <el-input
                      v-model="passwordForm.password"
                      type="password"
                      :placeholder="t('profile.passwordRequired')"
                      show-password
                      maxlength="32"
                      autocomplete="new-password"
                    />
                    <div class="form-hint">{{ t('profile.passwordHint') }}</div>
                  </el-form-item>

                  <el-form-item :label="t('profile.confirmPassword')" prop="confirmPassword">
                    <el-input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      :placeholder="t('profile.confirmRequired')"
                      show-password
                      maxlength="32"
                      autocomplete="new-password"
                    />
                  </el-form-item>

                  <el-form-item>
                    <el-button
                      type="primary"
                      @click="handleChangePassword"
                      :loading="changingPassword"
                    >
                      {{ t('common.save') }}
                    </el-button>
                    <el-button @click="handleReset">{{ t('common.close') }}</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>

              <!-- OTP 二维码 Tab -->
              <!-- <el-tab-pane label="OTP二维码" name="qrcode" :disabled="authMode === 'AD'">
                <div class="qrcode-section">
                  <div class="qrcode-info">
                    <p>
                      使用 Google Authenticator 或其他 OTP
                      验证器扫描此二维码，绑定您的账户进行两步验证。
                    </p>
                  </div>
                  <div class="qrcode-wrapper">
                    <img v-if="qrcodeUrl" :src="qrcodeUrl" class="qrcode-image" />
                    <el-empty v-else description="暂无二维码" :image-size="100" />
                  </div>
                </div>
              </el-tab-pane> -->
            </el-tabs>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'

import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Phone, Message, OfficeBuilding, Medal, Calendar } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'
import { accountService } from '@/core/account'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)
const formRef = ref(null)
const passwordFormRef = ref(null)
const avatarUrl = ref('')
const qrcodeUrl = ref('')
const authMode = ref('')
const activeTab = ref('profile')

const account = reactive({
  login: '',
  createdDate: '',
  roles: []
})

const form = reactive({
  fullName: '',
  department: '',
  email: '',
  mobile: '',
  langKey: 'zh-cn',
  imageUrl: ''
})

// 原始数据（用于左侧信息卡片显示）
const originalData = reactive({
  fullName: '',
  department: '',
  email: '',
  mobile: ''
})

const passwordForm = reactive({
  password: '',
  confirmPassword: ''
})

// 角色名称列表
const roleNames = computed(() => {
  if (!account.roles || account.roles.length === 0) return []
  return account.roles.map(role => role.description || role.name)
})

const rules = computed(() => ({
  fullName: [
    { required: true, message: t('profile.nicknameRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('profile.nicknameLength'), trigger: 'blur' }
  ],
  email: [{ type: 'email', message: t('profile.emailInvalid'), trigger: 'blur' }]
}))

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.password) {
    callback(new Error(t('profile.passwordMismatch')))
  } else {
    callback()
  }
}

const passwordRules = computed(() => ({
  password: [
    { required: true, message: t('profile.passwordRequired'), trigger: 'blur' },
    { min: 8, max: 32, message: t('profile.passwordLength'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('profile.confirmRequired'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}))

// Refresh already-visible errors without validating untouched fields or changing drafts.
watch(
  currentLocale,
  () => {
    for (const instance of [formRef.value, passwordFormRef.value]) {
      const invalid = instance?.fields
        ?.filter(field => field.validateState === 'error')
        .map(field => field.prop)
      if (invalid?.length) void instance.validateField(invalid).catch(() => {})
    }
  },
  { flush: 'post' }
)

function getUploadBaseUrl() {
  // 文件上传服务基础路径
  return '/sjxy-upload'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString(currentLocale.value, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  loadAccount()
})

async function loadAccount() {
  loading.value = true
  try {
    const response = await apiService.get('/api/account')
    const data = response?.data || response

    account.login = data.login || ''
    account.createdDate = data.createdDate || ''
    account.roles = data.roles || []
    authMode.value = data.authMode || ''

    form.fullName = data.fullName || ''
    form.department = data.department || ''
    form.email = data.email || ''
    form.mobile = data.mobile || ''
    form.langKey = data.langKey || 'zh-cn'
    form.imageUrl = data.imageUrl || ''

    // 保存原始数据用于左侧卡片显示
    originalData.fullName = data.fullName || ''
    originalData.department = data.department || ''
    originalData.email = data.email || ''
    originalData.mobile = data.mobile || ''

    if (data.imageUrl) {
      avatarUrl.value = getUploadBaseUrl() + data.imageUrl
    }

    if (data.qrcodeImagePath) {
      qrcodeUrl.value = getUploadBaseUrl() + data.qrcodeImagePath
    }
  } catch (error) {
    console.error('Failed to load account:', error)
    ElMessage.error(t('profile.loadFailed'))
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    let finalImageUrl = form.imageUrl

    // 如果有新上传的头像，先调用 confirm 接口确认上传
    if (tempAvatarFileId.value) {
      const confirmResponse = await apiService.put('/api/upload/confirm', {
        module: 'portal',
        category: 'avatar',
        params: [tempAvatarFileId.value]
      })

      const confirmData = confirmResponse?.data || confirmResponse
      if (confirmData.status === 'success' && confirmData.data && confirmData.data.length > 0) {
        finalImageUrl = confirmData.data[0].path
        // 清除临时文件 ID
        tempAvatarFileId.value = ''
      }
    }

    // 保存账户信息
    await apiService.post('/api/account', {
      ...form,
      login: account.login,
      imageUrl: finalImageUrl
    })
    // 强制刷新本地 session 缓存中的账号信息，并通知 TopNavMenu 更新头像和名字
    await accountService.getAccount({ forceRefresh: true }).catch(() => null)
    window.dispatchEvent(new CustomEvent('account-updated'))

    ElMessage.success(t('profile.saved'))
    loadAccount()
  } catch (error) {
    console.error('Failed to save account:', error)
    ElMessage.error(t('profile.saveFailed'))
  } finally {
    saving.value = false
  }
}

function handleReset() {
  router.push('/home')
}

const uploadingAvatar = ref(false)
const tempAvatarFileId = ref('')
const tempAvatarPath = ref('')

async function handleAvatarChange(file) {
  if (file.raw.size > 20 * 1024 * 1024) {
    ElMessage.warning(t('profile.avatarSize'))
    return
  }

  uploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('action', 'preUpload')
    formData.append('module', 'portal')
    formData.append('category', 'avatar')
    formData.append('params[0]', file.raw)

    const response = await apiService.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    const data = response?.data || response
    if (data.status === 'success' && data.data && data.data.length > 0) {
      const uploadedFile = data.data[0]
      tempAvatarFileId.value = uploadedFile.id
      tempAvatarPath.value = uploadedFile.path

      // 更新头像预览（使用临时路径）
      avatarUrl.value = `${getUploadBaseUrl()}/temp${uploadedFile.path}`

      // 更新表单中的 imageUrl
      form.imageUrl = uploadedFile.path

      ElMessage.success(t('profile.avatarUploaded'))
    } else {
      ElMessage.error(data.message || t('profile.avatarFailed'))
    }
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    ElMessage.error(t('profile.avatarFailed'))
  } finally {
    uploadingAvatar.value = false
  }
}

async function handleChangePassword() {
  try {
    await passwordFormRef.value?.validate()
  } catch {
    return
  }

  changingPassword.value = true
  try {
    await apiService.post('/api/account/change-password', passwordForm.password, {
      headers: {
        'Content-Type': 'text/plain'
      },
      transformRequest: [data => data]
    })
    ElMessage.success(t('profile.passwordChanged'))
    resetPasswordForm()
  } catch (error) {
    console.error('Failed to change password:', error)
    ElMessage.error(t('profile.passwordFailed'))
  } finally {
    changingPassword.value = false
  }
}

function resetPasswordForm() {
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.resetFields()
}
</script>

<style scoped lang="scss">
.profile-page {
  min-height: calc(100vh - 120px);
  background: var(--el-bg-color);
  padding: 20px;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

.profile-card {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  // box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  box-shadow: var(--el-box-shadow-light);
  height: 100%;
  border: 1px solid var(--el-border-color-light);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

/* 左侧信息卡片 */
.info-card {
  .avatar-section {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }

  .avatar-uploader {
    :deep(.el-upload) {
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      border: 2px dashed var(--el-border-color-light);
      transition: border-color 0.3s;

      &:hover {
        border-color: #409eff;
      }
    }
  }

  .avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--el-bg-color-page);
    color: var(--el-text-color-secondary);
  }
}

.info-list {
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
      border-bottom: none;
    }
  }

  .info-label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    .el-icon {
      font-size: 14px;
    }
  }

  .info-value {
    font-size: 14px;
    color: var(--el-text-color-regular);
    text-align: right;
    word-break: break-all;
    max-width: 60%;
  }
}

/* 右侧表单区域 */
.form-card {
  min-height: 500px;
}

.profile-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
  }
}

.profile-form {
  max-width: 500px;

  .el-form-item {
    margin-bottom: 20px;
  }
}

.form-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* OTP 二维码区域 */
.qrcode-section {
  text-align: center;
  padding: 20px 0;
}

.qrcode-info {
  margin-bottom: 20px;

  p {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin: 0;
  }
}

.qrcode-wrapper {
  display: flex;
  justify-content: center;
}

.qrcode-image {
  max-width: 200px;
  max-height: 200px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 10px;
  background: var(--el-bg-color);
}
</style>
