<template>
  <el-dialog
    v-model="visible"
    title="分配角色"
    width="1200px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="allocate-role-container">
      <el-table
        :data="userData"
        border
        style="width: 100%"
        max-height="500"
      >
        <el-table-column prop="fullName" label="用户" width="120" fixed>
          <template #default="{ row }">
            {{ row.fullName || row.login }}
          </template>
        </el-table-column>
        <el-table-column
          v-for="role in roles"
          :key="role.id"
          :label="role.description"
          align="left"
        >
          <template #default="{ row }">
            <el-checkbox
              v-model="row.roleMap[role.name]"
              @change="markUserChanged(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

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
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const roles = ref([])
const userData = ref([])
const changedUserIds = ref(new Set())

watch(() => props.modelValue, (val) => {
  if (val) {
    loadData()
  }
})

async function loadData() {
  loading.value = true
  changedUserIds.value.clear()

  try {
    // 并行加载角色和用户
    const [rolesRes, usersRes] = await Promise.all([
      settingsApi.getRoles(false),
      settingsApi.getUsers(authService.getCurrentUser()?.tenantId)
    ])

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
        if (roleMap.hasOwnProperty(userRole.name)) {
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
    console.error('Failed to load data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function markUserChanged(user) {
  changedUserIds.value.add(user.tenantUserId)
}

async function handleSave() {
  // 收集变化的用户
  const changedUsers = userData.value.filter(user => {
    if (!changedUserIds.value.has(user.tenantUserId)) return false

    // 检查角色是否真的变化了
    const original = user._originalRoleMap
    const current = user.roleMap
    for (const roleName in original) {
      if (original[roleName] !== current[roleName]) {
        return true
      }
    }
    return false
  })

  if (changedUsers.length === 0) {
    ElMessage.warning('没有修改任何角色分配')
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

    ElMessage.success('保存成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to save roles:', error)
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
.allocate-role-container {
  min-height: 200px;
}

:deep(.el-table .el-checkbox) {
  display: flex;
  justify-content: center;
}
</style>
