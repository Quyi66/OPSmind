<template>
  <div class="main-layout">
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
        <!-- 如果有选中的菜单项，显示iframe -->
        <AngularModuleInlineFrame
          v-if="activeMenuItem"
          :module-code="activeMenuItem"
          :module-title="currentMenuItemTitle"
          class="module-frame"
        />

        <!-- 否则显示默认的路由视图（仪表盘） -->
        <router-view v-else class="router-view" />
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
import { useRouter } from 'vue-router'
import TopNavMenu from '@/components/TopNavMenu.vue'
import SideMenu from '@/components/SideMenu.vue'
import AngularModuleInlineFrame from '@/components/AngularModuleInlineFrame.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useMenuStore } from '@/stores/menu.js'

const dashboardStore = useDashboardStore()
const router = useRouter()
const menuStore = useMenuStore()

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
