<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="800px"
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="!saving"
    @close="handleClose"
  >
    <el-alert v-if="saveIssue" :title="saveIssue" type="warning" :closable="false" show-icon />
    <el-alert
      v-if="loadFailed"
      :title="t('settings.user.configFailed')"
      type="error"
      :closable="false"
    >
      <el-button
        :disabled="saving || detailsLoading || rolesLoading || appletsLoading"
        @click="retryLoad"
      >
        {{ t('settings.user.retryLoad') }}
      </el-button>
    </el-alert>
    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane :label="t('settings.user.basic')" name="basic">
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          :validate-on-rule-change="false"
          label-width="150px"
          :disabled="isViewMode || saving || !!createdUser || detailsLoading"
        >
          <el-form-item :label="t('common.username')" prop="login">
            <el-input v-model="form.login" :disabled="!!form.id" maxlength="50" />
          </el-form-item>
          <el-form-item :label="t('settings.user.fullName')" prop="fullName">
            <el-input v-model="form.fullName" maxlength="50" />
          </el-form-item>

          <!-- 修改密码 -->
          <template v-if="form.id && !isViewMode">
            <el-form-item>
              <el-link type="primary" @click="showPasswordEdit = !showPasswordEdit">
                {{ showPasswordEdit ? t('settings.user.cancelPassword') : t('settings.user.changePassword') }}
              </el-link>
            </el-form-item>
          </template>

          <template v-if="!createdUser && (showPasswordEdit || !form.id)">
            <el-form-item :label="t('common.password')" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                show-password
                autocomplete="new-password"
                maxlength="32"
              />
            </el-form-item>
            <el-form-item :label="t('settings.user.confirmPassword')" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                maxlength="32"
              />
            </el-form-item>
          </template>

          <!-- 其他信息 -->
          <el-collapse v-model="expandedInfo">
            <el-collapse-item :title="t('settings.user.otherInfo')" name="other">
              <el-form-item :label="t('settings.user.email')" prop="email">
                <el-input v-model="form.email" type="email" maxlength="100" />
              </el-form-item>
              <el-form-item :label="t('settings.user.department')">
                <el-input v-model="form.department" maxlength="100" />
              </el-form-item>
              <el-form-item :label="t('settings.user.mobile')">
                <el-input v-model="form.mobile" maxlength="20" />
              </el-form-item>
              <el-form-item :label="t('settings.user.phone')">
                <el-input v-model="form.telephoneNumber" maxlength="30" />
              </el-form-item>
              <el-form-item :label="t('common.status')">
                <el-switch
                  v-model="form.activated"
                  :disabled="!form.id"
                  :active-text="t('settings.user.activated')"
                  :inactive-text="t('settings.user.disabled')"
                />
              </el-form-item>
              <el-form-item :label="t('settings.user.authMode')">
                <el-radio-group v-model="form.authMode">
                  <el-radio value="LOCAL">{{ t('settings.user.localAuth') }}</el-radio>
                  <el-radio value="AD">Active Directory</el-radio>
                  <el-radio value="UN">{{ t('settings.user.unifiedAuth') }}</el-radio>
                  <el-radio value="MIX">{{ t('settings.user.mixedAuth') }}</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form>
      </el-tab-pane>

      <!-- 角色 -->
      <el-tab-pane :label="t('settings.user.roles')" name="roles">
        <el-checkbox-group
          v-model="selectedRoleIds"
          class="checkbox-grid"
          :disabled="isViewMode || saving || !!createdUser || rolesLoading"
        >
          <el-checkbox
            v-for="role in allRoles"
            :key="role.id"
            :value="role.id"
            v-loading="rolesLoading"
          >
            {{ role.description || role.name }}
          </el-checkbox>
        </el-checkbox-group>
      </el-tab-pane>

      <!-- 应用 -->
      <el-tab-pane :label="t('settings.user.applications')" name="applets">
        <div class="checkbox-grid" v-loading="appletsLoading">
          <el-checkbox
            v-for="applet in allApplets"
            :key="applet.id"
            v-model="applet._user_applet"
            :disabled="
              isViewMode ||
              saving ||
              appletsLoading ||
              loadFailed ||
              (!!createdUser && !createdUser.tenantUserId)
            "
          >
            {{ formatAppletTitle(applet) }}
          </el-checkbox>
        </div>
      </el-tab-pane>

      <!-- OTP 二维码 -->
      <el-tab-pane v-if="form.id" label="OTP" name="otp">
        <div class="otp-container">
          <div v-if="qrcodeStatus === 'loading'" v-loading="true" class="qrcode-loading"></div>
          <img v-else-if="qrcodeStatus === 'existed'" :src="qrcodeUrl" class="qrcode-image" />
          <div v-else-if="qrcodeStatus === 'unexisted'" class="qrcode-missing">
            <el-link v-if="!isViewMode" type="primary" @click="generateQRCode">
              {{ t('settings.user.qrRegenerateHint') }}
            </el-link>
            <span v-else>{{ t('settings.user.qrMissing') }}</span>
          </div>
          <div v-if="qrcodeStatus === 'existed' && !isViewMode" class="qrcode-actions">
            <el-button type="primary" @click="generateQRCode">{{ t('settings.user.regenerateQr') }}</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 权限 (仅查看模式) -->
      <el-tab-pane v-if="isViewMode" :label="t('settings.user.permissions')" name="permissions">
        <div class="permissions-grid">
          <el-tag
            v-for="(perm, idx) in userPermissions"
            :key="idx"
            size="small"
            class="permission-tag"
          >
            {{ perm.domain }}:{{ perm.action }}:{{ perm.target }}
          </el-tag>
        </div>
      </el-tab-pane>

      <!-- API Keys (仅查看模式) -->
      <el-tab-pane v-if="isViewMode" label="ApiKey" name="apikeys">
        <el-table :data="apiKeys" size="small" max-height="450px">
          <el-table-column prop="name" :label="t('common.name')" />
          <el-table-column prop="targetApi" :label="t('settings.user.targetApi')" min-width="200" />
          <el-table-column prop="expireTime" :label="t('settings.user.expiresAt')" width="180">
            <template #default="{ row }">
              {{ formatTime(row.expireTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="enabled" :label="t('common.status')" width="80" align="left">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
                {{ row.enabled ? t('settings.user.enable') : t('settings.user.disable') }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button :disabled="saving" @click="handleClose">
          {{ isViewMode || createdUser ? t('common.close') : t('common.cancel') }}
        </el-button>
        <el-button
          v-if="!isViewMode"
          type="primary"
          :loading="saving"
          :disabled="saveDisabled"
          @click="handleSave"
        >
          {{ createdUser ? t('settings.user.retryApps') : t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { useLocalizedValidation } from '@/core/i18n/validation'
import { message, messageRef } from '@/core/i18n/feedback'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'

const props = defineProps({
  modelValue: Boolean,
  user: Object,
  mode: {
    type: String,
    default: 'edit' // 'edit' | 'view' | 'create'
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isViewMode = computed(() => props.mode === 'view')

const dialogTitle = computed(() => {
  if (props.mode === 'view') return t('settings.user.details')
  if (props.mode === 'create') return t('settings.user.add')
  return t('settings.user.edit')
})

const formRef = ref(null)
const activeTab = ref('basic')
const showPasswordEdit = ref(false)
const expandedInfo = ref([])
const saving = ref(false)
const detailsLoading = ref(false)
const detailsError = ref(false)
const rolesError = ref(false)
const appletsError = ref(false)
const loadFailed = computed(() => detailsError.value || rolesError.value || appletsError.value)
const createdUser = ref(null)
const saveIssue = messageRef('')
let session = 0
let contextTenantId = ''
const currentTenantId = () => authService.getCurrentUser()?.tenantId || ''
const isCurrent = token =>
  token === session && props.modelValue && currentTenantId() === contextTenantId
const saveDisabled = computed(
  () =>
    saving.value ||
    detailsLoading.value ||
    rolesLoading.value ||
    appletsLoading.value ||
    loadFailed.value ||
    (!!createdUser.value && !createdUser.value.tenantUserId)
)

// 表单数据
const form = ref({
  id: null,
  login: '',
  fullName: '',
  password: '',
  confirmPassword: '',
  email: '',
  department: '',
  mobile: '',
  telephoneNumber: '',
  activated: true,
  authMode: 'LOCAL',
  tenantUserId: null
})

// 角色相关
const allRoles = ref([])
const selectedRoleIds = ref([])
const rolesLoading = ref(false)

// 应用相关
const allApplets = ref([])
const appletsLoading = ref(false)

// 权限和API Keys
const userPermissions = ref([])
const apiKeys = ref([])

// OTP 二维码相关
const qrcodeStatus = ref('loading') // 'loading' | 'existed' | 'unexisted'
const qrcodeUrl = ref('')

// 应用标题翻译映射
const appletTitleMap = {
  get '#{cac.index.square}'() { return t('settings.user.appInspection') },
  get '#{app_pms.title}'() { return t('settings.user.appPassword') },
  get '#{app_sudo.title}'() { return t('settings.user.appSudo') },
  get '#{acm.title}'() { return t('settings.user.appAsset') },
  get '#{app_vap.title}'() { return t('settings.user.appPatch') },
  get '#{app_spm.title}'() { return t('settings.user.appYum') },
  get '#{app_uim.name}'() { return t('settings.user.appUsers') }
}

function validatePasswordComplexity(rule, value, callback) {
  if (!value) {
    callback()
    return
  }

  const hasUppercase = /[A-Z]/.test(value)
  const hasLowercase = /[a-z]/.test(value)
  const hasDigit = /\d/.test(value)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value)

  if (hasUppercase && hasLowercase && hasDigit && hasSpecialChar) {
    callback()
    return
  }

  callback(new Error(t('settings.user.passwordComplexity')))
}

// 表单验证
useLocalizedValidation(formRef)

const formRules = computed(() => ({
  login: [
    { required: true, message: t('settings.user.enterLogin'), trigger: 'blur' },
    { min: 1, max: 50, message: t('settings.user.loginLength'), trigger: 'blur' },
    {
      pattern: /^[_'.A-Za-z0-9-]*$/,
      message: t('settings.user.loginCharacters'),
      trigger: 'blur'
    }
  ],
  fullName: [
    { required: true, message: t('settings.user.enterName'), trigger: 'blur' },
    { max: 50, message: t('settings.user.nameLength'), trigger: 'blur' }
  ],
  password: [
    { min: 8, max: 32, message: t('settings.user.passwordLength'), trigger: 'blur' },
    { validator: validatePasswordComplexity, trigger: 'blur' }
  ],
  email: [{ type: 'email', message: t('settings.user.validEmail'), trigger: 'blur' }]
}))

watch([() => props.modelValue, () => props.user, () => props.mode, currentTenantId], () => {
  session++
  saving.value = false
  createdUser.value = null
  saveIssue.value = ''
  contextTenantId = currentTenantId()
  if (props.modelValue) {
    initDialog()
  }
})
onBeforeUnmount(() => {
  session++
})

async function initDialog() {
  const token = ++session
  detailsLoading.value = true
  detailsError.value = false
  rolesError.value = false
  appletsError.value = false
  allRoles.value = []
  allApplets.value = []
  selectedRoleIds.value = []
  userPermissions.value = []
  apiKeys.value = []
  activeTab.value = 'basic'
  showPasswordEdit.value = false
  expandedInfo.value = props.mode === 'view' ? ['other'] : []

  if (props.user) {
    // 加载用户详情
    if (props.user.tenantUserId) {
      try {
        const response = await settingsApi.getUserDetail(props.user.tenantUserId)
        if (!isCurrent(token)) return
        const userData = response?.data || response

        form.value = {
          id: userData.id,
          login: userData.login,
          fullName: userData.fullName,
          password: '',
          confirmPassword: '',
          email: userData.email || '',
          department: userData.department || '',
          mobile: userData.mobile || '',
          telephoneNumber: userData.telephoneNumber || '',
          activated: userData.activated,
          authMode: userData.authMode || 'LOCAL',
          tenantUserId: userData.tenantUserId
        }

        // 提取角色ID
        selectedRoleIds.value = (userData.roles || []).map(r => r.id)

        // 提取权限
        const perms = []
        ;(userData.roles || []).forEach(role => {
          ;(role.permissions || []).forEach(p => {
            if (!perms.find(x => x.id === p.id)) {
              perms.push(p)
            }
          })
        })
        userPermissions.value = perms
      } catch (error) {
        if (!isCurrent(token)) return
        detailsError.value = true
        console.error('Failed to load user detail:', error)
        // 使用传入的基本数据
        form.value = { ...props.user, password: '', confirmPassword: '' }
        selectedRoleIds.value = (props.user.roles || []).map(r => r.id)
      }
    } else {
      form.value = { ...props.user, password: '', confirmPassword: '' }
      selectedRoleIds.value = (props.user.roles || []).map(r => r.id)
    }
  } else {
    // 新建用户
    form.value = {
      id: null,
      login: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      email: '',
      department: '',
      mobile: '',
      telephoneNumber: '',
      activated: true,
      authMode: 'LOCAL',
      tenantUserId: null
    }
    selectedRoleIds.value = []
  }
  if (!isCurrent(token)) return
  detailsLoading.value = false

  // 加载角色列表
  loadRoles(token)

  // 加载应用列表（新建和编辑模式都需要）
  if (!isViewMode.value) {
    loadApplets(token)
  }

  // 编辑/查看现有用户时加载额外数据
  if (props.user?.tenantUserId) {
    if (isViewMode.value) {
      loadApplets(token)
    }
    loadQRCode()
    if (props.mode === 'view') {
      loadApiKeys(token)
    }
  }
}

async function loadRoles(token) {
  rolesLoading.value = true
  rolesError.value = false
  try {
    const response = await settingsApi.getRoles(true)
    if (!isCurrent(token)) return
    allRoles.value = response?.data || response || []
  } catch (error) {
    if (!isCurrent(token)) return
    rolesError.value = true
    console.error('Failed to load roles:', error)
    allRoles.value = []
  } finally {
    if (isCurrent(token)) rolesLoading.value = false
  }
}

async function loadApplets(token) {
  appletsLoading.value = true
  appletsError.value = false
  try {
    // 使用相同的 API，新用户传空的 login 和 tenantUserId
    const login = props.user?.login || ''
    const tenantUserId = props.user?.tenantUserId || ''
    const response = await settingsApi.getUserApplets(login, tenantUserId)
    if (!isCurrent(token)) return
    const applets = response?.data || response || []
    // 对于新用户，初始化所有应用为未选中
    allApplets.value = applets.map(a => ({
      ...a,
      _user_applet: a._user_applet || false
    }))
  } catch (error) {
    if (!isCurrent(token)) return
    appletsError.value = true
    console.error('Failed to load applets:', error)
    allApplets.value = []
  } finally {
    if (isCurrent(token)) appletsLoading.value = false
  }
}

async function retryLoad() {
  if (saving.value || !isCurrent(session)) return
  if (detailsError.value) {
    await initDialog()
    return
  }
  // 仅重读失败部分，保留已经填写的创建资料及成功加载的选择。
  await Promise.all([
    rolesError.value ? loadRoles(session) : undefined,
    appletsError.value ? loadApplets(session) : undefined
  ])
}

async function loadApiKeys(token) {
  if (!props.user?.tenantUserId) return

  try {
    const response = await settingsApi.getUserApiKeys(props.user.tenantUserId)
    if (!isCurrent(token)) return
    apiKeys.value = response?.data || response || []
  } catch (error) {
    if (!isCurrent(token)) return
    console.error('Failed to load API keys:', error)
    apiKeys.value = []
  }
}

function formatTime(time) {
  if (!time) return '-'
  try {
    return new Date(time).toLocaleString(currentLocale.value)
  } catch {
    return time
  }
}

// 格式化应用标题，处理未翻译的 #{...} 格式
function formatAppletTitle(applet) {
  const title = applet.title || applet.name || ''
  // 检查是否是翻译键格式 #{xxx}
  if (title.startsWith('#{') && title.endsWith('}')) {
    // 尝试从映射表获取翻译
    if (appletTitleMap[title]) {
      return appletTitleMap[title]
    }
    // 没有映射则使用 name 字段
    return applet.name || title
  }
  return title
}

// 加载二维码
function loadQRCode() {
  if (!props.user?.qrcodeImagePath) {
    qrcodeStatus.value = 'unexisted'
    return
  }
  qrcodeStatus.value = 'existed'
  qrcodeUrl.value = props.user.qrcodeImagePath
}

// 生成二维码
async function generateQRCode() {
  if (!form.value.tenantUserId) return

  qrcodeStatus.value = 'loading'
  try {
    // TODO: 调用生成二维码的API
    ElMessage.info(t('settings.user.generatingQr'))
    // 模拟异步操作
    setTimeout(() => {
      qrcodeStatus.value = 'existed'
      qrcodeUrl.value = `/portal/qrcode/${form.value.tenantUserId}.png?t=${Date.now()}`
    }, 1000)
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    ElMessage.error(t('settings.user.qrFailed'))
    qrcodeStatus.value = 'unexisted'
  }
}

async function handleSave() {
  if (!props.modelValue || isViewMode.value || saveDisabled.value || !formRef.value) return
  const token = session
  const tenantId = contextTenantId
  if (!isCurrent(token)) return
  saving.value = true
  const applets = JSON.parse(JSON.stringify(allApplets.value))
  if (createdUser.value) {
    try {
      await settingsApi.saveUserApplets(createdUser.value.tenantUserId, applets)
      if (!isCurrent(token)) return
      ElMessage.success(t('settings.user.savedWithApps'))
      handleClose()
    } catch {
      if (!isCurrent(token)) return
      saveIssue.value = message('settings.user.appsFailedAfterCreate')
    } finally {
      if (isCurrent(token)) saving.value = false
    }
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    if (!isCurrent(token)) return
    saving.value = false
    ElMessage.warning(t('settings.user.checkForm'))
    return
  }
  if (!isCurrent(token)) return

  // 密码确认
  if (showPasswordEdit.value || !form.value.id) {
    if (form.value.password && form.value.password !== form.value.confirmPassword) {
      ElMessage.warning(t('settings.user.passwordMismatch'))
      saving.value = false
      return
    }
  }

  try {
    // 获取选中的角色
    const selectedRoles = allRoles.value.filter(r => selectedRoleIds.value.includes(r.id))

    const isNewUser = !form.value.id

    if (isNewUser) {
      // 创建新用户 - POST /api/users
      const createData = {
        id: null,
        tenantId,
        login: form.value.login,
        fullName: form.value.fullName,
        email: form.value.email || '',
        authMode: form.value.authMode || 'LOCAL',
        activated: form.value.activated,
        langKey: null,
        createdBy: null,
        createdDate: null,
        lastModifiedBy: null,
        lastModifiedDate: null,
        resetDate: null,
        resetKey: null,
        roles: selectedRoles,
        department: form.value.department || '',
        mobile: form.value.mobile || '',
        telephoneNumber: form.value.telephoneNumber || '',
        password: form.value.password,
        tenantIds: []
      }

      const response = await settingsApi.createUser(createData)
      if (!isCurrent(token)) return
      const result = response?.data ?? response
      const matches =
        Array.isArray(result) && tenantId ? result.filter(item => item?.tenantId === tenantId) : []
      const identity =
        matches.length === 1 &&
        typeof matches[0].tenantUserId === 'string' &&
        matches[0].tenantUserId.trim()
          ? matches[0].tenantUserId
          : ''
      // 创建已完成；后续失败不能再发创建请求或保留凭据用于重试。
      createdUser.value = { tenantId, tenantUserId: identity }
      form.value.password = ''
      form.value.confirmPassword = ''
      emit('saved')
      if (!isCurrent(token)) return
      if (applets.length) {
        activeTab.value = 'applets'
        if (!identity) {
          saveIssue.value =
            message('settings.user.createdIdentityMissing')
          return
        }
        try {
          await settingsApi.saveUserApplets(identity, applets)
        } catch {
          if (!isCurrent(token)) return
          saveIssue.value =
            message('settings.user.appsFailedAfterCreate')
          return
        }
        if (!isCurrent(token)) return
      }
      ElMessage.success(applets.length ? t('settings.user.savedWithApps') : t('settings.user.created'))
      handleClose()
      return
    } else {
      // 更新现有用户 - PUT /api/users
      const saveData = {
        ...form.value,
        roles: selectedRoles
      }

      // 如果不修改密码，移除密码字段
      if (!showPasswordEdit.value) {
        delete saveData.password
      }
      delete saveData.confirmPassword

      await settingsApi.updateUser(saveData)
      if (!isCurrent(token)) return

      // 保存应用权限（仅编辑现有用户时）
      if (form.value.tenantUserId && allApplets.value.length > 0) {
        try {
          await settingsApi.saveUserApplets(form.value.tenantUserId, applets)
          if (!isCurrent(token)) return
        } catch (appletError) {
          if (!isCurrent(token)) return
          console.error('Failed to save applets:', appletError)
        }
      }
    }

    ElMessage.success(t('settings.user.saved'))
    emit('saved')
    handleClose()
  } catch (error) {
    if (!isCurrent(token)) return
    console.error('Failed to save user:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    if (isCurrent(token)) saving.value = false
  }
}

function handleClose() {
  session++
  visible.value = false
}
</script>

<style scoped lang="scss">
.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0;
}

.permissions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  font-family: monospace;
}

:deep(.el-collapse-item__header) {
  font-size: 13px;
  color: var(--el-color-primary);
}

:deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.otp-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.qrcode-loading {
  width: 200px;
  height: 200px;
}

.qrcode-image {
  max-width: 200px;
  max-height: 200px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.qrcode-missing {
  padding: 40px;
  color: var(--el-text-color-regular);
}

.qrcode-actions {
  margin-top: 16px;
}
</style>
