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
import { useRoute } from 'vue-router'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'

const route = useRoute()

const moduleTitle = '自动化作业编排'
const moduleDescription = ''

const navItems = [
  { key: 'jobs', label: '作业列表', icon: 'fa-list-alt', path: '/jao/jobs' },
  { key: 'schedule', label: '作业编排', icon: 'fa-network-wired', path: '/jao/schedule' },
  { key: 'requests', label: '我的申请', icon: 'fa-inbox', path: '/jao/requests' },
  { key: 'approvals', label: '作业审批', icon: 'fa-user-check', path: '/jao/approvals' },
  { key: 'runLogs', label: '运行记录', icon: 'fa-history', path: '/jao/runLogs' },
  { key: 'statistics', label: '数据统计', icon: 'fa-chart-line', path: '/jao/statistics' },
  { key: 'taskScheduler', label: '任务调度', icon: 'fa-clock', path: '/jao/taskScheduler' }
]

function isActiveRoute(key) {
  return route.path.includes(`/jao/${key}`)
}
</script>

<style scoped lang="scss">
// 样式已统一至 element-ui.scss，此处无需重复定义
</style>

