<template>
  <ModulePageLayout
    :title="moduleTitle"
    :description="moduleDescription"
    :hide-header="true"
  >
    <div class="jao-module">
      <aside class="jao-module__nav">
        <div
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ 'is-active': activeView === item.key }"
          @click="activeView = item.key"
        >
          <i :class="['fa', item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </aside>

      <section class="jao-module__content">
        <component :is="activeComponent" />
      </section>
    </div>
  </ModulePageLayout>
</template>

<script setup>
import { computed, ref } from 'vue'
import ModulePageLayout from '@/modules/shared/components/ModulePageLayout.vue'
import JobListView from '@/modules/automation/components/job/JobListView/JobListView.vue'
import JobScheduleView from '@/modules/automation/components/job/schedule/JobScheduleView.vue'
import JobMyRequestsView from '@/modules/automation/components/job/JobMyRequestsView.vue'
import JobApprovalsView from '@/modules/automation/components/job/JobApprovalsView.vue'
import JobRunLogsView from '@/modules/automation/components/job/JobRunLogsView.vue'
import JobStatisticsView from '@/modules/automation/components/job/JobStatisticsView.vue'
import JobTaskSchedulerView from '@/modules/automation/components/job/JobTaskSchedulerView.vue'

const navItems = [
  { key: 'jobs', label: '作业列表', icon: 'fa-list-alt' },
  { key: 'schedule', label: '作业编排', icon: 'fa-network-wired' },
  { key: 'requests', label: '我的申请', icon: 'fa-inbox' },
  { key: 'approvals', label: '作业审批', icon: 'fa-user-check' },
  { key: 'runLogs', label: '运行记录', icon: 'fa-history' },
  { key: 'statistics', label: '数据统计', icon: 'fa-chart-line' },
  { key: 'taskScheduler', label: '任务调度', icon: 'fa-clock' }
]

const componentMap = {
  jobs: JobListView,
  schedule: JobScheduleView,
  requests: JobMyRequestsView,
  approvals: JobApprovalsView,
  runLogs: JobRunLogsView,
  statistics: JobStatisticsView,
  taskScheduler: JobTaskSchedulerView
}

const activeView = ref('jobs')

const moduleTitle = '自动化作业编排'
const moduleDescription =
  '集中管理批量作业、模板与执行计划，逐步完成对旧版 Angular 模块的替换。'

const activeComponent = computed(() => componentMap[activeView.value] || JobListView)
</script>

<style scoped lang="scss">
.jao-module {
  display: grid;
  grid-template-columns: 150px 1fr;
  // gap: 20px;
  // min-height: 720px;
  height: 100%;
}

.jao-module__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 8px;
  background: #f8fafc;
  //border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-item i {
  width: 18px;
  text-align: center;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.nav-item.is-active {
  background-color: rgba(173, 181, 189, .25);
  border-left-color: rgba(173, 181, 189, .5);
}

.jao-module__content {
  min-height: 100%;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .jao-module {
    grid-template-columns: 1fr;
  }

  .jao-module__nav {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-item {
    flex: 1 0 140px;
  }
}
</style>
