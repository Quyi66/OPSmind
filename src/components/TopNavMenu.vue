<template>
  <div class="top-nav-menu">
    <div class="nav-container">
      <!-- Logo 区域 -->
      <div class="logo-section" @click="handleLogoClick">
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import {
  User,
  ArrowDown,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

// 不再需要emit事件，直接在组件内处理所有逻辑
const activeMenu = ref('')

// 由于菜单不再使用路由导航，activeMenu由点击事件直接控制
// 不再需要监听路由变化

// 菜单配置数据
const menuItems = ref([
  {
    code: 'gfs',
    name: '脚本',
    icon: 'fas fa-file-code',
    description: '脚本文件管理和版本控制'
  },
  {
    code: 'jao',
    name: '作业',
    icon: 'fas fa-tasks',
    description: '自动化作业编排和调度管理'
  },
  {
    code: 'cmd',
    name: '命令',
    icon: 'fas fa-terminal',
    description: '系统命令管理和执行'
  },
  {
    code: 'cac',
    name: '系统巡检',
    icon: 'fas fa-search',
    description: '系统配置审计与合规性检查'
  },
  {
    code: 'password',
    name: '密码管理',
    icon: 'fas fa-key',
    description: '密码策略和安全管理'
  },
  {
    code: 'sudo',
    name: 'sudo权限管理',
    icon: 'fas fa-user-shield',
    description: 'sudo权限分配和管理'
  },
  {
    code: 'acm',
    name: '资产管理',
    icon: 'fas fa-server',
    description: 'IT基础设施资产管理'
  },
  {
    code: 'patches',
    name: '补丁管理',
    icon: 'fas fa-download',
    description: '系统补丁和更新管理'
  },
  {
    code: 'software',
    name: '软件管理',
    icon: 'fas fa-box',
    description: '软件包安装和管理'
  },
  {
    code: 'workflow',
    name: '流程管理',
    icon: 'fas fa-project-diagram',
    description: '业务流程设计和管理'
  },
  {
    code: 'users',
    name: '用户管理',
    icon: 'fas fa-users',
    description: '用户账户和权限管理'
  }
])

const displayUserName = computed(() => {
  if (!props.user) return '未登录'
  return props.user.firstName || props.user.login || '用户'
})

const handleMenuClick = (menu) => {
  activeMenu.value = menu.code

  // 更新浏览器URL
  router.push(`/${menu.code}`)

  // 触发iframe弹窗显示模块
  const event = new CustomEvent('showAngularModuleContainer', {
    detail: {
      moduleCode: menu.code, // 使用实际的菜单代码
      title: menu.name
    }
  })
  window.dispatchEvent(event)

  console.log('🚀 Menu clicked, showing iframe for:', menu.name, 'with module code:', menu.code)
  console.log('🔗 Browser URL updated to:', `/${menu.code}`)
}

const handleLogoClick = () => {
  // 清除活跃菜单
  activeMenu.value = ''

  // 关闭任何打开的iframe弹窗
  const event = new CustomEvent('closeAngularModuleContainer')
  window.dispatchEvent(event)

  // 导航到home页面
  router.push('/home')

  console.log('🏠 Logo clicked, returning to home')
  console.log('🔗 Browser URL updated to: /home')
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

const handleClearHighlight = () => {
  activeMenu.value = ''
  console.log('🧭 Menu highlight cleared')
}

// 生命周期
onMounted(() => {
  window.addEventListener('clearMenuHighlight', handleClearHighlight)
  console.log('🧭 TopNavMenu mounted')
})

onUnmounted(() => {
  window.removeEventListener('clearMenuHighlight', handleClearHighlight)
  console.log('🧭 TopNavMenu unmounted')
})
</script>

<style scoped lang="scss">
.top-nav-menu {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1001;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  padding: 0 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: rgba(24, 144, 255, 0.1);
  }

  /* 水波纹效果 */
  &:active {
    transform: scale(0.98);
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(24, 144, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:active::before {
    width: 200px;
    height: 200px;
  }
}

.logo-placeholder {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  margin: 0;
}

.main-nav {
  flex: 1;
  margin: 0 24px;
}

.nav-list {
  display: flex;
  align-items: center;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  position: relative;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    background: rgba(24, 144, 255, 0.1);
  }

  &.active {
    background: rgba(24, 144, 255, 0.15);

    .nav-link {
      color: #1890ff;
    }
  }

  /* 水波纹效果 */
  &:active {
    transform: scale(0.98);
  }

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(24, 144, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.5s, height 0.5s;
    pointer-events: none;
    z-index: 0;
  }

  &:active::before {
    width: 120px;
    height: 120px;
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  color: #595959;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.3s ease;
  position: relative;
  z-index: 1;
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
  flex: 0 0 auto;
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

  .user-name {
    display: none;
  }
}
</style>
