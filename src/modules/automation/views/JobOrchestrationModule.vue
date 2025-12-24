<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="jao-module">
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

      <section class="jao-module__content">
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
.jao-module {
  display: flex;
  height: 100%;
  min-height: 0;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.jao-module__content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 16px;

  :deep(> *) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }
}

a.ops-sidebar-item {
  text-decoration: none;
  color: inherit;
}

@media (max-width: 1024px) {
  .jao-module {
    flex-direction: column;
  }
}
</style>
