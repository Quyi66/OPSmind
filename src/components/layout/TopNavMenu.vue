<template>
  <div class="top-nav-wrapper" :class="{ 'is-home': props.isHomeRoute }">
    <!-- Header -->
    <header class="top-nav-header">
      <div class="nav-container">
        <div class="nav-left">
          <!-- Logo Section -->
          <div class="logo-section">
            <img :src="logoImage" alt="KoreOPS" class="brand-logo" />
            <span class="brand-name">KoreOPS</span>
          </div>

          <!-- Navigation Menu -->
          <nav class="nav-menu">
            <!-- 首页菜单项 -->
            <a
              href="#"
              class="nav-item"
              :class="{ 'nav-item-active': activeGroup === 'home' }"
              @click.prevent="handleHomeClick"
            >
              <img :src="iconHome" alt="首页" class="nav-icon nav-icon-home" />
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
              <img
                v-if="getMenuIcon(group.code)"
                :src="getMenuIcon(group.code)"
                :alt="group.name"
                class="nav-icon"
              />
              <i
                v-else
                :class="['nav-icon', group.icon]"
                :style="{
                  color: getMenuIconColor(group.code),
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }"
              ></i>
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
          <!-- AI OPS Button -->
          <el-tooltip
            content="AI OPS"
            placement="bottom"
            :popper-options="headerTooltipPopperOptions"
          >
            <div class="ai-ops-wrapper" @mouseenter="prewarmAiOps" @click="handleAiOpsClick">
              <img :src="aiOpsIcon" alt="AI OPS" class="ai-ops-simple" />
            </div>
          </el-tooltip>

          <!-- Notification Button -->
          <NotificationPopover
            v-model:visible="notificationPopoverVisible"
            @count-change="handleNotificationCountChange"
          >
            <div class="notification-wrapper">
              <el-tooltip
                content="通知"
                placement="bottom"
                :disabled="notificationPopoverVisible"
                :popper-options="headerTooltipPopperOptions"
              >
                <button class="notification-btn" aria-label="通知">
                  <svg class="notification-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <span v-if="notificationCount > 0" class="notification-badge">
                    {{ notificationCount > 99 ? '99+' : notificationCount }}
                  </span>
                </button>
              </el-tooltip>
            </div>
          </NotificationPopover>

          <!-- User Dropdown -->
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <div class="user-dropdown-trigger">
              <el-avatar :size="24" class="user-avatar" :src="displayAvatarUrl"></el-avatar>
              <span class="user-name">{{ displayUserName }}</span>
              <svg class="dropdown-arrow" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
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
                <!-- <el-dropdown-item command="admin">
                  <el-icon>
                    <Setting />
                  </el-icon>
                  管理后台
                </el-dropdown-item> -->
                <el-dropdown-item divided command="logout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- Theme Switch Button -->
          <el-tooltip
            :content="isDark ? '切换日间模式' : '切换夜间模式'"
            placement="bottom"
            :popper-options="headerTooltipPopperOptions"
          >
            <button @click="toggleDark($event)" class="menu-action-btn">
              <el-icon>
                <Sunny v-if="isDark" />
                <Moon v-else />
              </el-icon>
            </button>
          </el-tooltip>

          <!-- About Dropdown: hover/click 展开，包含“帮助”和“关于” -->
          <!-- <el-dropdown trigger="hover" @command="handleAboutCommand" class="about-dropdown">
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
          </el-dropdown> -->

          <!-- Language Dropdown: 三个选项，全部置灰禁用 -->
          <!-- <el-dropdown trigger="hover" class="language-dropdown">
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
          </el-dropdown> -->
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-if="showMobileMenu" class="mobile-menu-dropdown">
        <nav class="mobile-nav">
          <!-- 首页菜单项 -->
          <a
            href="#"
            class="mobile-nav-item"
            :class="{ 'mobile-nav-item-active': activeGroup === 'home' }"
            @click.prevent="handleHomeClick"
          >
            <img :src="iconHome" alt="首页" class="mobile-nav-icon mobile-nav-icon-home" />
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
            <img
              v-if="getMenuIcon(group.code)"
              :src="getMenuIcon(group.code)"
              :alt="group.name"
              class="mobile-nav-icon"
            />
            <i
              v-else
              :class="['mobile-nav-icon', group.icon]"
              :style="{
                color: getMenuIconColor(group.code),
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }"
            ></i>
            <span class="mobile-nav-text">{{ group.name }}</span>
          </a>
        </nav>
      </div>
    </header>

    <!-- About 对话框 -->
    <el-dialog
      v-model="versionDialogVisible"
      title="About"
      width="800px"
      append-to-body
      class="about-dialog"
    >
      <el-tabs v-model="aboutActiveTab" class="about-tabs">
        <el-tab-pane label="版本信息" name="versions">
          <div v-loading="versionLoading">
            <el-table :data="versionRows" size="small" class="about-table">
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
import { getDefaultAdminTarget } from '@/config/admin-menu.config'
import { authService } from '@/core/auth'
import { accountService } from '@/core/account'
import { getGroupDefaultRoute } from '@/core/auth/permission-policy'
import { useMenuStore } from '@/stores/menu.js'
import { useDashboardStore } from '@/stores/dashboard'
import {
  User,
  SwitchButton,
  InfoFilled,
  Check,
  QuestionFilled,
  Sunny,
  Moon
} from '@element-plus/icons-vue'
import NotificationPopover from '@/components/layout/NotificationPopover.vue'
import { useTheme } from '@/composables/useTheme'
import { toggleAiOpsPanel, prewarmAiOpsPanel, disposeAiOpsPanel } from '@/utils/ai-ops-panel'

// 导入菜单图标
import iconHome from '@/assets/icons/menu/icon-home@2x.png'
import iconJao from '@/assets/icons/menu/icon-jao@2x.png'
import iconGfs from '@/assets/icons/menu/icon-gfs@2x.png'
import iconAsset from '@/assets/icons/menu/icon-asset@2x.png'

// 导入logo、aiOPS图标和用户头像
import logoImage from '@/assets/icons/logo-transparent.png'
import aiOpsIcon from '@/assets/icons/aiOPS@2x.png'
import avatarImage from '@/assets/icons/avatar@2x.png'

const router = useRouter()
const route = useRoute()
const menuStore = useMenuStore()
const dashboardStore = useDashboardStore()
const { isDark, toggleDark } = useTheme()

const props = defineProps({
  user: {
    type: Object,
    default: null
  },
  isHomeRoute: {
    type: Boolean,
    default: false
  }
})

// 计算属性
const homeMenu = computed(() => menuStore.homeMenu)
const menuGroups = computed(() => menuStore.menuGroups)
const activeGroup = computed(() => menuStore.activeGroup)

const accountFullName = ref('')
const userAvatarUrl = ref('')

const displayUserName = computed(() => {
  if (accountFullName.value) return accountFullName.value
  const user = props.user || authService.getCurrentUser() || null
  if (!user) return '未登录'
  return user.fullName || user.firstName || user.name || user.login || '用户'
})

const displayAvatarUrl = computed(() => {
  if (!userAvatarUrl.value) return avatarImage
  return `/sjxy-upload${userAvatarUrl.value}`
})

const notificationCount = ref(0)
const notificationPopoverVisible = ref(false)

const headerTooltipPopperOptions = Object.freeze({
  strategy: 'fixed',
  modifiers: [
    {
      name: 'preventOverflow',
      options: {
        boundary: 'viewport',
        padding: 8
      }
    },
    {
      name: 'flip',
      options: {
        padding: 8,
        fallbackPlacements: ['bottom', 'top', 'bottom-end', 'bottom-start']
      }
    }
  ]
})

const handleNotificationCountChange = count => {
  notificationCount.value = count
}

const showMobileMenu = ref(false)
const currentLanguage = ref('zh-cn')

async function loadAccountInfo(forceRefresh = false) {
  try {
    const account = await accountService.getAccount({ forceRefresh }).catch(() => null)
    if (account) {
      accountFullName.value = account.fullName || account.login || ''
      userAvatarUrl.value = account.imageUrl || ''
    }
  } catch {
    // 忽略错误，保持回退逻辑
  }
}

const handleAccountUpdated = () => {
  void loadAccountInfo(true)
}

onMounted(() => {
  window.addEventListener('account-updated', handleAccountUpdated)
  void loadAccountInfo(false)
})

onUnmounted(() => {
  window.removeEventListener('account-updated', handleAccountUpdated)
})

const handleHomeClick = () => {
  menuStore.setHomeActive()

  const event = new CustomEvent('closeAngularModuleContainer')
  window.dispatchEvent(event)

  router.push('/home')
}

const handleGroupClick = group => {
  if (activeGroup.value === group.code) {
    menuStore.toggleSideMenu()
    return
  }

  menuStore.setActiveGroup(group.code)

  const defaultRoute = getGroupDefaultRoute(group, permission =>
    authService.hasPermission(permission)
  )
  if (defaultRoute) {
    router.push(defaultRoute)
  }
}

const getMenuIcon = groupCode => {
  const iconMap = {
    automation: iconJao,
    'system-inspection': iconGfs,
    'asset-management': iconAsset
  }
  return iconMap[groupCode]
}

const getMenuIconColor = groupCode => {
  const colorMap = {
    'flow-management': '#8b5cf6',
    'security-management': '#F56C6C'
  }
  return colorMap[groupCode] || 'currentColor'
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const handleUserCommand = command => {
  switch (command) {
    case 'profile':
      menuStore.setActiveMenuItem('settings')
      break
    case 'admin': {
      try {
        const base = import.meta.env.BASE_URL || '/'
        const token = authService.getToken()
        const tokenParam = appUrlManager.getTokenParam()
        const query = token ? `?${tokenParam}=${encodeURIComponent(token)}&vue_auth=true` : ''
        const target = getDefaultAdminTarget()
        const path = `#/admin/${target.groupCode}/${target.pageCode}`
        window.open(`${base}${query}${path}`, '_blank', 'noopener')
      } catch (error) {
        console.warn('Failed to open admin page:', error)
      }
      break
    }
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    ElMessage.success('正在安全登出...')
    try {
      accountService.clear()
    } catch {}
    await authService.logout()
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('登出失败')
  }
}

const handleClearHighlight = () => {
  menuStore.clearActiveMenu()
}

const handleAiOpsClick = () => {
  try {
    toggleAiOpsPanel({ title: 'AI OPS' })
  } catch (error) {
    console.warn('Failed to mount/toggle OPS bubble panel:', error)
  }
}

function prewarmAiOps() {
  try {
    prewarmAiOpsPanel()
  } catch {}
}

const versionDialogVisible = ref(false)
const versionLoading = ref(false)
const versionRows = ref([])
const aboutActiveTab = ref('versions')

const handleAboutCommand = async command => {
  switch (command) {
    case 'help':
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

    const candidates = []
    try {
      const angularBase = appUrlManager.getAngularBaseUrl() || '/oplus/base'
      candidates.push(`${angularBase}/app/modules/VERSION.json`)
    } catch {}
    candidates.push(`${window.location.origin}/oplus/base/app/modules/VERSION.json`)
    candidates.push('http://localhost:18080/oplus/base/app/modules/VERSION.json')

    let data = null
    let lastError = null
    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: 'no-cache', mode: 'cors' })
        if (response.ok) {
          data = await response.json()
          break
        }
        lastError = new Error(`HTTP ${response.status} for ${url}`)
      } catch (error) {
        lastError = error
      }
    }

    if (!data) {
      throw lastError || new Error('无法获取版本信息')
    }

    const versions = data?.versions || {}
    const builds = data?.builds || {}
    const names = Object.keys(versions).sort()
    versionRows.value = names.map(name => ({
      name,
      version: versions[name],
      build: builds[name] ? `#${builds[name]}` : '-',
      code: '-'
    }))
  } catch (error) {
    console.error('加载版本信息失败:', error)
    ElMessage.error('版本信息加载失败')
  } finally {
    versionLoading.value = false
  }
}

const handleLanguageCommand = _language => {
  ElMessage.info('语言功能开发中...')
}

watch(
  () => route.path,
  newPath => {
    menuStore.setMenuFromRoute(newPath, route.meta)
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('clearMenuHighlight', handleClearHighlight)
  try {
    if ('requestIdleCallback' in window) {
      // @ts-ignore
      window.requestIdleCallback(() => prewarmAiOps())
    } else {
      setTimeout(() => prewarmAiOps(), 0)
    }
  } catch {}
})

onUnmounted(() => {
  window.removeEventListener('clearMenuHighlight', handleClearHighlight)
  disposeAiOpsPanel()
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
  background: var(--el-bg-color);
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
  gap: 0.75rem;
  /* 与内容区对齐：左右内边距与主容器一致；进一步减小高度 */
  padding: 0.25rem 1rem;
  /* 再次收紧垂直间距 */
  /* 顶部菜单与内容区使用相同的定宽容器 */
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  /* 让白底来自整条 header，容器透明，仅负责对齐 */
  background: transparent;
  border-bottom: none;
  box-shadow: none;
}

.top-nav-wrapper:not(.is-home) .nav-container {
  max-width: none;
  margin: 0;
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
  gap: 0.3rem; /* 微调间距，从 0.25rem 增加到 0.3rem，提供极轻微的呼吸感而不至于割裂 */
  flex-shrink: 0;
}

.brand-logo {
  height: 1.85rem;
  /* shrink logo to reduce header height */
  width: auto;
  object-fit: contain;
  object-position: center;
  transform: translateY(1px);
}

.brand-name {
  color: #1b5ab7; /* 提升色彩纯度，使其与 Logo 的深蓝色波浪色相完全一致 */
  font-family: Inter, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 1.28rem;
  font-weight: 700; /* 从 800 降为 700，减小笔画宽度以释放字内空间 */
  letter-spacing: -0.02em; /* 从 -0.045em 调整为 -0.02em，防止字形在紧凑布局下粘连 */
  line-height: 1;
  white-space: nowrap;
}

:global(html.dark) .brand-name {
  color: #4f8cff;
  text-shadow: 0 0 10px rgba(79, 140, 255, 0.18);
}

:global(html.dark) .brand-logo {
  filter: drop-shadow(0 0 8px rgba(45, 212, 191, 0.16));
}

// 导航菜单
.nav-menu {
  display: none;
  align-items: center;
  gap: 0.25rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.125rem 0;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 768px) {
    display: flex;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  /* 进一步收紧内边距 */
  margin: 0 0.25rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--el-text-color-regular);
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
  flex: 0 0 auto;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }

  &.nav-item-active {
    color: #ea580c;
    background: var(--el-color-warning-light-9);
  }
}

.nav-icon {
  width: 1.25rem;
  /* 放大图标尺寸 */
  height: 1.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  object-fit: contain;
}

.nav-text {
  font-size: 1rem;
  /* 字体放大一档 */
  font-weight: 500;
}

// 移动端菜单按钮
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: var(--el-text-color-regular);
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  @media (min-width: 768px) {
    display: none;
  }

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }

  &.mobile-menu-btn-active {
    color: #ea580c;
    background: var(--el-color-warning-light-9);
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
  margin-left: auto;

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
}

/* (admin 专用) 右侧 Logo 与搜索已从全局头部移除 */

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
    background: var(--el-fill-color-light);
  }
}

.ai-ops-simple {
  height: 1.5rem;
  /* 按要求放大到 1.5rem */
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
  color: var(--el-text-color-placeholder);
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
  position: relative;

  &:hover {
    color: var(--el-text-color-regular);
  }
}

.notification-icon {
  width: 1.25rem;
  /* 放大图标尺寸 */
  height: 1.25rem;
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
  color: var(--el-text-color-placeholder);
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  width: 2rem;
  /* 放大触控目标 */
  height: 2rem;

  &:hover {
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
  }

  .el-icon {
    font-size: 1.25rem;
    /* 放大内部图标 */
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
    background: var(--el-fill-color-light);
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
  font-size: 1rem;
  /* 放大用户名字号 */
  color: #374151;

  @media (min-width: 768px) {
    display: inline;
  }
}

.dropdown-arrow {
  display: none;
  width: 1.25rem;
  /* 放大下拉箭头 */
  height: 1.25rem;
  color: var(--el-text-color-placeholder);

  @media (min-width: 640px) {
    display: inline;
  }
}

@media (max-width: 1440px) {
  .nav-left {
    gap: 1.5rem;
  }

  .nav-menu {
    gap: 0.25rem;
  }

  .nav-item {
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    margin: 0 0.125rem;
  }
}

@media (max-width: 1280px) {
  .nav-container {
    gap: 0.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .nav-left {
    gap: 1rem;
  }

  .nav-item {
    gap: 0.375rem;
    padding: 0.25rem 0.375rem;
  }

  .user-name {
    display: none;
  }

  .nav-right {
    gap: 0.25rem;
  }
}

@media (max-width: 1152px) {
  .nav-left {
    gap: 0.75rem;
  }

  .nav-menu {
    gap: 0.125rem;
  }

  .nav-item {
    padding: 0.25rem 0.3125rem;
  }

  .nav-text {
    font-size: 0.875rem;
  }
}

// Language icon sizing within el-icon
.language-icon {
  width: 1.25rem;
  /* 放大语言图标 */
  height: 1.25rem;
  display: block;
}

// 移动端菜单下拉
.mobile-menu-dropdown {
  display: block;
  background: var(--el-bg-color);
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
  color: var(--el-text-color-regular);
  transition: all 0.2s ease-in-out;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }

  &.mobile-nav-item-active {
    color: #ea580c;
    background: var(--el-color-warning-light-9);
  }
}

.mobile-nav-icon {
  width: 1.25rem;
  /* 移动端图标同步放大 */
  height: 1.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  object-fit: contain;
}

.mobile-nav-text {
  font-size: 1rem;
  /* 移动端字体同步放大 */
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
    height: 2.35rem;
  }

  .brand-name {
    font-size: 1.55rem;
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
    height: 2.55rem;
  }

  .brand-name {
    font-size: 1.7rem;
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
