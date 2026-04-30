/**
 * Automation module route definitions (JAO/GFS/CMD).
 * Single source of truth for router + side nav.
 */

const commandCenterModuleView = () => import('./views/CommandCenterModule.vue')

function createCommandCenterPageRoute(name, component) {
  return {
    component: commandCenterModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

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
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'jao-localInstall',
    title: 'rpm包安装',
    redirect: '/rpm-install/install'
  }
]

export const RPM_INSTALL_ROUTE_DEFS = [
  {
    key: 'install',
    path: 'install',
    name: 'rpm-install-install',
    title: 'rpm包安装',
    navLabel: 'rpm包安装',
    icon: 'fas fa-box-open',
    component: () => import('@/modules/software/views/LocalInstall.vue')
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
    ...createCommandCenterPageRoute(
      'cmd-list',
      () => import('./views/command/CommandListPage.vue')
    )
  },
  {
    key: 'job',
    path: 'job',
    title: '命令作业',
    navLabel: '命令作业',
    icon: 'fas fa-tasks',
    ...createCommandCenterPageRoute(
      'cmd-job',
      () => import('./views/command/CommandJobPage.vue')
    )
  },
  {
    key: 'review',
    path: 'review',
    title: '命令审核',
    navLabel: '命令审核',
    icon: 'fas fa-clipboard-check',
    ...createCommandCenterPageRoute(
      'cmd-review',
      () => import('./views/command/CommandReviewPage.vue')
    )
  },
  {
    key: 'logs',
    path: 'logs',
    title: '执行日志',
    navLabel: '执行日志',
    icon: 'fas fa-file-alt',
    ...createCommandCenterPageRoute(
      'cmd-logs',
      () => import('./views/command/CommandLogsPage.vue')
    )
  },
  {
    key: 'console',
    path: 'console',
    title: '控制台',
    navLabel: '控制台',
    icon: 'fas fa-terminal',
    ...createCommandCenterPageRoute(
      'cmd-console',
      () => import('./views/command/CommandConsolePage.vue')
    )
  }
]
