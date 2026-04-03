<template>
  <div class="group-layout">
    <!-- 左侧菜单 -->
    <ModuleSideMenu :menu-groups="menuGroups" :default-openeds="defaultOpeneds" class="group-side-menu" />

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
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const route = useRoute()
const { isLoading } = useRouteLoading()

// 从路由参数获取当前模块代码
const currentModuleCode = computed(() => route.params.moduleCode || 'jao')

// 提供给子组件使用
provide('currentModuleCode', currentModuleCode)

// 获取"自动化"分组下的所有模块菜单（作业、脚本、命令、主机用户管理）
const menuGroups = computed(() => getGroupMenuConfig('automation', MENU_CONFIG))

// 默认展开的菜单（根据当前路由确定）
const defaultOpeneds = ['jao', 'gfs', 'cmd', 'users']
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
