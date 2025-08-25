<template>
  <div class="main-layout">
    <!-- 顶部菜单 -->
    <TopNavMenu
      :user="currentUser"
    />

    <!-- 主体区域 -->
    <div class="main-body">
      <!-- 左侧菜单 -->
      <SideMenu
        v-if="showSideMenu"
        :active-group="activeGroup"
        :active-menu-item="activeMenuItem"
        @menu-item-click="handleMenuItemClick"
        @collapse-change="handleSideMenuCollapse"
        class="side-menu-container"
      />

      <!-- 主内容区域 -->
      <div class="main-content" :class="{ 'with-side-menu': showSideMenu }">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TopNavMenu from '@/components/TopNavMenu.vue'
import SideMenu from '@/components/SideMenu.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useMenuStore } from '@/stores/menu.js'

const dashboardStore = useDashboardStore()
const menuStore = useMenuStore()

const currentUser = computed(() => dashboardStore.currentUser)
const showSideMenu = computed(() => menuStore.showSideMenu)
const activeGroup = computed(() => menuStore.activeGroup)
const activeMenuItem = computed(() => menuStore.activeMenuItem)

// 处理左侧菜单项点击
const handleMenuItemClick = (menuItem) => {
  console.log('🎯 Main layout received menu item click:', menuItem.name)
  menuStore.setActiveMenuItem(menuItem.code)
}

// 处理左侧菜单折叠状态变化
const handleSideMenuCollapse = (collapsed) => {
  menuStore.setSideMenuCollapsed(collapsed)
}
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.side-menu-container {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;

  &.with-side-menu {
    // 当有左侧菜单时的样式调整
    background: #fff;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .main-body {
    position: relative;
  }

  .side-menu-container {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .main-content.with-side-menu {
    // 移动端时主内容区域不需要特殊处理，左侧菜单为浮层
    position: relative;
  }
}
</style>
