<template>
  <div class="group-layout">
    <!-- 左侧菜单 -->
    <ModuleSideMenu :menu-groups="menuGroups" :default-openeds="defaultOpeneds" class="group-side-menu" />

    <!-- 右侧内容区域 -->
    <section class="group-content">
      <!-- 实际内容（始终渲染） -->
      <router-view v-slot="{ Component, route }">
        <transition name="fade-content" mode="out-in">
          <keep-alive :max="5">
            <component :is="Component" :key="route.path" />
          </keep-alive>
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
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import { SSC_NAV_ITEMS } from '@/config/module-nav.config.js'

const { isLoading } = useRouteLoading()

const defaultOpeneds = ['ssc']

// 系统设置是独立模块，不属于任何分组，直接使用SSC_NAV_ITEMS
const menuGroups = [
  {
    code: 'ssc',
    name: '系统管理',
    icon: 'fas fa-cog',
    children: SSC_NAV_ITEMS
  }
]
</script>

<style scoped lang="scss">
.group-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #fff;
}

.group-side-menu {
  flex-shrink: 0;
}

.group-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #fff;
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
  background: #fff;
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
