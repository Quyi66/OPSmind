<template>
  <el-dialog
    v-model="visible"
    :title="t('settings.roles.assign')"
    width="1150px"
    destroy-on-close
    @close="handleClose"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
  >
    <div v-loading="loading" class="allocate-role-container">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('settings.roles.search')"
          clearable
          style="width: 250px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-checkbox v-model="onlyChanged">{{ t('settings.roles.onlyChanged') }}</el-checkbox>
        <span aria-live="polite">{{ t('settings.roles.changedCount', { count: roleChanges.length }) }}</span>
      </div>

      <el-alert
        v-if="loadError"
        :title="t('settings.roles.loadFailed')"
        type="error"
        :closable="false"
      >
        <el-button :disabled="loading" @click="loadData">{{ t('common.retry') }}</el-button>
      </el-alert>
      <section v-if="roleChanges.length" class="change-summary" :aria-label="t('settings.roles.summary')">
        <p>{{ t('settings.roles.summaryHint') }}</p>
        <div v-for="change in roleChanges" :key="change.user.tenantUserId" class="change-item">
          <strong>
            {{ t('settings.roles.userIdentity', { name: change.user.fullName || change.user.login, login: change.user.login }) }}
          </strong>
          <span v-if="change.added.length">{{ t('settings.roles.added', { roles: change.added.map(roleLabel).join(t('common.listSeparator')) }) }}</span>
          <span v-if="change.removed.length">
            {{ t('settings.roles.removed', { roles: change.removed.map(roleLabel).join(t('common.listSeparator')) }) }}
          </span>
        </div>
      </section>

      <el-table
        :data="filteredUserData"
        border
        style="width: 100%"
        max-height="calc(100vh - 350px)"
      >
        <el-table-column prop="fullName" :label="t('common.user')" min-width="150" fixed>
          <template #default="{ row }">
            {{ row.fullName || row.login }}
            <div class="user-login">{{ row.login }}</div>
          </template>
        </el-table-column>
        <el-table-column
          v-for="role in roles"
          :key="role.id"
          :label="roleLabel(role)"
          align="center"
          :width="Math.max(110, roleLabel(role).length * 22)"
        >
          <template #default="{ row }">
            <el-checkbox
              v-model="row.roleMap[role.name]"
              :disabled="loading || loadError || saving"
              :aria-label="t('settings.roles.checkboxLabel', { name: row.fullName || row.login, login: row.login, role: roleLabel(role) })"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="loading || loadError || saving || !roleChanges.length"
          @click="handleSave"
        >
          {{ t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const roles = ref([])
const userData = ref([])
const searchKeyword = ref('')
const onlyChanged = ref(false)
const loadError = ref(false)
let session = 0
let request = 0
const roleLabel = role => role.description || role.name
const roleChanges = computed(() =>
  userData.value
    .map(user => ({
      user,
      added: roles.value.filter(
        role => !user._originalRoleMap[role.name] && user.roleMap[role.name]
      ),
      removed: roles.value.filter(
        role => user._originalRoleMap[role.name] && !user.roleMap[role.name]
      )
    }))
    .filter(change => change.added.length || change.removed.length)
)

// 过滤后的用户数据
const filteredUserData = computed(() => {
  const users = onlyChanged.value ? roleChanges.value.map(change => change.user) : userData.value
  if (!searchKeyword.value) return users
  const keyword = searchKeyword.value.toLowerCase()
  return users.filter(user => {
    return (
      (user.fullName && user.fullName.toLowerCase().includes(keyword)) ||
      (user.login && user.login.toLowerCase().includes(keyword))
    )
  })
})

watch(
  () => props.modelValue,
  val => {
    session++
    request++
    saving.value = false
    if (val) {
      searchKeyword.value = ''
      onlyChanged.value = false
      loadData()
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  session++
  request++
})

async function loadData() {
  const currentRequest = ++request
  const isCurrent = () => currentRequest === request && props.modelValue
  loading.value = true
  loadError.value = false
  roles.value = []
  userData.value = []

  try {
    // 并行加载角色和用户
    const [rolesRes, usersRes] = await Promise.all([
      settingsApi.getRoles(false),
      settingsApi.getUsers(authService.getCurrentUser()?.tenantId)
    ])
    if (!isCurrent()) return

    // 处理角色数据 - 排除 ROLE_ADMIN（除非是管理员UI）
    const allRoles = rolesRes?.data || rolesRes || []
    roles.value = allRoles.filter(r => r.name !== 'ROLE_ADMIN')

    // 处理用户数据，生成 roleMap
    const users = usersRes?.data || usersRes || []
    userData.value = users.map(user => {
      const roleMap = {}
      // 初始化所有角色为 false
      roles.value.forEach(role => {
        roleMap[role.name] = false
      })
      // 设置用户已有的角色为 true
      ;(user.roles || []).forEach(userRole => {
        if (Object.prototype.hasOwnProperty.call(roleMap, userRole.name)) {
          roleMap[userRole.name] = true
        }
      })

      return {
        ...user,
        roleMap,
        _originalRoleMap: { ...roleMap } // 保存原始状态用于比较
      }
    })
  } catch (error) {
    if (!isCurrent()) return
    loadError.value = true
    roles.value = []
    userData.value = []
    console.error('Failed to load data:', error)
    ElMessage.error(t('settings.roles.readFailed'))
  } finally {
    if (isCurrent()) loading.value = false
  }
}

async function handleSave() {
  if (!props.modelValue || loading.value || loadError.value || saving.value) return
  const currentSession = session
  const isCurrent = () => currentSession === session && props.modelValue
  const changedUsers = roleChanges.value.map(change => change.user)

  if (changedUsers.length === 0) {
    ElMessage.warning(t('settings.roles.noChanges'))
    return
  }

  saving.value = true
  try {
    // 构建更新数据
    const updateData = changedUsers.map(user => ({
      tenantUserId: user.tenantUserId,
      roles: roles.value.filter(role => user.roleMap[role.name])
    }))

    // 调用批量更新API
    await settingsApi.updateUserRoles(updateData)
    if (!isCurrent()) return

    ElMessage.success(t('settings.user.saved'))
    emit('saved')
    handleClose()
  } catch (error) {
    if (!isCurrent()) return
    console.error('Failed to save roles:', error)
    ElMessage.error(t('settings.user.saveFailed'))
  } finally {
    if (isCurrent()) saving.value = false
  }
}

function handleClose() {
  session++
  request++
  visible.value = false
}
</script>

<style scoped lang="scss">
.allocate-role-container {
  min-height: 200px;
}

.search-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.change-summary {
  max-height: 180px;
  overflow-y: auto;
  padding: 0 12px 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
}

.change-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 8px;
  overflow-wrap: anywhere;
}

.user-login {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

:deep(.el-table .el-checkbox) {
  display: flex;
  justify-content: center;
}
</style>
