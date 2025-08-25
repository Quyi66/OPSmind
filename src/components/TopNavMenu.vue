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
          <!-- 首页菜单项 -->
          <li
            class="nav-item"
            :class="{ active: activeGroup === 'home' }"
            @click="handleHomeClick"
          >
            <div class="nav-link">
              <i :class="homeMenu.icon" class="nav-icon"></i>
              <span class="nav-text">{{ homeMenu.name }}</span>
            </div>
          </li>

          <!-- 分组菜单项 -->
          <li
            v-for="group in menuGroups"
            :key="group.code"
            class="nav-item"
            :class="{ active: activeGroup === group.code }"
            @click="handleGroupClick(group)"
          >
            <div class="nav-link">
              <i :class="group.icon" class="nav-icon"></i>
              <span class="nav-text">{{ group.name }}</span>
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
import { useMenuStore } from '@/stores/menu.js'
import {
  User,
  ArrowDown,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const menuStore = useMenuStore()

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

// 计算属性
const homeMenu = computed(() => menuStore.homeMenu)
const menuGroups = computed(() => menuStore.menuGroups)
const activeGroup = computed(() => menuStore.activeGroup)

const displayUserName = computed(() => {
  if (!props.user) return '未登录'
  return props.user.firstName || props.user.login || '用户'
})

// 处理首页菜单点击
const handleHomeClick = () => {
  console.log('🏠 Home clicked')

  // 设置首页为激活状态
  menuStore.setHomeActive()

  // 关闭任何打开的iframe弹窗
  const event = new CustomEvent('closeAngularModuleContainer')
  window.dispatchEvent(event)

  // 导航到home页面
  router.push('/home')
}

// 处理分组菜单点击
const handleGroupClick = (group) => {
  console.log('🚀 Group clicked:', group.name, 'with code:', group.code)

  // 如果点击的是当前激活的分组，则切换显示/隐藏左侧菜单
  if (activeGroup.value === group.code) {
    menuStore.toggleSideMenu()
  } else {
    // 否则激活新的分组
    menuStore.setActiveGroup(group.code)
  }
}

const handleLogoClick = () => {
  // 清除菜单状态
  menuStore.clearActiveMenu()

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
  menuStore.clearActiveMenu()
  console.log('🧭 Menu highlight cleared')
}

// 监听路由变化，自动设置菜单状态
watch(() => route.path, (newPath) => {
  console.log('🧭 Route changed to:', newPath)
  menuStore.setMenuFromRoute(newPath)
}, { immediate: true })

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
