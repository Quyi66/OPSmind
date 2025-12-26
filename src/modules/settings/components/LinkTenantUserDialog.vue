<template>
  <el-dialog
    v-model="visible"
    title="关联用户"
    width="800px"
    destroy-on-close
    @close="handleClose"
  >
    <div v-loading="loading" class="link-user-container">
      <!-- 顶部提示栏 -->
      <div class="top-bar">
        <div class="hint-section">
          <span class="hint-text">用户不存在? 请点击</span>
          <el-button type="primary" plain size="small" @click="handleCreateNewUser">
            创建用户
          </el-button>
        </div>
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索"
            clearable
            size="small"
            style="width: 200px"
            @input="handleSearch"
          >
            <template #prefix>
              <i class="fa fa-search"></i>
            </template>
          </el-input>
          <el-button size="small" :icon="Refresh" @click="loadData" title="刷新" />
        </div>
      </div>

      <!-- 用户表格 -->
      <el-table
        :data="paginatedData"
        style="width: 100%"
        max-height="400px"
        @selection-change="handleSelectionChange"
        :default-sort="{ prop: 'login', order: 'descending' }"
      >
        <el-table-column type="selection" label="选择" width="70" />
        <el-table-column prop="login" label="账号" sortable min-width="150" />
        <el-table-column prop="fullName" label="姓名" sortable min-width="150" />
        <el-table-column prop="department" label="部门" sortable>
          <template #default="{ row }">
            {{ row.department || '' }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredData.length"
          layout="total, sizes, prev, pager, next"
          background
          small
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="selectedUsers.length === 0" @click="handleSave">
          保存
        </el-button>
      </div>
    </template>

    <!-- 创建新用户对话框 -->
    <UserEditDialog
      v-model="createUserVisible"
      :user="null"
      mode="create"
      @saved="handleUserCreated"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as settingsApi from '@/modules/settings/api'
import { authService } from '@/core/auth'
import UserEditDialog from './UserEditDialog.vue'

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
const userData = ref([])
const selectedUsers = ref([])
const createUserVisible = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchKeyword.value) {
    return userData.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return userData.value.filter(user =>
    (user.login || '').toLowerCase().includes(keyword) ||
    (user.fullName || '').toLowerCase().includes(keyword) ||
    (user.department || '').toLowerCase().includes(keyword)
  )
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

watch(() => props.modelValue, (val) => {
  if (val) {
    searchKeyword.value = ''
    loadData()
  }
})

async function loadData() {
  loading.value = true
  selectedUsers.value = []

  try {
    const tenantId = authService.getCurrentUser()?.tenantId
    const response = await settingsApi.getNotAssociatedUsers(tenantId)
    userData.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load users:', error)
    ElMessage.error('加载用户列表失败')
    userData.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  // 搜索由 computed 自动处理
}

function handlePageChange(page) {
  currentPage.value = page
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function handleSelectionChange(selection) {
  selectedUsers.value = selection
}

function handleCreateNewUser() {
  createUserVisible.value = true
}

function handleUserCreated() {
  loadData()
  emit('saved')
}

async function handleSave() {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请选择要关联的用户')
    return
  }

  saving.value = true
  try {
    const tenantId = authService.getCurrentUser()?.tenantId
    const userIds = selectedUsers.value.map(u => u.id)

    await settingsApi.associateTenantUsers(tenantId, userIds)

    ElMessage.success('关联成功')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('Failed to associate users:', error)
    ElMessage.error('关联失败')
  } finally {
    saving.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.link-user-container {
  min-height: 300px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #e8f4fc;
  border: 1px solid #d1e9f6;
  margin-bottom: 16px;
}

.hint-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hint-text {
  font-size: 14px;
  color: #333;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
}

:deep(.el-table th) {
  background: #f5f5f5;
}
</style>
