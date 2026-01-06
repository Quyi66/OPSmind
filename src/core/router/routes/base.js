/**
 * 基础路由配置
 */

export const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/aiops',
    name: 'aiops',
    component: () => import('@/views/AiOpsAssistant.vue'),
    meta: {
      title: 'OPS智能助手',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: {
      title: '登录 - OPSmind',
      requiresGuest: true,
      layout: 'auth'
    }
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home-index',
        component: () => import('@/views/Dashboard.vue')
      }
    ],
    meta: {
      title: 'OPSmind 仪表盘',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'dashboard'
    }
  },
  // 个人资料页面
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: {
      title: '个人资料 - OPSmind',
      requiresAuth: true
    },
    children: [
      {
        path: '',
        name: 'settings-index',
        component: () => import('@/views/ProfileSettings.vue')
      }
    ]
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: {
      title: '关于 - OPSmind'
    }
  },
  // 管理后台
  {
    path: '/admin/:group?/:page?',
    name: 'admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: {
      title: '管理后台',
      requiresAuth: true
    }
  },
  // 错误页 - 404
  {
    path: '/error/404',
    name: 'error-404',
    component: () => import('@/views/Error404.vue'),
    meta: {
      title: '未找到页面'
    }
  },
  {
    path: '/migration',
    name: 'migration-dashboard',
    // 回退到仪表盘，原 MigrationDashboard.vue 缺失
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '迁移管理 - OPSmind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },
  // sudo模块 - 使用子路由方式
  {
    path: '/sudo',
    name: 'sudo',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/sudo/permission',
    meta: {
      title: 'sudo权限管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'sudo'
    },
    children: [
      {
        path: '',
        name: 'sudo-index',
        component: () => import('@/modules/sudo/views/SudoManagementModule.vue'),
        redirect: '/sudo/permission',
        children: [
          {
            path: 'permission',
            name: 'sudo-permission',
            component: () => import('@/modules/sudo/components/SudoPermissionList.vue'),
            meta: { title: 'sudo列表' }
          },
          {
            path: 'apply',
            name: 'sudo-apply',
            component: () => import('@/modules/sudo/components/SudoApplyList.vue'),
            meta: { title: 'sudo申请' }
          },
          {
            path: 'reset',
            name: 'sudo-reset',
            component: () => import('@/modules/sudo/components/SudoResetPassword.vue'),
            meta: { title: '重置密码' }
          },
          {
            path: 'settings',
            name: 'sudo-settings',
            component: () => import('@/modules/sudo/components/SudoSettings.vue'),
            meta: { title: '功能设置' }
          },
          {
            path: 'log',
            name: 'sudo-log',
            component: () => import('@/modules/sudo/components/SudoOperationLog.vue'),
            meta: { title: '操作记录' }
          }
        ]
      }
    ]
  },
  // jao模块 - 自动化作业编排
  {
    path: '/jao',
    name: 'jao',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/jao/jobs',
    meta: {
      title: '自动化作业编排',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'jao'
    },
    children: [
      {
        path: '',
        name: 'jao-index',
        component: () => import('@/modules/automation/views/JobOrchestrationModule.vue'),
        redirect: '/jao/jobs',
        children: [
          { path: 'jobs', name: 'jao-jobs', component: () => import('@/modules/automation/components/job/JobListView/JobListView.vue'), meta: { title: '作业列表' } },
          { path: 'schedule', name: 'jao-schedule', component: () => import('@/modules/automation/components/job/schedule/JobScheduleView.vue'), meta: { title: '作业编排' } },
          { path: 'requests', name: 'jao-requests', component: () => import('@/modules/automation/components/job/JobMyRequestsView.vue'), meta: { title: '我的申请' } },
          { path: 'approvals', name: 'jao-approvals', component: () => import('@/modules/automation/components/job/JobApprovalsView.vue'), meta: { title: '作业审批' } },
          { path: 'runLogs', name: 'jao-runLogs', component: () => import('@/modules/automation/components/job/JobRunLogsView.vue'), meta: { title: '运行记录' } },
          { path: 'statistics', name: 'jao-statistics', component: () => import('@/modules/automation/components/job/JobStatisticsView.vue'), meta: { title: '数据统计' } },
          { path: 'taskScheduler', name: 'jao-taskScheduler', component: () => import('@/modules/automation/components/job/JobTaskSchedulerView.vue'), meta: { title: '任务调度' } }
        ]
      }
    ]
  },
  // cmd模块 - 命令管理
  {
    path: '/cmd',
    name: 'cmd',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/cmd/list',
    meta: {
      title: '命令管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'cmd'
    },
    children: [
      {
        path: '',
        name: 'cmd-index',
        component: () => import('@/modules/automation/views/CommandCenterModule.vue'),
        redirect: '/cmd/list',
        children: [
          { path: 'list', name: 'cmd-list', component: () => import('@/modules/automation/components/command/CommandList.vue'), meta: { title: '命令列表' } },
          { path: 'job', name: 'cmd-job', component: () => import('@/modules/automation/components/command/CommandJobList.vue'), meta: { title: '命令作业' } },
          { path: 'review', name: 'cmd-review', component: () => import('@/modules/automation/components/command/CommandApproveList.vue'), meta: { title: '命令审核' } },
          { path: 'logs', name: 'cmd-logs', component: () => import('@/modules/automation/components/command/CommandLogs.vue'), meta: { title: '运行记录' } },
          { path: 'console', name: 'cmd-console', component: () => import('@/modules/automation/components/command/CommandConsole.vue'), meta: { title: 'Console' } }
        ]
      }
    ]
  },
  // gfs模块 - 文件服务
  {
    path: '/gfs',
    name: 'gfs',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/gfs/scriptLibrary',
    meta: {
      title: '文件服务',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'gfs'
    },
    children: [
      {
        path: '',
        name: 'gfs-index',
        component: () => import('@/modules/automation/views/ScriptLibraryModule.vue'),
        redirect: '/gfs/scriptLibrary',
        children: [
          { path: 'scriptLibrary', name: 'gfs-scriptLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'git' }, meta: { title: '脚本库' } },
          { path: 'fileLibrary', name: 'gfs-fileLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'staticfs' }, meta: { title: '文件库' } },
          { path: 'scriptReview', name: 'gfs-scriptReview', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'stage' }, meta: { title: '脚本审核' } }
        ]
      }
    ]
  },
  // patches模块 - 补丁管理
  {
    path: '/patches',
    name: 'patches',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/patches/linuxPatchScan',
    meta: {
      title: '补丁管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'patches'
    },
    children: [
      {
        path: '',
        name: 'patches-index',
        component: () => import('@/modules/patches/views/PatchManagementModule.vue'),
        redirect: '/patches/linuxPatchScan',
        children: [
          { path: 'linuxPatchScan', name: 'patches-linuxPatchScan', component: () => import('@/modules/patches/components/LinuxPatchScan.vue'), meta: { title: 'Linux补丁扫描' } },
          { path: 'linuxPatchInstall', name: 'patches-linuxPatchInstall', component: () => import('@/modules/patches/components/LinuxPatchInstall.vue'), meta: { title: 'Linux补丁安装' } },
          { path: 'linuxPatchRollback', name: 'patches-linuxPatchRollback', component: () => import('@/modules/patches/components/LinuxPatchRollback.vue'), meta: { title: 'Linux补丁回退' } },
          { path: 'linuxYumManage', name: 'patches-linuxYumManage', component: () => import('@/modules/patches/components/LinuxYumManage.vue'), meta: { title: 'Linux YUM管理' } },
          { path: 'linuxPatchLibrary', name: 'patches-linuxPatchLibrary', component: () => import('@/modules/patches/components/LinuxPatchLibrary.vue'), meta: { title: 'Linux补丁仓库' } },
          { path: 'linuxVulnerability', name: 'patches-linuxVulnerability', component: () => import('@/modules/patches/components/LinuxVulnerability.vue'), meta: { title: 'Linux漏洞概览' } },
          { path: 'windowsVulnerability', name: 'patches-windowsVulnerability', component: () => import('@/modules/patches/components/WindowsVulnerability.vue'), meta: { title: 'Windows漏洞' } },
          { path: 'windowsUpdate', name: 'patches-windowsUpdate', component: () => import('@/modules/patches/components/WindowsUpdate.vue'), meta: { title: 'Windows更新' } },
          { path: 'windowsRollback', name: 'patches-windowsRollback', component: () => import('@/modules/patches/components/WindowsRollback.vue'), meta: { title: 'Windows回滚' } },
          { path: 'windowsView', name: 'patches-windowsView', component: () => import('@/modules/patches/components/WindowsView.vue'), meta: { title: 'Windows View' } },
          { path: 'logs', name: 'patches-logs', component: () => import('@/modules/patches/components/OperationLogs.vue'), meta: { title: '操作日志' } }
        ]
      }
    ]
  },
  // cac模块 - 系统巡检
  {
    path: '/cac',
    name: 'cac',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/cac/overview',
    meta: {
      title: '系统巡检',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'cac'
    },
    children: [
      {
        path: '',
        name: 'cac-index',
        component: () => import('@/modules/inspection/views/InspectionIndex.vue'),
        redirect: '/cac/overview',
        children: [
          { path: 'overview', name: 'cac-overview', component: () => import('@/modules/inspection/views/InspectionOverview.vue'), meta: { title: '巡检总览' } },
          { path: 'templates', name: 'cac-templates', component: () => import('@/modules/inspection/views/TemplateList.vue'), meta: { title: '巡检模板' } },
          { path: 'results', name: 'cac-results', component: () => import('@/modules/inspection/views/ResultList.vue'), meta: { title: '检查结果' } },
          { path: 'results/:jobId', name: 'cac-result-detail', component: () => import('@/modules/inspection/views/ResultDetail.vue'), meta: { title: '结果详情' } },
          { path: 'structural-diagram/:jobId', name: 'cac-structural-diagram', component: () => import('@/modules/inspection/views/StructuralDiagram.vue'), meta: { title: '架构图' } },
          { path: 'config', name: 'cac-config', component: () => import('@/modules/inspection/views/AssetModelConfig.vue'), meta: { title: '巡检配置' } },
          { path: 'email', name: 'cac-email', component: () => import('@/modules/inspection/views/EmailConfig.vue'), meta: { title: '邮件配置' } }
        ]
      }
    ]
  },
  // acm模块 - 资产管理
  {
    path: '/acm',
    name: 'acm',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/acm/overview',
    meta: {
      title: '资产管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'acm'
    },
    children: [
      {
        path: '',
        name: 'acm-index',
        component: () => import('@/modules/asset/views/AssetIndex.vue'),
        redirect: '/acm/overview',
        children: [
          { path: 'overview', name: 'acm-overview', component: () => import('@/modules/asset/views/AssetOverview.vue'), meta: { title: '资产总览' } },
          { path: 'info', name: 'acm-info', component: () => import('@/modules/asset/views/AssetInfo.vue'), meta: { title: '资产信息' } },
          { path: 'data', name: 'acm-data', component: () => import('@/modules/asset/views/DataManage.vue'), meta: { title: '数据管理' } },
          { path: 'model', name: 'acm-model', component: () => import('@/modules/asset/views/AssetModel.vue'), meta: { title: '资产模型' } },
          { path: 'exception', name: 'acm-exception', component: () => import('@/modules/asset/views/ExceptionDevice.vue'), meta: { title: '异常设备' } },
          { path: 'automation', name: 'acm-automation', component: () => import('@/modules/asset/views/AutomationConfig.vue'), meta: { title: '自动化配置' } },
          { path: 'permission', name: 'acm-permission', component: () => import('@/modules/asset/views/ResourcePermission.vue'), meta: { title: '资源权限' } },
          { path: 'log', name: 'acm-log', component: () => import('@/modules/asset/views/OperationLog.vue'), meta: { title: '操作记录' } }
        ]
      }
    ]
  },
  // ssc模块 - 系统设置
  {
    path: '/ssc',
    name: 'ssc',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/ssc/user',
    meta: {
      title: '系统设置',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'ssc'
    },
    children: [
      {
        path: '',
        name: 'ssc-index',
        component: () => import('@/modules/settings/views/SystemSettingsModule.vue'),
        redirect: '/ssc/user',
        children: [
          { path: 'user', name: 'ssc-user', component: () => import('@/modules/settings/components/UserManagement.vue'), meta: { title: '用户管理' } },
          { path: 'team', name: 'ssc-team', component: () => import('@/modules/settings/components/TeamManagement.vue'), meta: { title: '团队管理' } },
          { path: 'template', name: 'ssc-template', component: () => import('@/modules/settings/components/TemplateAssignment.vue'), meta: { title: '模版分配' } },
          { path: 'applet', name: 'ssc-applet', component: () => import('@/modules/settings/components/AppletManagement.vue'), meta: { title: '应用管理' } },
          { path: 'tag', name: 'ssc-tag', component: () => import('@/modules/settings/components/TagManagement.vue'), meta: { title: '应用标签' } },
          { path: 'param', name: 'ssc-param', component: () => import('@/modules/settings/components/ParamSettings.vue'), meta: { title: '参数配置' } },
          { path: 'appres', name: 'ssc-appres', component: () => import('@/modules/settings/components/AppResManagement.vue'), meta: { title: '应用资源' } },
          { path: 'email', name: 'ssc-email', component: () => import('@/modules/settings/components/EmailSettings.vue'), meta: { title: '电子邮件' } },
          { path: 'datasource', name: 'ssc-datasource', component: () => import('@/modules/settings/components/DataSourceManagement.vue'), meta: { title: '数据源' } },
          { path: 'engine', name: 'ssc-engine', component: () => import('@/modules/settings/components/EngineManagement.vue'), meta: { title: '引擎管理' } }
        ]
      }
    ]
  },
  // users模块 - 用户管理
  {
    path: '/users',
    name: 'users',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/users/overview',
    meta: {
      title: '用户管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'users'
    },
    children: [
      {
        path: '',
        name: 'users-index',
        component: () => import('@/modules/user/views/UserManagementModule.vue'),
        redirect: '/users/overview',
        children: [
          { path: 'overview', name: 'users-overview', component: () => import('@/modules/user/components/overview/OverviewView.vue'), meta: { title: '总览' } },
          { path: 'users', name: 'users-list', component: () => import('@/modules/user/components/users/UsersView.vue'), meta: { title: '用户' } },
          { path: 'groups', name: 'users-groups', component: () => import('@/modules/user/components/groups/UserGroupsView.vue'), meta: { title: '用户组' } },
          { path: 'logs', name: 'users-logs', component: () => import('@/modules/user/components/operation/OperationLogsView.vue'), meta: { title: '操作记录' } },
          { path: 'config', name: 'users-config', component: () => import('@/modules/user/components/config/FeatureConfigView.vue'), meta: { title: '功能配置' } }
        ]
      }
    ]
  },
  // flow模块 - 流程管理
  {
    path: '/flow',
    name: 'flow',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/flow/list',
    meta: {
      title: '流程管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'flow'
    },
    children: [
      {
        path: '',
        name: 'flow-index',
        component: () => import('@/modules/flow/views/FlowManagementModule.vue'),
        redirect: '/flow/list',
        children: [
          { path: 'list', name: 'flow-list', component: () => import('@/modules/flow/components/FlowListView.vue'), meta: { title: '流程列表' } },
          { path: 'execution', name: 'flow-execution', component: () => import('@/modules/flow/components/ExecutionListView.vue'), meta: { title: '执行列表' } }
        ]
      }
    ]
  },
  // password模块 - 密码管理
  {
    path: '/password',
    name: 'password',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/password/application',
    meta: {
      title: '密码管理',
      requiresAuth: true,
      moduleType: 'vue-native',
      moduleCode: 'password'
    },
    children: [
      {
        path: '',
        name: 'password-index',
        component: () => import('@/modules/password/views/PasswordManagementModule.vue'),
        redirect: '/password/application',
        children: [
          { path: 'application', name: 'password-application', component: () => import('@/modules/password/components/ApplicationApprovalList.vue'), meta: { title: '申请审批' } },
          { path: 'settings', name: 'password-settings', component: () => import('@/modules/password/components/PasswordSettings.vue'), meta: { title: '参数配置' } },
          { path: 'logs', name: 'password-logs', component: () => import('@/modules/password/components/PasswordOperationLog.vue'), meta: { title: '操作记录' } }
        ]
      }
    ]
  },
  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
