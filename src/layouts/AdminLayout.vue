<template>
  <div class="admin-layout">
    <!-- 左侧二级菜单 -->
    <aside class="admin-sider">
      <!-- 左侧顶部 Logo -->
      <div class="sider-header" @click="goHome" title="KoreOPS">
        <img :src="logoImage" alt="KoreOPS" class="sider-logo" />
        <span class="sider-brand-name">KoreOPS</span>
      </div>
      <el-menu
        :key="`menu-${activeGroup}`"
        class="admin-menu"
        :default-openeds="defaultOpeneds"
        :default-active="activePage"
        :unique-opened="true"
        @select="onMenuSelect"
      >
        <el-sub-menu v-for="group in menu" :key="group.code" :index="group.code">
          <template #title>
            <i v-if="group.icon" :class="['menu-icon', group.icon]"></i>
            <span class="group-title">{{ group.name }}</span>
          </template>
          <el-menu-item v-for="item in group.children" :key="item.code" :index="item.code">
            <i v-if="item.icon" :class="['menu-icon', item.icon]"></i>
            <span>{{ item.name }}</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 内容区域 -->
    <div class="admin-main">
      <!-- 顶部（右侧）工具栏：Logo / 搜索 / 通知 / 用户菜单 -->
      <header class="admin-header">
        <div class="admin-header-right">
          <!-- 搜索框 -->
          <div class="search-wrapper">
            <el-input
              v-model="adminSearch"
              placeholder="搜索..."
              clearable
              size="small"
              class="nav-search"
              @keyup.enter="handleAdminSearch"
            >
              <template #suffix>
                <el-icon class="search-icon"><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 通知 -->
          <div class="notification-wrapper">
            <el-tooltip content="通知" placement="bottom">
              <button @click="handleNotificationClick" class="notification-btn" aria-label="通知">
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

          <!-- 用户菜单 -->
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <div class="user-dropdown-trigger">
              <el-avatar
                :size="24"
                shape="circle"
                :fit="'cover'"
                class="user-avatar"
                :src="avatarImage"
              ></el-avatar>
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
                <el-dropdown-item command="admin">
                  <el-icon>
                    <User />
                  </el-icon>
                  管理后台
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
        </div>
      </header>

      <!-- 主体内容 -->
      <main class="admin-content">
        <div class="admin-content-inner">
          <component :is="currentComponent" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ADMIN_MENU_CONFIG, getDefaultAdminTarget } from '@/config/admin-menu.config'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'
import logoImage from '@/assets/icons/logo.png'
import avatarImage from '@/assets/icons/avatar@2x.png'
import { Search, User, SwitchButton } from '@element-plus/icons-vue'

// 基本菜单
const menu = ADMIN_MENU_CONFIG

const router = useRouter()
const route = useRoute()

// 顶部（右侧）工具栏逻辑
const adminSearch = ref('')
const handleAdminSearch = () => {
  const q = (adminSearch.value || '').trim()
  if (!q) return
  ElMessage.info(`搜索功能开发中：${q}`)
}

const notificationCount = ref(0)
const handleNotificationClick = () => {
  ElMessage.info('通知功能开发中...')
}

const displayUserName = computed(() => {
  const u = authService.getCurrentUser()
  if (!u) return '未登录'
  return u.fullName || u.firstName || u.name || u.login || '用户'
})

const goHome = () => router.push('/home')

const handleUserCommand = command => {
  switch (command) {
    case 'profile':
      router.push('/settings')
      break
    case 'admin': {
      try {
        const base = import.meta.env.BASE_URL || '/'
        const token = authService.getToken()
        const tokenParam = 'token'
        const q = token ? `?${tokenParam}=${encodeURIComponent(token)}&vue_auth=true` : ''
        const url = `${base}${q}#/admin`
        window.open(url, '_blank', 'noopener')
      } catch {}
      break
    }
    case 'logout':
      authService.logout()
      break
  }
}

// 选中状态（由路由驱动）
const activeGroup = ref('')
const activePage = ref('')
const defaultOpeneds = computed(() => (activeGroup.value ? [activeGroup.value] : []))

// 当前二级菜单名称（用于更新浏览器 Tab 标题）
const currentSubTitle = computed(() => {
  const g = menu.find(m => m.code === activeGroup.value)
  if (!g) return ''
  const c = (g.children || []).find(it => it.code === activePage.value)
  return c?.name || ''
})

function syncFromRoute() {
  const g = String(route.params.group || '')
  const p = String(route.params.page || '')
  if (g && p) {
    activeGroup.value = g
    activePage.value = p
    return true
  }
  return false
}

function normalizeOrRedirect() {
  // 若路由缺少参数或非法，跳转到默认
  const ok = syncFromRoute()
  const valid = menu.some(
    g => g.code === activeGroup.value && g.children?.some(c => c.code === activePage.value)
  )
  if (!ok || !valid) {
    const def = getDefaultAdminTarget()
    router.replace(`/admin/${def.groupCode}/${def.pageCode}`)
  }
}

onMounted(() => {
  normalizeOrRedirect()
  updateDocumentTitle()
})

watch(
  () => route.fullPath,
  () => {
    syncFromRoute()
    updateDocumentTitle()
  }
)

function updateDocumentTitle() {
  try {
    const sub = currentSubTitle.value
    document.title = sub ? `KoreOPS - ${sub}` : 'KoreOPS'
  } catch {}
}

// 切换菜单：更新 URL 为 /admin/:group/:page
const onMenuSelect = index => {
  // index 为 pageCode，找到其上级 group
  let foundGroup = activeGroup.value
  for (const g of menu) {
    if (g.children?.some(c => c.code === index)) {
      foundGroup = g.code
      break
    }
  }
  router.push(`/admin/${foundGroup}/${index}`)
}

// 路由-组件映射（根据 group/page 决定内容组件）
const currentComponent = computed(() => {
  if (activeGroup.value === 'assets' && activePage.value === 'auto-config') {
    return AutoConfig
  }
  return AdminPlaceholder
})

// 懒加载/直接导入对应视图
import AutoConfig from '@/views/admin/AutoConfig.vue'

// 兜底占位
const AdminPlaceholder = {
  name: 'AdminPlaceholder',
  template: '<div style="padding:16px;color:#666">请选择左侧菜单</div>'
}
</script>

<style scoped lang="scss">
.admin-layout {
  /* Admin light theme variables */
  --admin-bg: #f5f7fb;
  --admin-surface: #ffffff;
  --admin-border: #eaeef3;
  --admin-muted: #6b7280;
  --admin-text: #1f2937;
  --admin-primary: #2563eb;
  --admin-primary-weak: #eff6ff;

  display: flex;
  height: 100vh;
  background: var(--admin-bg);
}

.admin-sider {
  width: 220px;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
}

.sider-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem; /* 与主页顶部相近的垂直内边距 */
  border-bottom: 1px solid #eef0f3;
  cursor: pointer;
}

.sider-logo {
  height: 28px;
  width: auto;
  transform: translateY(1px);
}

.sider-brand-name {
  color: #1269c3;
  font-family: Inter, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1;
  white-space: nowrap;
}

.admin-menu {
  height: 100%;
  border-right: 0;
}
.admin-sider :deep(.el-menu) {
  border-right: none;
  background-color: transparent;
}
.admin-sider :deep(.el-sub-menu__title),
.admin-sider :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  color: var(--admin-text);
}
.admin-sider :deep(.el-menu-item.is-active) {
  background: var(--admin-primary-weak);
  color: var(--admin-primary);
  border-left: 3px solid var(--admin-primary);
}

.menu-icon {
  width: 16px;
  text-align: center;
  margin-right: 8px;
  color: #6b7280;
}

.group-title {
  font-weight: 600;
  color: #1f2937;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  /* 与主页顶部 .nav-container 对齐的内边距 */
  padding: 0.25rem 1rem;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);
}
.admin-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.search-wrapper {
  width: 220px;
}
.nav-search :deep(.el-input__wrapper) {
  border-radius: 16px;
}
@media (max-width: 992px) {
  .search-wrapper {
    display: none;
  }
}
.notification-wrapper {
  position: relative;
}
.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 6px;
  transition: color 0.2s;
  cursor: pointer;
}
.notification-btn:hover {
  color: #6b7280;
}
.notification-icon {
  width: 18px;
  height: 18px;
}
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}
.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 8px;
}
.user-dropdown-trigger:hover {
  background: #f9fafb;
}
.user-dropdown-trigger :deep(.el-avatar) {
  flex-shrink: 0;
}
.user-avatar {
  width: 24px;
  height: 24px;
}
.user-avatar :deep(img),
.user-avatar :deep(.el-avatar__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.user-name {
  display: inline;
  color: #374151;
  white-space: nowrap;
}
.admin-content {
  flex: 1;
  overflow: auto;
  background: var(--admin-bg);
}
.admin-content-inner {
  max-width: 1440px;
  margin: 12px auto;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  padding: 12px 16px 16px;
}

/* Table and common components polish */
.admin-content-inner :deep(.el-table__header th) {
  background: var(--el-bg-color-page);
  color: var(--admin-text);
}
.admin-content-inner :deep(.el-table__cell),
.admin-content-inner :deep(.el-table__header .cell) {
  font-size: 14px; /* 表格字体整体放大一号 */
}
.admin-content-inner :deep(.el-table .el-table__row:hover > td) {
  background: #fafbff;
}
/* 使用 Element Plus 默认的浅色 primary plain 背景，更现代更轻巧 */
</style>
