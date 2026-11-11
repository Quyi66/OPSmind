<template>
  <el-dialog
    v-model="visible"
    :title="isCreate ? '创建团队' : '编辑团队'"
    width="600px"
    destroy-on-close
    @close="handleClose"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
  >
    <el-alert v-if="usersError" :title="usersError" type="error" :closable="false" show-icon>
      <el-button link type="primary" :loading="usersLoading" @click="loadUsers">重试读取</el-button>
    </el-alert>
    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          v-loading="loading"
          @submit.prevent
        >
          <el-form-item label="团队名称" prop="name">
            <el-input v-model="form.name" maxlength="50" placeholder="请输入团队名称" />
          </el-form-item>
          <el-form-item label="团队代码" prop="code">
            <el-input v-model="form.code" maxlength="50" placeholder="请输入团队代码（可选）" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              maxlength="100"
              :rows="3"
              placeholder="请输入团队描述"
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 用户 -->
      <el-tab-pane label="用户" name="users">
        <div v-loading="usersLoading" class="users-container">
          <el-alert
            v-if="!usersError && allUsers.length === 0 && !usersLoading"
            title="暂无可选用户"
            type="info"
            :closable="false"
            show-icon
          />
          <div v-else class="checkbox-grid">
            <el-checkbox
              v-for="user in allUsers"
              :key="user.id"
              v-model="user.isChecked"
              :disabled="usersLoading || saving"
            >
              {{ user.fullName || user.login }}
            </el-checkbox>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="usersLoading || Boolean(usersError)"
          @click="handleSave"
        >
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { ElMessage } from 'element-plus'
import * as teamApi from '@/modules/settings/api/team'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'

const props = defineProps({
  modelValue: Boolean,
  team: Object,
  mode: {
    type: String,
    default: 'edit' // 'edit' | 'create'
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isCreate = computed(() => props.mode === 'create')

const activeTab = ref('basic')
const loading = ref(false)
const saving = ref(false)
const usersLoading = ref(false)
const usersError = ref('')
let active = true
let readRequestId = 0
const formRef = ref(null)

const form = ref({
  id: null,
  name: '',
  code: '',
  description: ''
})

const allUsers = ref([])

const rules = {
  name: [
    { required: true, message: '请输入团队名称', trigger: 'blur' },
    { max: 50, message: '团队名称不能超过50个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入团队描述', trigger: 'blur' },
    { max: 100, message: '描述不能超过100个字符', trigger: 'blur' }
  ]
}

watch(
  [() => props.modelValue, () => props.team?.id, () => props.mode],
  ([val]) => {
    if (val) {
      initDialog()
    } else {
      readRequestId += 1
      usersLoading.value = false
    }
  },
  { immediate: true }
)

function initDialog() {
  activeTab.value = 'basic'

  if (props.team) {
    form.value = {
      id: props.team.id,
      name: props.team.name || '',
      code: props.team.code || '',
      description: props.team.description || ''
    }
  } else {
    form.value = {
      id: null,
      name: '',
      code: '',
      description: ''
    }
  }

  // 创建和编辑模式都加载用户列表
  loadUsers()
}

async function loadUsers() {
  if (!active || !props.modelValue) return
  const request = ++readRequestId
  const teamId = props.team?.id
  usersLoading.value = true
  usersError.value = ''
  allUsers.value = []
  try {
    // 获取基础用户列表
    const tenantId = authService.getCurrentUser()?.tenantId
    const usersResponse = await settingsApi.getBasicUsers(tenantId)
    if (!active || !props.modelValue || request !== readRequestId) return
    const allUsersData = usersResponse?.data || usersResponse || []

    // 获取团队详情（仅编辑模式），详情中包含 users 数组
    let teamUsers = []
    if (teamId != null && teamId !== '') {
      const teamDetailResponse = await teamApi.getTeamDetail(teamId)
      if (!active || !props.modelValue || request !== readRequestId) return
      const teamDetail = teamDetailResponse?.data || teamDetailResponse || {}
      teamUsers = teamDetail.users || []
    }

    // 标记已选中的用户 - 同时比对多个可能的ID字段和login
    allUsers.value = allUsersData.map(user => {
      const isChecked = teamUsers.some(teamUser => {
        // 比对多种可能的ID字段
        return (
          (user.id != null &&
            user.id !== '' &&
            (user.id === teamUser.id ||
              user.id === teamUser.tenantUserId ||
              user.id === teamUser.userId)) ||
          (user.tenantUserId != null &&
            user.tenantUserId !== '' &&
            (user.tenantUserId === teamUser.id ||
              user.tenantUserId === teamUser.tenantUserId ||
              user.tenantUserId === teamUser.userId)) ||
          (user.login && user.login === teamUser.login)
        )
      })
      return {
        ...user,
        isChecked
      }
    })
  } catch (error) {
    if (!active || !props.modelValue || request !== readRequestId) return
    console.error('Failed to load users:', error)
    usersError.value = '团队成员未完整读取，暂不可保存，请重试读取'
    allUsers.value = []
  } finally {
    if (active && props.modelValue && request === readRequestId) usersLoading.value = false
  }
}

async function handleSave() {
  if (!active || !props.modelValue || usersLoading.value || usersError.value || saving.value) return
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写')
    return
  }

  saving.value = true
  try {
    const saveData = { ...form.value }

    if (isCreate.value) {
      // 创建团队 - 包含用户列表
      const createData = {
        name: form.value.name,
        tenantId: null,
        description: form.value.description,
        code: form.value.code || null,
        id: null,
        users: allUsers.value.filter(u => u.isChecked)
      }
      await teamApi.createTeam(createData)
    } else {
      // 更新团队 - 包含用户列表
      const updateData = {
        id: form.value.id,
        name: form.value.name,
        code: form.value.code || null,
        description: form.value.description,
        tenantName: props.team?.tenantName || null,
        updatedAt: props.team?.updatedAt || null,
        users: allUsers.value.filter(u => u.isChecked)
      }
      await teamApi.updateTeam(updateData)
    }

    ElMessage.success('保存成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to save team:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  readRequestId += 1
  usersLoading.value = false
  visible.value = false
}

function pauseReading() {
  active = false
  readRequestId += 1
  if (usersLoading.value) usersError.value = '成员读取已中断，请重试读取'
  usersLoading.value = false
}
onDeactivated(pauseReading)
onBeforeUnmount(pauseReading)
onActivated(() => {
  if (active) return
  active = true
  if (props.modelValue && usersError.value) loadUsers()
})
</script>

<style scoped lang="scss">
.users-container {
  min-height: 150px;
  max-height: 300px;
  overflow-y: auto;
}

.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
</style>
