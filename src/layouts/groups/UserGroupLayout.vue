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
import { computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ModuleSideMenu from '@/modules/shared/components/ModuleSideMenu.vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'

const router = useRouter()
const route = useRoute()

// 从路由参数获取当前模块代码
const currentModuleCode = computed(() => route.params.moduleCode || 'users')

// 获取"用户管理"分组下的所有模块菜单（用户、流程、sudo权限、密码）
const menuGroups = computed(() => getGroupMenuConfig('user-management', MENU_CONFIG))

// 默认展开的菜单
const defaultOpeneds = ['users', 'flow', 'sudo', 'password']

// 提供导航方法给子组件使用（使用当前模块代码）
function handleNavigate({ view, moduleCode }) {
  const targetModule = moduleCode || currentModuleCode.value
  if (view) {
    router.push(`/${targetModule}/${view}`)
  }
}

provide('handleNavigate', handleNavigate)
provide('currentModuleCode', currentModuleCode)
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
