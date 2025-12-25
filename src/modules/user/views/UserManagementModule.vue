<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="ops-module">
      <aside class="ops-sidebar-nav ops-sidebar-nav--narrow">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="ops-sidebar-item"
          :class="{ 'is-active': isActiveRoute(item.key) }"
        >
          <i :class="['fa', item.icon]"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </aside>

      <section class="ops-module__content">
        <router-view />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const route = useRoute()
const router = useRouter()

const moduleTitle = '用户管理'
const moduleDescription = ''

const navItems = [
  { key: 'overview', label: '总览', icon: 'fa-tachometer-alt', path: '/users/overview' },
  { key: 'users', label: '用户', icon: 'fa-user', path: '/users/users' },
  { key: 'groups', label: '用户组', icon: 'fa-users', path: '/users/groups' },
  { key: 'logs', label: '操作记录', icon: 'fa-history', path: '/users/logs' },
  { key: 'config', label: '功能配置', icon: 'fa-cog', path: '/users/config' }
]

function isActiveRoute(key) {
  return route.path.includes(`/users/${key}`)
}

// 提供导航方法给子组件使用
function handleNavigate({ view }) {
  if (view) {
    router.push(`/users/${view}`)
  }
}

provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
// 样式已统一至 element-ui.scss，此处无需重复定义
</style>

