<template>
  <div class="group-layout">
    <!-- 左侧菜单 -->
    <ModuleSideMenu
      :menu-groups="menuGroups"
      :default-openeds="defaultOpeneds"
      class="group-side-menu"
    />

    <!-- 右侧内容区域 -->
    <section class="group-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade-content" mode="out-in">
          <keep-alive :max="5">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </section>
  </div>
</template>

<script setup>
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { SSC_NAV_ITEMS } from '@/config/module-nav.config.js'

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
