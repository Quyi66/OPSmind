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
        <!-- 主内容区域 -->
        <div class="main-content">
          <div v-if="moduleToolbarTitle" class="module-toolbar">
            <div class="module-toolbar-title">{{ moduleToolbarTitle }}</div>
            <button class="module-toolbar-close" @click="handleCloseModule" aria-label="关闭">×</button>
          </div>

          <router-view v-slot="{ Component, route }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" :key="getRouterViewKey(route)" />
            </transition>
          </router-view>
        </div>
      </div>
    </div>

    <!-- 移动端侧边栏遮罩 -->
    <div
      v-if="isMobile"
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TopNavMenu from '@/components/layout/TopNavMenu.vue'
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
const activeMenuItem = computed(() => menuStore.activeMenuItem)
const currentMenuItemTitle = computed(() => {
  const menuItem = menuStore.currentMenuItem
  return menuItem ? menuItem.name : ''
})

const moduleTitleFromRoute = computed(() => {
  const raw = route.meta?.moduleTitle
  return typeof raw === 'string' ? raw : ''
})

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

const moduleToolbarTitle = computed(() => {
  if (!showModuleToolbar.value && !route.meta?.showModuleToolbar) return ''

  if (moduleTitleText.value) return moduleTitleText.value
  if (moduleTitleFromRoute.value) return moduleTitleFromRoute.value
  return currentMenuItemTitle.value
})

const closeMobileMenu = () => {
  if (isMobile.value) {
    menuStore.hideSideMenu()
  }
}

// 关闭当前内嵌模块（返回上一页）
const handleCloseModule = () => {
  try {
    menuStore.clearActiveMenu()
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/home')
    }
  } catch (e) {}
}

/**
 * 获取 router-view 的 key
 * 对于有 groupCode 的路由（同一分组内的模块），使用 groupCode 作为 key
 * 这样同一分组内切换时，GroupLayout 组件不会被重新挂载
 * @param {object} routeObj - 路由对象
 * @returns {string} key
 */
const getRouterViewKey = (routeObj) => {
  // 如果路由有 groupCode，使用 groupCode 作为 key
  // 这样同一分组内的模块（如 jao、gfs、cmd）共享相同的 key
  // GroupLayout 组件不会被卸载重新挂载
  const groupCode = routeObj.meta?.groupCode
  if (groupCode) {
    return `group-${groupCode}`
  }
  // 否则使用原来的逻辑
  return routeObj.matched[1]?.path || routeObj.path
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
// 路由切换过渡动画
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

// 主布局容器
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
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
    padding-bottom: 24px;
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
}

/* 内嵌模块顶部工具栏 */
.module-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 24px;
  margin: 0 -16px 0 -16px;
}

.module-toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
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
    height: 100vh;
  }

  .main-body {
    overflow: hidden;
  }
}
</style>
