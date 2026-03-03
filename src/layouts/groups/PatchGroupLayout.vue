<template>
  <div class="group-layout">
    <!-- 左侧菜单 -->
    <ModuleSideMenu
      :menu-groups="filteredMenuGroups"
      :default-openeds="defaultOpeneds"
      class="group-side-menu"
    />

    <!-- 右侧内容区域 -->
    <section class="group-content">
      <!-- 实际内容（始终渲染） -->
      <router-view v-slot="{ Component, route }">
        <transition name="fade-content" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>

      <!-- 加载状态遮罩（绝对定位覆盖在内容上方） -->
      <transition name="fade-overlay">
        <div v-if="isLoading" class="loading-overlay">
          <RouteLoadingFallback />
        </div>
      </transition>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import { authService } from '@/core/auth'

const route = useRoute()
const { isLoading } = useRouteLoading()

// 从路由参数获取当前模块代码
const currentModuleCode = computed(() => route.params.moduleCode || 'patches')

/**
 * 检测当前客户端操作系统类型
 */
function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase()
  const platform = navigator.platform.toLowerCase()

  if (userAgent.includes('windows') || platform.includes('win')) {
    return 'windows'
  }
  if (userAgent.includes('linux') || platform.includes('linux')) {
    return 'linux'
  }
  if (userAgent.includes('mac') || platform.includes('mac')) {
    return 'linux'
  }
  return 'linux'
}

/**
 * 判断当前用户是否是 admin
 */
function isAdmin() {
  const user = authService.getCurrentUser()
  return user?.name === 'admin' || user?.userId === 'admin' || user?.role === 'admin'
}

// 当前检测到的平台
const currentPlatform = ref(detectPlatform())

// 获取"补丁漏洞"分组下的所有模块菜单（补丁、软件）
const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))

// 根据平台过滤导航菜单（admin 用户显示所有）
const filteredMenuGroups = computed(() => {
  // 如果是 admin 用户，显示所有菜单
  if (isAdmin()) {
    return menuGroups.value
  }

  return menuGroups.value.map(group => {
    // 如果是 patches 模块，根据平台过滤子菜单
    if (group.code === 'patches' && group.children) {
      const filteredChildren = group.children.filter(item => {
        if (!item.platform) return true
        if (item.platform === 'common') return true
        return item.platform === currentPlatform.value
      })
      return { ...group, children: filteredChildren }
    }
    return group
  })
})

// 默认展开的菜单
const defaultOpeneds = ['patches', 'windows-patches', 'software']

// 日志输出当前检测到的平台
onMounted(() => {})

// 提供给子组件使用
provide('currentPlatform', currentPlatform)
provide('currentModuleCode', currentModuleCode)
</script>

<style scoped lang="scss">
.group-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
}

.group-side-menu {
  flex-shrink: 0;
}

.group-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--el-bg-color);
  position: relative;
}

// 加载遮罩层
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--el-bg-color);
}

// 遮罩层过渡动画
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.15s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

// 内容切换过渡动画
.fade-content-enter-active,
.fade-content-leave-active {
  transition: opacity 0.12s ease;
}

.fade-content-enter-from,
.fade-content-leave-to {
  opacity: 0;
}
</style>
