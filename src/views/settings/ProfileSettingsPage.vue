<template>
  <div class="profile-page" v-loading="loading">
    <div class="profile-container">
      <el-row :gutter="20">
        <!-- 左侧：个人信息卡片 -->
        <el-col :span="8">
          <div class="profile-card info-card">
            <h3 class="card-title">个人信息</h3>

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
                  用户名称
                </span>
                <span class="info-value">{{ account.login }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Phone /></el-icon>
                  手机号码
                </span>
                <span class="info-value">{{ originalData.mobile || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Message /></el-icon>
                  用户邮箱
                </span>
                <span class="info-value">{{ originalData.email || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><OfficeBuilding /></el-icon>
                  所属部门
                </span>
                <span class="info-value">{{ originalData.department || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Medal /></el-icon>
                  拥有角色
                </span>
                <span class="info-value">
                  <template v-if="roleNames.length > 0">
                    {{ roleNames.join('、') }}
                  </template>
                  <template v-else>-</template>
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">
                  <el-icon><Calendar /></el-icon>
                  创建日期
                </span>
                <span class="info-value">{{ formatDate(account.createdDate) }}</span>
              </div>
            </div>
          </div>
        </el-col>

        <!-- 右侧：Tab 切换区域 -->
        <el-col :span="16">
          <div class="profile-card form-card">
            <h3 class="card-title">基本资料</h3>

            <el-tabs v-model="activeTab" class="profile-tabs">
              <!-- 基本资料 Tab -->
              <el-tab-pane label="基本资料" name="profile">
                <el-form
                  ref="formRef"
                  :model="form"
                  :rules="rules"
                  label-width="100px"
                  label-position="left"
                  class="profile-form"
                >
                  <el-form-item label="用户昵称" prop="fullName">
                    <el-input v-model="form.fullName" placeholder="请输入用户昵称" maxlength="50" />
                  </el-form-item>

                  <el-form-item label="手机号码" prop="mobile">
                    <el-input v-model="form.mobile" placeholder="请输入手机号码" maxlength="50" />
                  </el-form-item>

                  <el-form-item label="邮箱" prop="email">
                    <el-input v-model="form.email" placeholder="请输入邮箱" maxlength="100" />
                  </el-form-item>

                  <el-form-item label="部门" prop="department">
                    <el-input v-model="form.department" placeholder="请输入部门" maxlength="500" />
                  </el-form-item>

                  <!-- <el-form-item label="语言" prop="langKey">
                    <el-select v-model="form.langKey" style="width: 200px">
                      <el-option label="中文简体" value="zh-cn" />
                      <el-option label="English" value="en" />
                    </el-select>
                  </el-form-item> -->

                  <el-form-item>
                    <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
                    <el-button @click="handleReset">关闭</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>

              <!-- 修改密码 Tab -->
              <el-tab-pane label="修改密码" name="password" :disabled="authMode === 'AD'">
                <el-form
                  ref="passwordFormRef"
                  :model="passwordForm"
                  :rules="passwordRules"
                  label-width="100px"
                  label-position="left"
                  class="profile-form"
                >
                  <el-form-item label="新密码" prop="password">
                    <el-input
                      v-model="passwordForm.password"
                      type="password"
                      placeholder="请输入新密码"
                      show-password
                      maxlength="32"
                      autocomplete="new-password"
                    />
                    <div class="form-hint">密码长度8-32位，建议包含大小写字母和数字</div>
                  </el-form-item>

                  <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      placeholder="请再次输入新密码"
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
                      保存
                    </el-button>
                    <el-button @click="handleReset">关闭</el-button>
                  </el-form-item>
                </el-form>
              </el-tab-pane>

              <!-- OTP 二维码 Tab -->
              <el-tab-pane label="OTP二维码" name="qrcode" :disabled="authMode === 'AD'">
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
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Phone, Message, OfficeBuilding, Medal, Calendar } from '@element-plus/icons-vue'
import { apiService } from '@/core/api'

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

const rules = {
  fullName: [
    { required: true, message: '请输入用户昵称', trigger: 'blur' },
    { min: 1, max: 50, message: '用户昵称长度为1-50个字符', trigger: 'blur' }
  ],
  email: [{ type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 32, message: '密码长度为8-32位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

function getUploadBaseUrl() {
  // 文件上传服务基础路径
  return '/sjxy-upload'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
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
    ElMessage.error('加载用户信息失败')
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
    ElMessage.success('保存成功')
    loadAccount()
  } catch (error) {
    console.error('Failed to save account:', error)
    ElMessage.error('保存失败')
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
    ElMessage.warning('图片大小不能超过20MB')
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

      ElMessage.success('头像上传成功，请点击保存按钮保存更改')
    } else {
      ElMessage.error(data.message || '头像上传失败')
    }
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    ElMessage.error('头像上传失败')
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
    ElMessage.success('密码修改成功')
    resetPasswordForm()
  } catch (error) {
    console.error('Failed to change password:', error)
    ElMessage.error('密码修改失败')
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
