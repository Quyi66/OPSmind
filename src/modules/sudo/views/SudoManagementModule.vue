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
          <i :class="item.icon"></i>
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
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const route = useRoute()

const moduleTitle = 'sudo权限管理'
const moduleDescription = ''

const navItems = [
  { key: 'permission', label: 'sudo列表', icon: 'fa fa-list', path: '/sudo/permission' },
  { key: 'apply', label: 'sudo申请', icon: 'fa fa-file-alt', path: '/sudo/apply' },
  { key: 'reset', label: '重置密码', icon: 'fa fa-key', path: '/sudo/reset' },
  { key: 'settings', label: '功能设置', icon: 'fa fa-cog', path: '/sudo/settings' },
  { key: 'log', label: '操作记录', icon: 'fa fa-history', path: '/sudo/log' }
]

// 判断当前路由是否激活
function isActiveRoute(key) {
  return route.path.includes(`/sudo/${key}`)
}
</script>

<style scoped lang="scss">
// 样式已统一至 opsmind.scss
</style>


