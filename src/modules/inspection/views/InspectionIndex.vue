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
          <i :class="item.icon" />
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

const moduleTitle = '系统巡检'
const moduleDescription = ''

const navItems = [
  { key: 'overview', label: '巡检总览', icon: 'fad fa-fw fa-th-large', path: '/cac/overview' },
  { key: 'templates', label: '巡检模板', icon: 'fad fa-fw fa-list-alt', path: '/cac/templates' },
  { key: 'results', label: '检查结果', icon: 'fad fa-fw fa-history', path: '/cac/results' },
  { key: 'config', label: '巡检配置', icon: 'fad fa-fw fa-cog', path: '/cac/config' },
  { key: 'email', label: '邮件配置', icon: 'fad fa-fw fa-envelope', path: '/cac/email' }
]

function isActiveRoute(key) {
  // 特殊处理 results 因为有子路由
  if (key === 'results') {
    return route.path.includes('/cac/results') || route.path.includes('/cac/structural-diagram')
  }
  return route.path.includes(`/cac/${key}`)
}

/**
 * 处理子组件的导航请求
 */
function handleNavigate(payload) {
  const { view, params } = payload

  if (view === 'results' && params?.templateId) {
    router.push({ path: '/cac/results', query: { templateId: params.templateId } })
  } else if (view === 'structural-diagram' && params?.jobId) {
    router.push(`/cac/structural-diagram/${params.jobId}`)
  } else if (view === 'result-detail' && params?.jobId) {
    router.push(`/cac/results/${params.jobId}`)
  }
}

// 提供给子组件使用
provide('handleNavigate', handleNavigate)
</script>

<style scoped lang="scss">
// 样式已统一至 opsmind.scss
</style>

