<template>
  <div class="main-layout" :class="{ 'is-home': isHomeRoute }">
    <!-- 顶部菜单 -->
    <TopNavMenu
      :user="currentUser"
      class="main-header"
    />

    <!-- 主体区域 -->
    <div class="main-body">
      <div class="main-container">
      <!-- 左侧菜单 -->
      <SideMenu
        v-if="showSideMenu"
        :active-group="activeGroup"
        :active-menu-item="activeMenuItem"
        @menu-item-click="handleMenuItemClick"
        class="side-menu-container"
      />

      <!-- 主内容区域 -->
      <div class="main-content" :class="{ 'with-side-menu': showSideMenu }">
        <!-- 模块内嵌头部（仅文字标题 + 关闭按钮） -->
        <div v-if="showModuleToolbar" class="module-toolbar">
          <div class="module-toolbar-title">{{ moduleTitleText }}</div>
          <button class="module-toolbar-close" @click="handleCloseModule" aria-label="关闭">×</button>
        </div>

        <!-- 如果有选中的菜单项，显示iframe -->
        <AngularModuleInlineFrame
          v-if="activeMenuItem"
          :module-code="activeMenuItem"
          :module-title="currentMenuItemTitle"
          class="module-frame"
        />

        <!-- 仅在首页且未选模块时展示仪表盘 -->
        <router-view v-else-if="shouldShowDashboard" class="router-view" />

        <!-- 其他情况下保持占位，避免闪回仪表盘 -->
        <div v-else class="module-loading-placeholder">模块加载中…</div>
      </div>
      </div>
    </div>

    <!-- 移动端侧边栏遮罩 -->
    <div
      v-if="showSideMenu && isMobile"
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TopNavMenu from '@/components/layout/TopNavMenu.vue'
import SideMenu from '@/components/layout/SideMenu.vue'
import AngularModuleInlineFrame from '@/components/angular/AngularModuleInlineFrame.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useMenuStore } from '@/stores/menu.js'

const dashboardStore = useDashboardStore()
const router = useRouter()
const menuStore = useMenuStore()
const route = useRoute()

// 响应式状态
const isMobile = ref(false)

// 计算属性
const currentUser = computed(() => dashboardStore.currentUser)
const showSideMenu = computed(() => menuStore.showSideMenu)
const activeGroup = computed(() => menuStore.activeGroup)
const activeMenuItem = computed(() => menuStore.activeMenuItem)
const currentMenuItemTitle = computed(() => {
  const menuItem = menuStore.currentMenuItem
  return menuItem ? menuItem.name : ''
})
const shouldShowDashboard = computed(() => !activeMenuItem.value && isHomeRoute.value)

// 是否为首页（仪表盘）路由
const isHomeRoute = computed(() => route.path === '/home' || route.path === '/')

// 是否展示设置相关的模块工具栏
const showModuleToolbar = computed(() => ['settings', 'ssc'].includes(activeMenuItem.value))

// 标题文本：settings -> 个人资料；ssc -> 系统设置
const moduleTitleText = computed(() => {
  if (activeMenuItem.value === 'settings') return '个人资料'
  if (activeMenuItem.value === 'ssc') return '系统设置'
  return ''
})

// 方法
const handleMenuItemClick = menuItem => {
  console.log('🎯 Main layout received menu item click:', menuItem.name)
  menuStore.setActiveMenuItem(menuItem.code)
  try { router.push(`/${menuItem.code}`) } catch {}
}

const closeMobileMenu = () => {
  if (isMobile.value) {
    menuStore.hideSideMenu()
  }
}

// 关闭当前内嵌模块（返回首页）
const handleCloseModule = () => {
  try {
    menuStore.clearActiveMenu()
    router.push('/home')
  } catch (e) {}
}

// 仅保留标题显示，不提供标签切换

// 检查是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 生命周期
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped lang="scss">
// 主布局容器
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; // 动态视口高度，更好地处理移动端地址栏
  background-color: #f5f6fa;
  overflow: hidden;
}

/* 首页（仪表盘）去除左侧纵向分割线 */
.main-layout.is-home :deep(.side-menu) {
  border-right: none !important;
  box-shadow: none !important;
}

/* 首页隐藏侧边菜单容器，避免出现可交互的细条区域 */
.main-layout.is-home .side-menu-container {
  display: none !important;
}

// 顶部导航
.main-header {
  flex-shrink: 0;
  z-index: 1000;
}

// 主体区域
.main-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

/* 定宽居中主容器 */
.main-container {
  display: flex;
  flex: 1;
  min-width: 0;
  max-width: var(--app-max-width);
  margin: 0 auto;
  padding-left: 16px;
  padding-right: 16px;
}

@media (min-width: 1600px) {
  .main-container {
    /* 仅在大屏（27寸等）为底部预留留白 */
    padding-bottom: 24px;
  }
}

// 侧边菜单容器
.side-menu-container {
  /* 根据业务状态控制显示，取消全局隐藏以恢复二级左侧菜单 */
  flex-shrink: 0;
  z-index: 200;
  transition: transform 0.3s ease-in-out;

  @media (max-width: 768px) {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
    transform: translateX(0);

    &.hidden {
      transform: translateX(-100%);
    }
  }
}

// 主内容区域
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  transition: all 0.3s ease-in-out;
  /* 底部留白由 .main-container 控制 */

  &.with-side-menu {
    background: #fff;

    @media (min-width: 769px) {
      // 桌面端时，主内容区域不需要额外处理
    }

    @media (max-width: 768px) {
      // 移动端时，主内容区域保持原位，侧边栏为浮层
      position: relative;
    }
  }
}

// 路由视图
.router-view {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

// 模块框架
.module-frame {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: none;
  background: #fff;
}

.module-loading-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}

/* 内嵌模块顶部工具栏 */
.module-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: transparent;
  border-bottom: none;
  padding: 8px 0;
}

.module-toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.module-toolbar-close {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  color: #9ca3af;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color .2s, color .2s;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }
}

// 移动端遮罩层
.mobile-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;
  opacity: 1;
  transition: opacity 0.3s ease-in-out;

  @media (min-width: 769px) {
    display: none;
  }
}

// 响应式优化
@media (max-width: 768px) {
  .main-layout {
    height: 100vh; // 移动端使用标准视口高度
  }

  .main-body {
    overflow: hidden;
  }
}

// 平板端优化
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    padding: 0;
  }
}

// 大屏幕优化
@media (min-width: 1200px) {
  .main-content {
    max-width: none;
  }
}

// 高度优化
@media (max-height: 600px) {
  .main-layout {
    height: 100vh;
  }
}

// 横屏移动端优化
@media (max-width: 768px) and (orientation: landscape) {
  .main-layout {
    height: 100vh;
  }
}
</style>
