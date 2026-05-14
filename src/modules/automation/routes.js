/**
 * Automation module route definitions (JAO/GFS/CMD).
 * Single source of truth for router + side nav.
 */

const jobOrchestrationModuleView = () => import('./views/JobOrchestrationModule.vue')
const commandCenterModuleView = () => import('./views/CommandCenterModule.vue')
const scriptLibraryModuleView = () => import('./views/ScriptLibraryModule.vue')

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
    title: '作业列表',
    navLabel: '作业列表',
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
    navLabel: '运行记录',
    icon: 'fas fa-history',
    ...createJobOrchestrationPageRoute(
      'jao-runLogs',
      () => import('./views/job/JobRunLogsPage.vue')
    )
  },
  {
    key: 'statistics',
    path: 'statistics',
    title: '数据统计',
    icon: 'fas fa-chart-line',
    name: 'jao-statistics',
    redirect: '/jao/runLogs?tab=statistics'
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
    title: '作业审批',
    navLabel: '作业审批',
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
    component: () => import('@/modules/software/views/LocalInstallPage.vue')
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
    title: '命令列表',
    navLabel: '命令列表',
    icon: 'fas fa-list',
    ...createCommandCenterPageRoute('cmd-list', () => import('./views/command/CommandListPage.vue'))
  },
  {
    key: 'job',
    path: 'job',
    title: '命令作业',
    navLabel: '命令作业',
    icon: 'fas fa-tasks',
    ...createCommandCenterPageRoute('cmd-job', () => import('./views/command/CommandJobPage.vue'))
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
    ...createCommandCenterPageRoute('cmd-logs', () => import('./views/command/CommandLogsPage.vue'))
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
