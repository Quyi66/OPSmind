<template>
  <el-dialog
    v-model="visible"
    :title="isCreate ? '创建团队' : '编辑团队'"
    width="600px"
    destroy-on-close
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          v-loading="loading"
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
            v-if="allUsers.length === 0 && !usersLoading"
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
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
  set: (val) => emit('update:modelValue', val)
})

const isCreate = computed(() => props.mode === 'create')

const activeTab = ref('basic')
const loading = ref(false)
const saving = ref(false)
const usersLoading = ref(false)
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

watch(() => props.modelValue, (val) => {
  if (val) {
    initDialog()
  }
})

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
  usersLoading.value = true
  try {
    // 获取基础用户列表
    const tenantId = authService.getCurrentUser()?.tenantId
    const usersResponse = await settingsApi.getBasicUsers(tenantId)
    const allUsersData = usersResponse?.data || usersResponse || []

    // 获取团队成员（仅编辑模式）
    let teamUserIds = []
    if (props.team?.id) {
      try {
        const teamUsersResponse = await teamApi.getTeamUsers(props.team.id)
        const teamUsers = teamUsersResponse?.data || teamUsersResponse || []
        teamUserIds = teamUsers.map(u => u.id || u.tenantUserId)
      } catch {
        // 团队可能没有成员
      }
    }

    // 标记已选中的用户
    allUsers.value = allUsersData.map(user => ({
      ...user,
      isChecked: teamUserIds.includes(user.id) || teamUserIds.includes(user.tenantUserId)
    }))
  } catch (error) {
    console.error('Failed to load users:', error)
    allUsers.value = []
  } finally {
    usersLoading.value = false
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
  visible.value = false
}
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
