<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="700px"
    destroy-on-close
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          :disabled="isViewMode"
        >
          <el-form-item label="用户名" prop="login">
            <el-input v-model="form.login" :disabled="!!form.id" />
          </el-form-item>
          <el-form-item label="姓名" prop="fullName">
            <el-input v-model="form.fullName" />
          </el-form-item>

          <!-- 修改密码 -->
          <template v-if="form.id && !isViewMode">
            <el-form-item>
              <el-link type="primary" @click="showPasswordEdit = !showPasswordEdit">
                {{ showPasswordEdit ? '取消修改密码' : '修改密码' }}
              </el-link>
            </el-form-item>
          </template>

          <template v-if="showPasswordEdit || !form.id">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" type="password" show-password />
            </el-form-item>
          </template>

          <!-- 其他信息 -->
          <el-collapse v-model="expandedInfo">
            <el-collapse-item title="其他信息" name="other">
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" type="email" />
              </el-form-item>
              <el-form-item label="部门">
                <el-input v-model="form.department" />
              </el-form-item>
              <el-form-item label="手机">
                <el-input v-model="form.mobile" />
              </el-form-item>
              <el-form-item label="电话">
                <el-input v-model="form.telephoneNumber" />
              </el-form-item>
              <el-form-item label="状态">
                <el-switch
                  v-model="form.activated"
                  :disabled="!form.id"
                  active-text="已激活"
                  inactive-text="已禁用"
                />
              </el-form-item>
              <el-form-item label="认证方式">
                <el-radio-group v-model="form.authMode">
                  <el-radio value="LOCAL">本地认证</el-radio>
                  <el-radio value="AD">Active Directory</el-radio>
                  <el-radio value="UN">统一认证</el-radio>
                  <el-radio value="MIX">混合认证</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-collapse-item>
          </el-collapse>
        </el-form>
      </el-tab-pane>

      <!-- 角色 -->
      <el-tab-pane label="角色" name="roles">
        <el-checkbox-group v-model="selectedRoleIds" class="checkbox-grid" :disabled="isViewMode">
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
      <el-tab-pane label="应用" name="applets">
        <div class="checkbox-grid" v-loading="appletsLoading">
          <el-checkbox
            v-for="applet in allApplets"
            :key="applet.id"
            v-model="applet._user_applet"
            :disabled="isViewMode"
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
              二维码不存在，点击重新生成
            </el-link>
            <span v-else>二维码不存在</span>
          </div>
          <div v-if="qrcodeStatus === 'existed' && !isViewMode" class="qrcode-actions">
            <el-button type="primary" @click="generateQRCode">重新生成OTP二维码</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 权限 (仅查看模式) -->
      <el-tab-pane v-if="isViewMode" label="权限" name="permissions">
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
        <el-table :data="apiKeys" stripe size="small">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="targetApi" label="目标API" min-width="200" />
          <el-table-column prop="expireTime" label="过期时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.expireTime) }}
            </template>
          </el-table-column>
          <el-table-column prop="enabled" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.enabled ? 'success' : 'danger'" size="small">
                {{ row.enabled ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          {{ isViewMode ? '关闭' : '取消' }}
        </el-button>
        <el-button v-if="!isViewMode" type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
  set: (val) => emit('update:modelValue', val)
})

const isViewMode = computed(() => props.mode === 'view')

const dialogTitle = computed(() => {
  if (props.mode === 'view') return '用户详情'
  if (props.mode === 'create') return '添加用户'
  return '编辑用户'
})

const formRef = ref(null)
const activeTab = ref('basic')
const showPasswordEdit = ref(false)
const expandedInfo = ref([])
const saving = ref(false)

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
  '#{cac.index.square}': '系统巡检',
  '#{app_pms.title}': '密码管理',
  '#{app_sudo.title}': 'sudo权限管理',
  '#{acm.title}': '资产管理',
  '#{app_vap.title}': '补丁管理',
  '#{app_spm.title}': '软件管理',
  '#{app_uim.name}': '用户管理'
}

// 表单验证
const formRules = {
  login: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 1, max: 50, message: '用户名长度在 1 到 50 个字符', trigger: 'blur' },
    { pattern: /^[_'.A-Za-z0-9-]*$/, message: '用户名只能包含字母、数字和特殊字符', trigger: 'blur' }
  ],
  fullName: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { max: 50, message: '姓名不能超过 50 个字符', trigger: 'blur' }
  ],
  password: [
    { min: 8, max: 32, message: '密码长度在 8 到 32 个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    await initDialog()
  }
})

async function initDialog() {
  activeTab.value = 'basic'
  showPasswordEdit.value = false
  expandedInfo.value = props.mode === 'view' ? ['other'] : []

  if (props.user) {
    // 加载用户详情
    if (props.user.tenantUserId) {
      try {
        const response = await settingsApi.getUserDetail(props.user.tenantUserId)
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

  // 加载角色列表
  loadRoles()

  // 加载应用列表（新建和编辑模式都需要）
  if (!isViewMode.value) {
    loadApplets()
  }

  // 编辑/查看现有用户时加载额外数据
  if (props.user?.tenantUserId) {
    if (isViewMode.value) {
      loadApplets()
    }
    loadQRCode()
    if (props.mode === 'view') {
      loadApiKeys()
    }
  }
}

async function loadRoles() {
  rolesLoading.value = true
  try {
    const response = await settingsApi.getRoles(true)
    allRoles.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load roles:', error)
    allRoles.value = []
  } finally {
    rolesLoading.value = false
  }
}

async function loadApplets() {
  appletsLoading.value = true
  try {
    // 使用相同的 API，新用户传空的 login 和 tenantUserId
    const login = props.user?.login || ''
    const tenantUserId = props.user?.tenantUserId || ''
    const response = await settingsApi.getUserApplets(login, tenantUserId)
    const applets = response?.data || response || []
    // 对于新用户，初始化所有应用为未选中
    allApplets.value = applets.map(a => ({
      ...a,
      _user_applet: a._user_applet || false
    }))
  } catch (error) {
    console.error('Failed to load applets:', error)
    allApplets.value = []
  } finally {
    appletsLoading.value = false
  }
}

async function loadApiKeys() {
  if (!props.user?.tenantUserId) return

  try {
    const response = await settingsApi.getUserApiKeys(props.user.tenantUserId)
    apiKeys.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load API keys:', error)
    apiKeys.value = []
  }
}

function formatTime(time) {
  if (!time) return '-'
  try {
    return new Date(time).toLocaleString('zh-CN')
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
    ElMessage.info('正在生成二维码...')
    // 模拟异步操作
    setTimeout(() => {
      qrcodeStatus.value = 'existed'
      qrcodeUrl.value = `/portal/qrcode/${form.value.tenantUserId}.png?t=${Date.now()}`
    }, 1000)
  } catch (error) {
    console.error('Failed to generate QR code:', error)
    ElMessage.error('生成二维码失败')
    qrcodeStatus.value = 'unexisted'
  }
}

async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写')
    return
  }

  // 密码确认
  if (showPasswordEdit.value || !form.value.id) {
    if (form.value.password && form.value.password !== form.value.confirmPassword) {
      ElMessage.warning('两次输入的密码不一致')
      return
    }
  }

  saving.value = true
  try {
    // 获取选中的角色
    const selectedRoles = allRoles.value.filter(r => selectedRoleIds.value.includes(r.id))

    const isNewUser = !form.value.id

    if (isNewUser) {
      // 创建新用户 - POST /api/users
      const createData = {
        id: null,
        tenantId: authService.getCurrentUser()?.tenantId || '',
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

      await settingsApi.createUser(createData)
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

      // 保存应用权限（仅编辑现有用户时）
      if (form.value.tenantUserId && allApplets.value.length > 0) {
        try {
          await settingsApi.saveUserApplets(form.value.tenantUserId, allApplets.value)
        } catch (appletError) {
          console.error('Failed to save applets:', appletError)
        }
      }
    }

    ElMessage.success('保存成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to save user:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleClose() {
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
  color: #409eff;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.qrcode-missing {
  padding: 40px;
  color: #909399;
}

.qrcode-actions {
  margin-top: 16px;
}
</style>
