<template>
  <div class="group-layout">
    <ModuleSideMenu
      :menu-groups="menuGroups"
      :default-openeds="defaultOpeneds"
      :badge-counts="badgeCounts"
      class="group-side-menu"
    />

    <section class="group-content" :class="{ 'group-content--page-scroll': pageScroll }">
      <slot name="content-top" />

      <div class="group-content__view">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-content" mode="out-in">
            <template v-if="shouldCacheRoute(route)">
              <keep-alive>
                <component :is="Component" :key="getViewKey(route)" />
              </keep-alive>
            </template>
            <component v-else :is="Component" :key="getViewKey(route)" />
          </transition>
        </router-view>

        <transition name="fade-overlay">
          <div v-if="isLoading" class="loading-overlay">
            <RouteLoadingFallback />
          </div>
        </transition>
      </div>
    </section>
  </div>
</template>

<script setup>
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'

defineProps({
  menuGroups: {
    type: Array,
    required: true
  },
  defaultOpeneds: {
    type: Array,
    default: () => []
  },
  badgeCounts: {
    type: Object,
    default: () => ({})
  },
  pageScroll: {
    type: Boolean,
    default: false
  }
})

const { isLoading } = useRouteLoading()

function getRouteName(route) {
  return String(route?.name || '')
}

function shouldCacheRoute(route) {
  return getRouteName(route) === 'cmd-list'
}

function getViewKey(route) {
  return shouldCacheRoute(route) ? 'cmd-workspace' : String(route?.path || '')
}
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
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  position: relative;
}

.group-content__view {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.group-content--page-scroll {
  overflow: auto;
}

.group-content--page-scroll > .group-content__view {
  flex: 1 0 auto;
  overflow: visible;
}

.group-content--page-scroll :deep(.ops-module__content) {
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.group-content--page-scroll :deep(.ops-page-layout) {
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--el-bg-color);
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.15s ease;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

.fade-content-enter-active,
.fade-content-leave-active {
  transition: opacity 0.12s ease;
}

.fade-content-enter-from,
.fade-content-leave-to {
  opacity: 0;
}
</style>
