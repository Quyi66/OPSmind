/**
 * Automation module route definitions (JAO/GFS/CMD).
 * Single source of truth for router + side nav.
 */

const jobOrchestrationModuleView = () => import('./views/JobOrchestrationModule.vue')
const commandCenterModuleView = () => import('./views/CommandCenterModule.vue')
const scriptLibraryModuleView = () => import('./views/ScriptLibraryModule.vue')

export const AUTO_WORKBENCH_ROUTE_DEFS = [
  {
    key: 'overview',
    path: 'overview',
    title: '工作台',
    navLabel: '工作台',
    icon: 'fas fa-th-large',
    name: 'auto-workbench-overview',
    component: () => import('./views/AutomationWorkbenchPage.vue')
  }
]

function createJobOrchestrationPageRoute(name, component) {
  return {
    component: jobOrchestrationModuleView,
    children: [
      {
        path: '',
        name,
        component
      }
    ]
  }
}

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

function createScriptLibraryPageRoute(name, component, props) {
  return {
    component: scriptLibraryModuleView,
    children: [
      {
        path: '',
        name,
        component,
        props
      }
    ]
  }
}

export const JAO_ROUTE_DEFS = [
  {
    key: 'jobs',
    path: 'jobs',
    title: '运维工具列表',
    navLabel: '运维工具列表',
    icon: 'fas fa-list-alt',
    ...createJobOrchestrationPageRoute('jao-jobs', () => import('./views/job/JobListPage.vue'))
  },
  {
    key: 'schedule',
    path: 'schedule',
    title: '流程编排',
    navLabel: '流程编排',
    icon: 'fas fa-network-wired',
    ...createJobOrchestrationPageRoute(
      'jao-schedule',
      () => import('./views/job/JobSchedulePage.vue')
    )
  },
  {
    key: 'taskScheduler',
    path: 'taskScheduler',
    title: '定时任务',
    menuCode: 'task-scheduler',
    navLabel: '定时任务',
    icon: 'fas fa-clock',
    ...createJobOrchestrationPageRoute(
      'jao-taskScheduler',
      () => import('./views/job/JobTaskSchedulerPage.vue')
    )
  },
  {
    key: 'runLogs',
    path: 'runLogs',
    title: '运行记录',
    name: 'jao-runLogs',
    redirect: '/run-records/logs'
  },
  {
    key: 'statistics',
    path: 'statistics',
    title: '数据统计',
    icon: 'fas fa-chart-line',
    name: 'jao-statistics',
    redirect: '/run-records/logs?tab=statistics'
  },
  {
    key: 'requests',
    path: 'requests',
    title: '我的申请',
    navLabel: '我的申请',
    icon: 'fas fa-inbox',
    ...createJobOrchestrationPageRoute(
      'jao-requests',
      () => import('./views/job/JobMyRequestsPage.vue')
    )
  },
  {
    key: 'approvals',
    path: 'approvals',
    title: '运维工具审批',
    menuCode: 'review-center',
    navLabel: '运维工具审批',
    icon: 'fas fa-user-check',
    ...createJobOrchestrationPageRoute(
      'jao-approvals',
      () => import('./views/job/JobApprovalsPage.vue')
    )
  },
  {
    key: 'localInstall',
    path: 'localInstall',
    name: 'jao-localInstall',
    title: '软件包安装',
    redirect: '/patches/localInstall'
  }
]

export const RUN_RECORDS_ROUTE_DEFS = [
  {
    key: 'logs',
    path: 'logs',
    title: '运行记录',
    menuCode: 'run-records',
    navLabel: '运行记录',
    icon: 'fas fa-history',
    ...createJobOrchestrationPageRoute(
      'run-records-logs',
      () => import('./views/job/JobRunLogsPage.vue')
    )
  },
  {
    key: 'statistics',
    path: 'statistics',
    title: '数据统计',
    menuCode: 'run-records',
    name: 'run-records-statistics',
    redirect: '/run-records/logs?tab=statistics'
  }
]

export const GFS_ROUTE_DEFS = [
  {
    key: 'scriptLibrary',
    path: 'scriptLibrary',
    title: '脚本库',
    navLabel: '脚本库',
    icon: 'fas fa-code-branch',
    ...createScriptLibraryPageRoute(
      'gfs-scriptLibrary',
      () => import('./views/script/ScriptFileListPage.vue'),
      { repoType: 'git' }
    )
  },
  {
    key: 'fileLibrary',
    path: 'fileLibrary',
    title: '文件库',
    navLabel: '文件库',
    icon: 'fas fa-archive',
    ...createScriptLibraryPageRoute(
      'gfs-fileLibrary',
      () => import('./views/script/ScriptFileListPage.vue'),
      { repoType: 'staticfs' }
    )
  },
  {
    key: 'scriptReview',
    path: 'scriptReview',
    title: '脚本审核',
    menuCode: 'review-center',
    navLabel: '脚本审核',
    icon: 'fas fa-clipboard-check',
    ...createScriptLibraryPageRoute(
      'gfs-scriptReview',
      () => import('./views/script/ScriptFileListPage.vue'),
      { repoType: 'stage' }
    )
  }
]

export const CMD_ROUTE_DEFS = [
  {
    key: 'list',
    path: 'list',
    title: '命令与运维工具',
    navLabel: '命令与运维工具',
    icon: 'fas fa-layer-group',
    component: commandCenterModuleView,
    name: 'cmd-list'
  },
  {
    key: 'job',
    path: 'job',
    title: '命令运维工具',
    redirect: '/cmd/list?tab=job'
  },
  {
    key: 'review',
    path: 'review',
    title: '命令审核',
    menuCode: 'review-center',
    navLabel: '命令审核',
    icon: 'fas fa-clipboard-check',
    ...createCommandCenterPageRoute(
      'cmd-review',
      () => import('./views/command/CommandReviewPage.vue')
    )
  },
  // 暂时移除命令执行“执行日志”导航入口，保留组件代码以便后续回退。
  // {
  //   key: 'logs',
  //   path: 'logs',
  //   title: '执行日志',
  //   navLabel: '执行日志',
  //   icon: 'fas fa-file-alt',
  //   ...createCommandCenterPageRoute('cmd-logs', () => import('./views/command/CommandLogsPage.vue'))
  // },
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
