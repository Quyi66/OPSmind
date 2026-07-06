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
            <keep-alive :include="keepAliveIncludes">
              <component :is="Component" :key="getViewKey(route)" />
            </keep-alive>
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import RouteLoadingFallback from '@/components/common/RouteLoadingFallback.vue'
import { useRouteLoading } from '@/core/router/loading.js'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { useTagsViewStore } from '@/stores/tagsView'
import { buildKeepAliveIncludes } from '@/utils/componentName'

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
const router = useRouter()
const tagsViewStore = useTagsViewStore()
const { cachedViews } = storeToRefs(tagsViewStore)

function getRouteName(route) {
  return String(route?.name || '')
}

// 'cmd-list' 始终保持缓存：命令执行工作台需要在切换子菜单时保持 WebSocket 连接和终端状态
const keepAliveIncludes = computed(() =>
  buildKeepAliveIncludes(router, [...cachedViews.value, 'cmd-list'])
)

function getViewKey(route) {
  return getRouteName(route) === 'cmd-list' ? 'cmd-workspace' : String(route?.path || '')
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
  display: flex;
  flex-direction: column;
}

.group-content--page-scroll {
  overflow: hidden;
}

.group-content--page-scroll > .group-content__view {
  flex: 1;
  overflow: auto;
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
