/**
 * Automation module route definitions (JAO/GFS/CMD).
 * Single source of truth for router + side nav.
 */

export const JAO_ROUTE_DEFS = [
  {
    key: 'jobs',
    path: 'jobs',
    name: 'jao-jobs',
    title: '作业列表',
    navLabel: '作业列表',
    icon: 'fas fa-list-alt',
    component: () => import('./components/job/JobListView/JobListView.vue')
  },
  {
    key: 'schedule',
    path: 'schedule',
    name: 'jao-schedule',
    title: '流程编排',
    navLabel: '流程编排',
    icon: 'fas fa-network-wired',
    component: () => import('./components/job/schedule/JobScheduleView.vue')
  },
  {
    key: 'requests',
    path: 'requests',
    name: 'jao-requests',
    title: '我的申请',
    navLabel: '我的申请',
    icon: 'fas fa-inbox',
    component: () => import('./components/job/JobMyRequestsView.vue')
  },
  {
    key: 'approvals',
    path: 'approvals',
    name: 'jao-approvals',
    title: '作业审批',
    navLabel: '作业审批',
    icon: 'fas fa-user-check',
    component: () => import('./components/job/JobApprovalsView.vue')
  },
  {
    key: 'runLogs',
    path: 'runLogs',
    name: 'jao-runLogs',
    title: '运行记录',
    navLabel: '运行记录',
    icon: 'fas fa-history',
    component: () => import('./components/job/JobRunLogsView.vue')
  },
  {
    key: 'statistics',
    path: 'statistics',
    name: 'jao-statistics',
    title: '数据统计',
    navLabel: '数据统计',
    icon: 'fas fa-chart-line',
    component: () => import('./components/job/JobStatisticsView.vue')
  },
  {
    key: 'taskScheduler',
    path: 'taskScheduler',
    name: 'jao-taskScheduler',
    title: '定时任务',
    navLabel: '定时任务',
    icon: 'fas fa-clock',
    component: () => import('./components/job/JobTaskSchedulerView.vue')
  }
]

export const GFS_ROUTE_DEFS = [
  {
    key: 'scriptLibrary',
    path: 'scriptLibrary',
    name: 'gfs-scriptLibrary',
    title: '脚本库',
    navLabel: '脚本库',
    icon: 'fas fa-code-branch',
    component: () => import('./components/script/ScriptFileList.vue'),
    props: { repoType: 'git' }
  },
  {
    key: 'fileLibrary',
    path: 'fileLibrary',
    name: 'gfs-fileLibrary',
    title: '文件库',
    navLabel: '文件库',
    icon: 'fas fa-archive',
    component: () => import('./components/script/ScriptFileList.vue'),
    props: { repoType: 'staticfs' }
  },
  {
    key: 'scriptReview',
    path: 'scriptReview',
    name: 'gfs-scriptReview',
    title: '脚本审核',
    navLabel: '脚本审核',
    icon: 'fas fa-clipboard-check',
    component: () => import('./components/script/ScriptFileList.vue'),
    props: { repoType: 'stage' }
  }
]

export const CMD_ROUTE_DEFS = [
  {
    key: 'list',
    path: 'list',
    title: '命令列表',
    navLabel: '命令列表',
    icon: 'fas fa-list',
    component: () => import('./views/CommandCenterModule.vue'),
    children: [
      {
        path: '',
        name: 'cmd-list',
        component: () => import('./components/command/CommandList.vue')
      }
    ]
  },
  {
    key: 'job',
    path: 'job',
    name: 'cmd-job',
    title: '命令作业',
    navLabel: '命令作业',
    icon: 'fas fa-tasks',
    component: () => import('./components/command/CommandJobList.vue')
  },
  {
    key: 'review',
    path: 'review',
    name: 'cmd-review',
    title: '命令审核',
    navLabel: '命令审核',
    icon: 'fas fa-clipboard-check',
    component: () => import('./components/command/CommandApproveList.vue')
  },
  {
    key: 'logs',
    path: 'logs',
    name: 'cmd-logs',
    title: '执行日志',
    navLabel: '执行日志',
    icon: 'fas fa-file-alt',
    component: () => import('./components/command/CommandLogs.vue')
  },
  {
    key: 'console',
    path: 'console',
    name: 'cmd-console',
    title: '控制台',
    navLabel: '控制台',
    icon: 'fas fa-terminal',
    component: () => import('./components/command/CommandConsole.vue')
  }
]
