<template>
  <div class="top-nav-wrapper">
    <!-- Header -->
    <header class="top-nav-header">
      <div class="nav-container">
        <div class="nav-left">
          <!-- Logo Section -->
          <div class="logo-section">
            <img :src="logoImage" alt="OPSmind" class="brand-logo" />
          </div>

          <!-- Navigation Menu -->
          <nav class="nav-menu">
            <!-- 首页菜单项 -->
            <a href="#" class="nav-item" :class="{ 'nav-item-active': activeGroup === 'home' }"
              @click.prevent="handleHomeClick">
              <img :src="iconHome" alt="首页" class="nav-icon nav-icon-home" />
              <span class="nav-text">{{ homeMenu.name }}</span>
            </a>

            <!-- 分组菜单项 -->
            <a v-for="group in menuGroups" :key="group.code" href="#" class="nav-item"
              v-if="!isStandaloneActive"
              :class="{ 'nav-item-active': activeGroup === group.code }" @click.prevent="handleGroupClick(group)">
              <img :src="getMenuIcon(group.code)" :alt="group.name" class="nav-icon" />
              <span class="nav-text">{{ group.name }}</span>
            </a>
          </nav>

          <!-- Mobile Menu Button -->
          <button @click="toggleMobileMenu" class="mobile-menu-btn"
            :class="{ 'mobile-menu-btn-active': showMobileMenu }">
            <svg class="mobile-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                :d="showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"></path>
            </svg>
          </button>
        </div>

        <!-- Right Side User Area -->
        <div class="nav-right">
          <!-- AI OPS Button -->
          <div class="ai-ops-wrapper" @click="handleAiOpsClick">
            <img :src="aiOpsIcon" alt="AI OPS" class="ai-ops-simple" />
          </div>

          <!-- Notification Button -->
          <div class="notification-wrapper">
            <button @click="handleNotificationClick" class="notification-btn">
              <svg class="notification-icon" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              <!-- Notification Badge -->
              <span v-if="notificationCount > 0" class="notification-badge">
                {{ notificationCount > 99 ? '99+' : notificationCount }}
              </span>
            </button>
          </div>

          <!-- User Dropdown -->
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <div class="user-dropdown-trigger">
              <el-avatar :size="28" class="user-avatar" :src="avatarImage"></el-avatar>
              <span class="user-name">{{ displayUserName }}</span>
              <svg class="dropdown-arrow" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon>
                    <User />
                  </el-icon>
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- Settings Button -->
          <el-tooltip content="设置" placement="bottom">
            <button @click="handleSettingsClick" class="menu-action-btn">
              <el-icon>
                <Setting />
              </el-icon>
            </button>
          </el-tooltip>

          <!-- About Dropdown: hover/click 展开，包含“帮助”和“关于” -->
          <el-dropdown trigger="hover" @command="handleAboutCommand" class="about-dropdown">
            <button class="menu-action-btn" aria-label="关于">
              <el-icon>
                <InfoFilled />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="help" disabled>
                  <el-icon style="margin-right:6px; color:#9ca3af"><QuestionFilled /></el-icon>
                  <span style="color:#9ca3af">帮助</span>
                </el-dropdown-item>
                <el-dropdown-item command="about">
                  <el-icon style="margin-right:6px"><InfoFilled /></el-icon>
                  关于
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- Language Dropdown: 三个选项，全部置灰禁用 -->
          <el-dropdown trigger="hover" class="language-dropdown">
            <button class="menu-action-btn" aria-label="语言">
              <el-icon>
                <svg
                  class="language-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3c3 3.5 3 14.5 0 18" />
                  <path d="M12 3c-3 3.5-3 14.5 0 18" />
                </svg>
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">中文简体</span>
                </el-dropdown-item>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">中文繁体</span>
                </el-dropdown-item>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">English</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-if="showMobileMenu" class="mobile-menu-dropdown">
        <nav class="mobile-nav">
          <!-- 首页菜单项 -->
          <a href="#" class="mobile-nav-item" :class="{ 'mobile-nav-item-active': activeGroup === 'home' }"
            @click.prevent="handleHomeClick">
            <img :src="iconHome" alt="首页" class="mobile-nav-icon mobile-nav-icon-home" />
            <span class="mobile-nav-text">{{ homeMenu.name }}</span>
          </a>

          <!-- 分组菜单项 -->
          <a v-for="group in menuGroups" :key="group.code" href="#" class="mobile-nav-item"
            v-if="!isStandaloneActive"
            :class="{ 'mobile-nav-item-active': activeGroup === group.code }" @click.prevent="handleGroupClick(group)">
            <img :src="getMenuIcon(group.code)" :alt="group.name" class="mobile-nav-icon" />
            <span class="mobile-nav-text">{{ group.name }}</span>
          </a>
        </nav>
      </div>
    </header>

    <!-- About 对话框 -->
    <el-dialog v-model="versionDialogVisible" title="About" width="800px" append-to-body class="about-dialog">
      <el-tabs v-model="aboutActiveTab" class="about-tabs">
        <el-tab-pane label="版本信息" name="versions">
          <div v-loading="versionLoading">
            <el-table :data="versionRows" stripe size="small" class="about-table">
              <el-table-column prop="name" label="名称" width="180" />
              <el-table-column prop="version" label="版本" width="140" />
              <el-table-column prop="build" label="打包时间" />
              <el-table-column prop="code" label="代码版本" width="220" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button type="primary" @click="versionDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import { authService } from '@/core/auth'
import { useMenuStore } from '@/stores/menu.js'
import { User, Setting, SwitchButton, InfoFilled, Check, QuestionFilled } from '@element-plus/icons-vue'

// 导入菜单图标
import iconHome from '@/assets/icons/menu/icon-home@2x.png'
import iconJao from '@/assets/icons/menu/icon-jao@2x.png'
import iconPatch from '@/assets/icons/menu/icon-patch@2x.png'
import iconGfs from '@/assets/icons/menu/icon-gfs@2x.png'
import iconAsset from '@/assets/icons/menu/icon-asset@2x.png'
import iconUser from '@/assets/icons/menu/icon-user@2x.png'

// 导入logo、aiOPS图标和用户头像
import logoImage from '@/assets/icons/logo@2x.png'
import aiOpsIcon from '@/assets/icons/aiOPS@2x.png'
import avatarImage from '@/assets/icons/avatar@2x.png'

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
const isStandaloneActive = computed(() => ['settings', 'ssc'].includes(menuStore.activeMenuItem))

const displayUserName = computed(() => {
  if (!props.user) return '未登录'
  return props.user.firstName || props.user.login || '用户'
})

// 通知相关状态 - 默认无未读
const notificationCount = ref(0)

// 移动菜单状态
const showMobileMenu = ref(false)

// 语言切换状态（暂不真正切换，仅提示开发中）
const currentLanguage = ref('zh-cn')

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
const handleGroupClick = group => {
  console.log('🚀 Group clicked:', group.name, 'with code:', group.code)

  // 如果点击的是当前激活的分组，则切换显示/隐藏左侧菜单
  if (activeGroup.value === group.code) {
    menuStore.toggleSideMenu()
  } else {
    // 否则激活新的分组
    menuStore.setActiveGroup(group.code)
  }
}

// 获取菜单图标
const getMenuIcon = groupCode => {
  const iconMap = {
    automation: iconJao,
    'patch-testing': iconPatch,
    'system-inspection': iconGfs,
    'asset-management': iconAsset,
    'user-management': iconUser
  }
  return iconMap[groupCode] || iconHome
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
      // 通过 Inline Iframe 打开 Angular 基座的 /#/settings
      try {
        menuStore.setActiveMenuItem('settings')
      } catch (e) {}
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

// 处理设置按钮点击
const handleSettingsClick = () => {
  // 顶部“设置”按钮：通过 Inline Iframe 打开 /#/ssc
  try {
    menuStore.setActiveMenuItem('ssc')
  } catch (e) {}
}

// 处理AI OPS按钮点击
const handleAiOpsClick = () => {
  console.log('🤖 AI OPS clicked')
  ElMessage.info('AI OPS功能开发中...')
  // 这里可以打开AI OPS页面或弹窗
}

// 处理关于下拉菜单命令
const versionDialogVisible = ref(false)
const versionLoading = ref(false)
const versionRows = ref([])
const aboutActiveTab = ref('versions')

const handleAboutCommand = async (command) => {
  console.log('ℹ️ About command:', command)
  switch (command) {
    case 'help':
      // 当前不提供帮助入口，提示开发中
      ElMessage.info('帮助开发中...')
      break
    case 'about':
      await openVersionDialog()
      break
  }
}

async function openVersionDialog() {
  try {
    versionLoading.value = true
    versionDialogVisible.value = true
    // 按优先级尝试多种可用地址
    const candidates = []
    try {
      const angularBase = appUrlManager.getAngularBaseUrl() || '/oplus/base'
      candidates.push(`${angularBase}/app/modules/VERSION.json`)
    } catch {}
    candidates.push(`${window.location.origin}/oplus/base/app/modules/VERSION.json`)
    candidates.push('http://localhost:18080/oplus/base/app/modules/VERSION.json')

    let data = null
    let lastErr = null
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache', mode: 'cors' })
        if (res.ok) {
          data = await res.json()
          break
        } else {
          lastErr = new Error(`HTTP ${res.status} for ${url}`)
        }
      } catch (e) {
        lastErr = e
      }
    }
    if (!data) throw lastErr || new Error('无法获取版本信息')

    const versions = data?.versions || {}
    const builds = data?.builds || {}
    // 仅展示存在版本信息的条目
    const names = Object.keys(versions).sort()
    versionRows.value = names.map(name => ({
      name,
      version: versions[name],
      build: builds[name] ? `#${builds[name]}` : '-',
      code: '-'
    }))
  } catch (e) {
    console.error('加载版本信息失败:', e)
    ElMessage.error('版本信息加载失败')
  } finally {
    versionLoading.value = false
  }
}

// 处理语言切换（仅提示开发中）
const handleLanguageCommand = (_language) => {
  ElMessage.info('语言功能开发中...')
}

// 监听路由变化，自动设置菜单状态
watch(
  () => route.path,
  newPath => {
    console.log('🧭 Route changed to:', newPath)
    menuStore.setMenuFromRoute(newPath)
  },
  { immediate: true }
)

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
/* About 对话框尺寸与滚动 */
.about-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow: auto;
  padding-top: 8px;
}

/* 表头深色背景，强调区分 */
.about-table :deep(.el-table__header th) {
  background-color: #eef2f7;
  color: #374151;
  font-weight: 600;
}

/* 去掉竖直分隔线（未启用 border，本行做额外保险） */
.about-table :deep(.el-table__row > td) {
  border-right: none !important;
}

/* 去掉表格顶部额外的横线 */
.about-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}
// 顶部导航包装器
.top-nav-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  /* 顶部条左右留白区域使用与外围一致的背景 */
  background: var(--app-surround-bg);
}

// 顶部导航头部
.top-nav-header {
  /* 顶部菜单栏占满宽度（整条白底） */
  background: #fff;
  position: relative;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

// 导航容器
.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 与内容区对齐：左右内边距与主容器一致 */
  padding: 0.5rem 1rem; /* 16px */
  /* 顶部菜单与内容区使用相同的定宽容器 */
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  /* 让白底来自整条 header，容器透明，仅负责对齐 */
  background: transparent;
  border-bottom: none;
  box-shadow: none;
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
  flex-shrink: 0;
}

.brand-logo {
  height: 2rem;
  width: auto;
  object-fit: contain;
  object-position: center;
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
  object-fit: contain;

  &.nav-icon-home {
    // 首页图标特殊样式可以在这里添加
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
  gap: 0.25rem;
  flex-shrink: 0;

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
}

// AI OPS按钮
// AI OPS简单样式 - 模仿logo的实现
.ai-ops-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.375rem;
  transition: background 0.2s ease-in-out;

  &:hover {
    background: #f9fafb;
  }
}

.ai-ops-simple {
  height: 1.25rem;
  width: auto;
  object-fit: contain;
  object-position: center;
}

// 通知按钮
.notification-wrapper {
  position: relative;
}

.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
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
  width: 1rem;
  height: 1rem;
}

.notification-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  border-radius: 50%;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

// 菜单操作按钮
.menu-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  width: 1.75rem;
  height: 1.75rem;

  &:hover {
    color: #6b7280;
    background: #f9fafb;
  }

  .el-icon {
    font-size: 1rem;
  }
}

// 语言下拉菜单
.language-dropdown {
  .el-dropdown-menu__item {
    &.is-active {
      color: #2563eb;
      background-color: #eff6ff;
      font-weight: 500;
    }
  }
}

// 用户下拉菜单
.user-dropdown {
  cursor: pointer;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.375rem;
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

  @media (min-width: 768px) {
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

// Language icon sizing within el-icon
.language-icon {
  width: 1rem;
  height: 1rem;
  display: block;
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
  object-fit: contain;

  &.mobile-nav-icon-home {
    // 首页图标特殊样式可以在这里添加
  }
}

.mobile-nav-text {
  font-size: 0.875rem;
  font-weight: 500;
}

/* 大屏（27寸等 ≥1600px）放大排版与触控目标 */
@media (min-width: 1600px) {
  .nav-container {
    padding: 0.75rem 2rem;
  }

  .nav-left {
    gap: 2.5rem;
  }

  .brand-logo {
    height: 2.5rem;
  }

  .nav-menu {
    gap: 0.5rem;
  }

  .nav-item {
    gap: 0.625rem;
    padding: 0.625rem 1rem;
  }

  .nav-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .nav-text {
    font-size: 1rem;
  }

  .ai-ops-simple {
    height: 1.5rem;
  }

  .notification-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .notification-badge {
    width: 1.1rem;
    height: 1.1rem;
    font-size: 0.75rem;
    top: -0.3rem;
    right: -0.3rem;
  }

  .menu-action-btn {
    width: 2rem;
    height: 2rem;

    .el-icon {
      font-size: 1.125rem;
    }
  }

  .language-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .user-dropdown-trigger {
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .user-name {
    font-size: 1rem;
  }

  .dropdown-arrow {
    width: 1.1rem;
    height: 1.1rem;
  }
}

/* 超宽屏（≥1920px）进一步放大 */
@media (min-width: 1920px) {
  .nav-container {
    padding: 1rem 2.5rem;
  }

  .brand-logo {
    height: 2.75rem;
  }

  .nav-item {
    padding: 0.75rem 1.1rem;
  }

  .nav-icon {
    width: 1.35rem;
    height: 1.35rem;
  }

  .nav-text {
    font-size: 1.05rem;
  }

  .menu-action-btn {
    width: 2.25rem;
    height: 2.25rem;

    .el-icon {
      font-size: 1.2rem;
    }
  }

  .ai-ops-simple {
    height: 1.75rem;
  }
}
</style>
