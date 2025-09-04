<template>
  <div class="dashboard-header">
    <div class="header-left">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <img src="@/assets/icons/logo@2x.png" alt="OPSmind" class="brand-logo" />
      </div>
    </div>

    <div class="header-center">
      <!-- 搜索框 -->
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索功能模块..."
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch" :loading="loading">搜索</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div class="header-right">
      <!-- 操作按钮 -->
      <div class="actions-section">
        <!-- 刷新按钮 -->
        <el-tooltip content="刷新数据" placement="bottom">
          <el-button
            circle
            @click="$emit('refresh')"
            :loading="loading"
            type="text"
            class="action-btn"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 帮助按钮 -->
        <el-tooltip content="帮助文档" placement="bottom">
          <el-button circle @click="openHelp" type="text" class="action-btn">
            <el-icon><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>

        <!-- 用户信息 -->
        <el-dropdown @command="handleUserCommand" class="user-dropdown">
          <div class="user-info">
            <el-avatar :size="32" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="user-name">{{ displayUserName }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人资料
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>
                系统设置
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import {
  Search,
  Refresh,
  QuestionFilled,
  User,
  ArrowDown,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const _router = useRouter()

const props = defineProps({
  user: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['search', 'refresh'])

const searchQuery = ref('')

const displayUserName = computed(() => {
  if (!props.user) return '未登录'
  return props.user.firstName || props.user.login || '用户'
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value.trim())
  }
}

const handleUserCommand = command => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人资料功能开发中...')
      break
    case 'settings':
      ElMessage.info('系统设置功能开发中...')
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    ElMessage.success('正在安全登出...')
    await authService.logout()
    // 认证服务会自动处理页面跳转
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('登出失败')
  }
}

const openHelp = () => {
  // 打开帮助文档
  window.open('/help/', '_blank')
}
</script>

<style scoped lang="scss">
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  flex: 0 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
}

.brand-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  object-position: center;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 600px;
  margin: 0 40px;
}

.search-section {
  width: 100%;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  flex: 0 0 auto;
}

.actions-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-btn {
  font-size: 18px;
  color: #595959;

  &:hover {
    color: #1890ff;
  }
}

.user-dropdown {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f5f5;
  }
}

.user-avatar {
  background-color: #1890ff;
}

.user-name {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.dropdown-icon {
  font-size: 12px;
  color: #8c8c8c;
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard-header {
    padding: 0 16px;
  }

  .header-center {
    margin: 0 20px;
  }

  .app-title {
    display: none;
  }

  .user-name {
    display: none;
  }
}

@media (max-width: 576px) {
  .header-center {
    display: none;
  }

  .actions-section {
    gap: 8px;
  }
}
</style>
