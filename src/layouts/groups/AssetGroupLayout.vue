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
import { computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const router = useRouter()
const { isLoading } = useRouteLoading()

// 获取"资产管理"分组下的所有模块菜单
const menuGroups = computed(() => getGroupMenuConfig('asset-management', MENU_CONFIG))

// 默认展开的菜单
const defaultOpeneds = ['acm']

// 处理编辑模型
function handleEditModel(modelId) {
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId }
  })
}

// 处理查看资产类型
function handleViewAssetType(assetTypeCode) {
  router.push({
    path: '/acm/info',
    query: { type: assetTypeCode }
  })
}

// 提供给子组件使用
provide('handleEditModel', handleEditModel)
provide('handleViewAssetType', handleViewAssetType)
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
