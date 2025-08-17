<template>
  <div class="top-nav-menu">
    <div class="nav-container">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <div class="logo-placeholder">
          <i class="fa fa-cube"></i>
        </div>
        <h1 class="app-title">OpsMind</h1>
      </div>

      <!-- 主菜单 -->
      <nav class="main-nav">
        <ul class="nav-list">
          <li
            v-for="menu in menuItems"
            :key="menu.code"
            class="nav-item"
            :class="{ active: activeMenu === menu.code }"
            @click="handleMenuClick(menu)"
          >
            <div class="nav-link">
              <i :class="menu.icon" class="nav-icon"></i>
              <span class="nav-text">{{ menu.name }}</span>
            </div>
          </li>
        </ul>
      </nav>

      <!-- 右侧用户区域 -->
      <div class="user-section">
        <!-- 搜索框 -->
        <div class="search-section">
          <el-input
            v-model="searchQuery"
            placeholder="搜索功能..."
            class="search-input"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

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
  User,
  ArrowDown,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['menu-click', 'search'])

const searchQuery = ref('')
const activeMenu = ref('')

// 菜单配置数据
const menuItems = ref([
  {
    code: 'gfs',
    name: '脚本',
    icon: 'fas fa-file-code',
    route: '/gfs',
    description: '脚本文件管理和版本控制'
  },
  {
    code: 'jao',
    name: '作业',
    icon: 'fas fa-tasks',
    route: '/jao',
    description: '自动化作业编排和调度管理'
  },
  {
    code: 'cmd',
    name: '命令',
    icon: 'fas fa-terminal',
    route: '/cmd',
    description: '系统命令管理和执行'
  },
  {
    code: 'cac',
    name: '系统巡检',
    icon: 'fas fa-search',
    route: '/cac',
    description: '系统配置审计与合规性检查'
  },
  {
    code: 'password',
    name: '密码管理',
    icon: 'fas fa-key',
    route: '/password',
    description: '密码策略和安全管理'
  },
  {
    code: 'sudo',
    name: 'sudo权限管理',
    icon: 'fas fa-user-shield',
    route: '/sudo',
    description: 'sudo权限分配和管理'
  },
  {
    code: 'acm',
    name: '资产管理',
    icon: 'fas fa-server',
    route: '/acm',
    description: 'IT基础设施资产管理'
  },
  {
    code: 'patches',
    name: '补丁管理',
    icon: 'fas fa-download',
    route: '/patches',
    description: '系统补丁和更新管理'
  },
  {
    code: 'software',
    name: '软件管理',
    icon: 'fas fa-box',
    route: '/software',
    description: '软件包安装和管理'
  },
  {
    code: 'workflow',
    name: '流程管理',
    icon: 'fas fa-project-diagram',
    route: '/workflow',
    description: '业务流程设计和管理'
  },
  {
    code: 'users',
    name: '用户管理',
    icon: 'fas fa-users',
    route: '/users',
    description: '用户账户和权限管理'
  }
])

const displayUserName = computed(() => {
  if (!props.user) return '未登录'
  return props.user.firstName || props.user.login || '用户'
})

const handleMenuClick = (menu) => {
  activeMenu.value = menu.code
  emit('menu-click', menu)

  // 导航到对应路由
  if (menu.route) {
    router.push(menu.route)
  }
}

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
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('登出失败')
  }
}
</script>

<style scoped lang="scss">
.top-nav-menu {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.logo-placeholder {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
}

.app-title {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  margin: 0;
}

.main-nav {
  flex: 1;
  margin: 0 40px;
}

.nav-list {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  position: relative;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(24, 144, 255, 0.1);
  }

  &.active {
    background: rgba(24, 144, 255, 0.15);

    .nav-link {
      color: #1890ff;
    }
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #595959;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-icon {
  font-size: 16px;
  width: 16px;
  text-align: center;
}

.nav-text {
  white-space: nowrap;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 0 0 auto;
}

.search-section {
  .search-input {
    width: 240px;
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
  transition: background-color 0.3s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
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
@media (max-width: 1200px) {
  .nav-container {
    padding: 0 16px;
  }

  .main-nav {
    margin: 0 20px;
  }

  .search-input {
    width: 200px !important;
  }
}

@media (max-width: 992px) {
  .nav-list {
    gap: 4px;
  }

  .nav-link {
    padding: 10px 12px;
    font-size: 13px;
  }

  .nav-text {
    display: none;
  }

  .nav-icon {
    font-size: 18px;
  }

  .search-input {
    width: 160px !important;
  }
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 12px;
  }

  .main-nav {
    margin: 0 12px;
  }

  .app-title {
    font-size: 20px;
  }

  .logo-placeholder {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .search-section {
    display: none;
  }

  .user-name {
    display: none;
  }
}
</style>
