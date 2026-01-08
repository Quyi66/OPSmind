<template>
  <div class="ops-layout">
    <!-- 顶部Header - 横跨整个宽度 -->
    <header class="ops-header">
      <!-- 左侧：Logo + 系统名称 -->
      <div class="header-left">
        <div class="header-logo" @click="handleLogoClick">
          <img :src="logoImage" alt="OPSmind" class="logo-image" />
          <!-- <span class="logo-text">OPSmind</span> -->
        </div>
      </div>

      <!-- 右侧：欢迎信息 + 用户操作 -->
      <div class="header-right">
        <span class="welcome-text">欢迎，{{ displayUserName }}</span>

        <!-- 通知 -->
        <!-- <el-tooltip content="通知" placement="bottom">
          <div class="header-icon-btn">
            <el-badge :value="notificationCount" :hidden="notificationCount === 0" :max="99">
              <el-icon :size="18"><Bell /></el-icon>
            </el-badge>
          </div>
        </el-tooltip> -->

        <!-- 用户下拉菜单 -->
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="28" :src="avatarImage" />
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>个人资料
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>系统设置
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 下方主体区域 -->
    <div class="ops-body">
      <!-- 左侧边栏 -->
      <div class="ops-sidebar-container" :class="{ 'is-collapsed': isCollapsed }">
        <aside class="ops-sidebar">
          <!-- 菜单区域 -->
          <div class="sidebar-menu-wrapper">
            <el-scrollbar>
              <el-menu
                :default-active="activeMenu"
                :collapse="isCollapsed"
                :unique-opened="true"
                class="sidebar-menu"
                background-color="#ffffff"
                text-color="#333333"
                active-text-color="#409eff"
                @select="handleMenuSelect"
              >
                <!-- 首页 -->
                <el-menu-item index="/home" class="menu-item-home">
                  <i class="fas fa-home menu-fa-icon"></i>
                  <template #title>首页</template>
                </el-menu-item>

                <!-- 动态菜单 -->
                <template v-for="menu in menuList" :key="menu.path">
                  <el-sub-menu v-if="menu.children && menu.children.length > 0" :index="menu.path">
                    <template #title>
                      <i :class="menu.faIcon" class="menu-fa-icon"></i>
                      <span>{{ menu.title }}</span>
                    </template>
                    <el-menu-item
                      v-for="child in menu.children"
                      :key="child.path"
                      :index="child.path"
                      class="menu-item-child"
                    >
                      <template #title>{{ child.title }}</template>
                    </el-menu-item>
                  </el-sub-menu>
                  <el-menu-item v-else :index="menu.path">
                    <i :class="menu.faIcon" class="menu-fa-icon"></i>
                    <template #title>{{ menu.title }}</template>
                  </el-menu-item>
                </template>
              </el-menu>
            </el-scrollbar>
          </div>

          <!-- 折叠按钮 -->
          <div class="sidebar-collapse-btn" @click="toggleCollapse">
            <el-icon v-if="isCollapsed"><ArrowRight /></el-icon>
            <el-icon v-else><ArrowLeft /></el-icon>
          </div>
        </aside>

        <!-- 灰色分隔条 -->
        <!-- <div class="sidebar-divider"></div> -->
      </div>

      <!-- 右侧主区域 -->
      <div class="ops-main">
        <!-- TagsView 标签页 -->
        <div class="ops-tags-view">
          <TagsView />
        </div>

        <!-- 主内容区域 -->
        <main class="ops-content">
          <router-view v-slot="{ Component }">
            <keep-alive :include="cachedViews">
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Bell,
  User,
  Setting,
  SwitchButton,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from '@element-plus/icons-vue'

import TagsView from '@/components/layout/TagsView/index.vue'
import { useTagsViewStore } from '@/stores/tagsView'
import { authService } from '@/core/auth'
import { NAV_MENU_LIST } from '@/config/nav-menu.config.js'

// 图片资源
import logoImage from '@/assets/icons/logo@2x.png'
import avatarImage from '@/assets/icons/avatar@2x.png'

const router = useRouter()
const route = useRoute()
const tagsViewStore = useTagsViewStore()

// 响应式状态
const isCollapsed = ref(false)
const notificationCount = ref(0)

// 计算属性
const activeMenu = computed(() => route.path)
const cachedViews = computed(() => tagsViewStore.cachedViews)

const displayUserName = computed(() => {
  const user = authService.getCurrentUser()
  return user?.fullName || user?.login || '用户'
})

// 菜单列表
const menuList = ref(NAV_MENU_LIST)

// 方法
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleLogoClick = () => {
  router.push('/home')
}

const handleMenuSelect = (index) => {
  router.push(index)
}

const handleUserCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/settings')
      break
    case 'settings':
      router.push('/ssc/user')
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    ElMessage.success('正在退出...')
    await authService.logout()
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('退出失败')
  }
}

// 监听路由变化
watch(
  () => route.path,
  () => {
    if (route.name) {
      tagsViewStore.addView(route)
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
// 变量定义
$sidebar-width: 200px;
$sidebar-collapsed-width: 64px;
$header-height: 56px;
$divider-width: 8px;
$primary-color: #409eff;
$active-bg: #e6f4ff;
$header-bg: #1C64F2;

// 主布局
.ops-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

// 顶部Header - 横跨整个宽度
.ops-header {
  height: $header-height;
  // background: $header-bg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 100;
  background: #fff;
  position: relative;
  box-shadow: 0 1px 3px #0000001a, 0 1px 2px #0000000f;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-logo {
  display: flex;
  align-items: center;
  cursor: pointer;

  .logo-image {
    height: 32px;
    width: auto;
  }

  .logo-text {
    margin-left: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.welcome-text {
  font-size: 14px;
  color: #333;
}

.header-icon-btn {
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #666;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  .dropdown-icon {
    font-size: 12px;
    color: #666;
  }
}

// 下方主体区域
.ops-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

// 侧边栏容器
.ops-sidebar-container {
  display: flex;
  height: 100%;
  flex-shrink: 0;

  &.is-collapsed {
    .ops-sidebar {
      width: $sidebar-collapsed-width;
    }

    .sidebar-collapse-btn {
      left: 16px;
    }
  }
}

// 侧边栏
.ops-sidebar {
  width: $sidebar-width;
  height: 100%;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;
  transition: width 0.3s ease;
  position: relative;
}

// 灰色分隔条
.sidebar-divider {
  width: $divider-width;
  height: 100%;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

// 菜单容器
.sidebar-menu-wrapper {
  flex: 1;
  overflow: hidden;
}

// 菜单样式
.sidebar-menu {
  border-right: none !important;

  &:not(.el-menu--collapse) {
    width: $sidebar-width;
  }

  &.el-menu--collapse {
    width: $sidebar-collapsed-width;
  }

  // 一级菜单项
  :deep(> .el-menu-item) {
    height: 48px;
    line-height: 48px;
    padding-left: 20px !important;

    &:hover {
      background-color: transparent !important;
      color: $primary-color;
    }

    &.is-active {
      background-color: $active-bg !important;
      color: $primary-color !important;
      border-right: 3px solid $primary-color;
    }

    .el-icon {
      margin-right: 12px;
    }
  }

  // 子菜单标题
  :deep(.el-sub-menu__title) {
    height: 48px;
    line-height: 48px;
    padding-left: 20px !important;

    &:hover {
      background-color: transparent !important;
      color: $primary-color;
    }

    .el-icon {
      margin-right: 12px;
    }
  }

  // 二级菜单项
  :deep(.el-sub-menu .el-menu-item) {
    padding-left: 52px !important;
    height: 44px;
    line-height: 44px;

    &:hover {
      background-color: transparent !important;
      color: $primary-color;
    }

    &.is-active {
      background-color: $active-bg !important;
      color: $primary-color !important;
      border-right: 3px solid $primary-color;
    }

    .el-icon {
      display: none;
    }
  }

  :deep(.el-sub-menu .el-menu) {
    background-color: #fff !important;
  }

  :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
    color: $primary-color;
  }

  .menu-item-child {
    padding-left: 52px !important;
  }
}

// 折叠按钮
.sidebar-collapse-btn {
  position: absolute;
  left: 28px;
  bottom: 60px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.3s;
  z-index: 10;

  &:hover {
    background: $primary-color;
  }
}

// 主区域
.ops-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f7fa;
  min-width: 0;
}

// TagsView
.ops-tags-view {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

// 主内容
.ops-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

:deep(.el-scrollbar) {
  .el-scrollbar__bar.is-horizontal {
    display: none !important;
  }
}

// Font Awesome 菜单图标样式
.menu-fa-icon {
  font-size: 16px;
  width: 24px;
  margin-right: 8px;
  text-align: center;
  color: inherit;
}
</style>
