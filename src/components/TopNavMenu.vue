<template>
  <div class="top-nav-wrapper">
    <!-- Header -->
    <header class="top-nav-header">
      <div class="nav-container">
        <div class="nav-left">
          <!-- Logo Section -->
          <div class="logo-section">
            <div class="logo-icon">
              <span class="logo-text">OP</span>
            </div>
            <span class="brand-name">OPSmind</span>
          </div>

          <!-- Navigation Menu -->
          <nav class="nav-menu">
            <!-- 首页菜单项 -->
            <a
              href="#"
              class="nav-item"
              :class="{ 'nav-item-active': activeGroup === '' }"
              @click.prevent="handleHomeClick"
            >
              <span class="nav-icon nav-icon-home"></span>
              <span class="nav-text">{{ homeMenu.name }}</span>
            </a>

            <!-- 分组菜单项 -->
            <a
              v-for="group in menuGroups"
              :key="group.code"
              href="#"
              class="nav-item"
              :class="{ 'nav-item-active': activeGroup === group.code }"
              @click.prevent="handleGroupClick(group)"
            >
              <span class="nav-icon" :class="getMenuIconColor(group.code)"></span>
              <span class="nav-text">{{ group.name }}</span>
            </a>
          </nav>

          <!-- Mobile Menu Button -->
          <button
            @click="toggleMobileMenu"
            class="mobile-menu-btn"
            :class="{ 'mobile-menu-btn-active': showMobileMenu }"
          >
            <svg class="mobile-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Right Side User Area -->
        <div class="nav-right">
          <!-- Status Indicator -->
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">A OPS</span>
          </div>

          <!-- Notification Button -->
          <div class="notification-wrapper">
            <button
              @click="handleNotificationClick"
              class="notification-btn"
            >
              <svg class="notification-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              <!-- Notification Badge -->
              <span
                v-if="notificationCount > 0"
                class="notification-badge"
              >
                {{ notificationCount > 99 ? '99+' : notificationCount }}
              </span>
            </button>
          </div>

          <!-- User Dropdown -->
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <div class="user-dropdown-trigger">
              <el-avatar :size="32" class="user-avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="user-name">{{ displayUserName }}</span>
              <svg class="dropdown-arrow" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
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

      <!-- Mobile Menu Dropdown -->
      <div
        v-if="showMobileMenu"
        class="mobile-menu-dropdown"
      >
        <nav class="mobile-nav">
          <!-- 首页菜单项 -->
          <a
            href="#"
            class="mobile-nav-item"
            :class="{ 'mobile-nav-item-active': activeGroup === '' }"
            @click.prevent="handleHomeClick"
          >
            <span class="mobile-nav-icon mobile-nav-icon-home"></span>
            <span class="mobile-nav-text">{{ homeMenu.name }}</span>
          </a>

          <!-- 分组菜单项 -->
          <a
            v-for="group in menuGroups"
            :key="group.code"
            href="#"
            class="mobile-nav-item"
            :class="{ 'mobile-nav-item-active': activeGroup === group.code }"
            @click.prevent="handleGroupClick(group)"
          >
            <span class="mobile-nav-icon" :class="getMenuIconColor(group.code)"></span>
            <span class="mobile-nav-text">{{ group.name }}</span>
          </a>
        </nav>
      </div>
    </header>
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

// 通知相关状态
const notificationCount = ref(3) // 示例通知数量

// 移动菜单状态
const showMobileMenu = ref(false)

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

// 获取菜单图标颜色
const getMenuIconColor = (groupCode) => {
  const colorMap = {
    'automation': 'bg-yellow-500',
    'patch-testing': 'bg-purple-500',
    'system-inspection': 'bg-blue-500',
    'asset-management': 'bg-yellow-600',
    'user-management': 'bg-green-500'
  }
  return colorMap[groupCode] || 'bg-gray-500'
}

// 处理通知点击
const handleNotificationClick = () => {
  console.log('🔔 Notification clicked')
  ElMessage.info('通知功能开发中...')
  // 这里可以打开通知面板或跳转到通知页面
}

// 切换移动菜单
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  console.log('📱 Mobile menu toggled:', showMobileMenu.value)
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
// 顶部导航包装器
.top-nav-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

// 顶部导航头部
.top-nav-header {
  background: #fff;
  position: relative;
}

// 导航容器
.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
  max-width: 100%;
  margin: 0 auto;
}

// 左侧导航区域
.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
  min-width: 0; // 防止flex子元素溢出
}

// Logo区域
.logo-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.logo-icon {
  width: 2rem;
  height: 2rem;
  background: #2563eb;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

// 导航菜单
.nav-menu {
  display: none;
  align-items: center;
  gap: 0.25rem;

  @media (min-width: 768px) {
    display: flex;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin: 0 0.25rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.nav-item-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.nav-icon {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  flex-shrink: 0;

  &.nav-icon-home {
    background: #f97316;
  }
}

.nav-text {
  font-size: 0.875rem;
  font-weight: 500;
}

// 移动端菜单按钮
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  @media (min-width: 768px) {
    display: none;
  }

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.mobile-menu-btn-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.mobile-menu-icon {
  width: 1.5rem;
  height: 1.5rem;
}

// 右侧导航区域
.nav-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;

  @media (min-width: 640px) {
    gap: 1rem;
  }
}

// 状态指示器
.status-indicator {
  display: none;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;

  @media (min-width: 640px) {
    display: flex;
  }
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: #10b981;
  border-radius: 50%;
}

.status-text {
  font-size: 0.875rem;
  color: #374151;
}

// 通知按钮
.notification-wrapper {
  position: relative;
}

.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
  position: relative;

  &:hover {
    color: #6b7280;
  }
}

.notification-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.notification-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: #ef4444;
  color: #fff;
  font-size: 0.75rem;
  border-radius: 50%;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

// 用户下拉菜单
.user-dropdown {
  cursor: pointer;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: #f9fafb;
  }
}

.user-avatar {
  border: 2px solid #e5e7eb;
  transition: border-color 0.2s ease-in-out;

  &:hover {
    border-color: #d1d5db;
  }
}

.user-name {
  display: none;
  font-size: 0.875rem;
  color: #374151;

  @media (min-width: 640px) {
    display: inline;
  }
}

.dropdown-arrow {
  display: none;
  width: 1rem;
  height: 1rem;
  color: #9ca3af;

  @media (min-width: 640px) {
    display: inline;
  }
}

// 移动端菜单下拉
.mobile-menu-dropdown {
  display: block;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;

  @media (min-width: 768px) {
    display: none;
  }
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.mobile-nav-item-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.mobile-nav-icon {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  flex-shrink: 0;

  &.mobile-nav-icon-home {
    background: #f97316;
  }
}

.mobile-nav-text {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
