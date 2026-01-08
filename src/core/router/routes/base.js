/**
 * 基础路由配置
 * 使用统一的 OpsLayout 作为主布局
 */

export const baseRoutes = [
  {
    path: '/',
    redirect: '/home'
  },
  // 登录页 - 无布局
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
  // 错误页 - 无布局
  {
    path: '/error/404',
    name: 'error-404',
    component: () => import('@/views/Error404.vue'),
    meta: { title: '未找到页面' }
  },
  // 关于页面 - 无布局
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于 - OPSmind' }
  },
  // AI助手 - 无布局
  {
    path: '/aiops',
    name: 'aiops',
    component: () => import('@/views/AiOpsAssistant.vue'),
    meta: {
      title: 'OPS智能助手',
      requiresAuth: true
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

  // ========================================
  // 主应用 - 使用统一的 OpsLayout 布局
  // ========================================
  {
    path: '/',
    component: () => import('@/layouts/OpsLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // ============ 首页 ============
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页', affix: true }
      },
      // ============ 个人设置 ============
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/ProfileSettings.vue'),
        meta: { title: '个人资料' }
      },

      // ============ 作业中心 ============
      { path: 'jao/jobs', name: 'jao-jobs', component: () => import('@/modules/automation/components/job/JobListView/JobListView.vue'), meta: { title: '作业列表' } },
      { path: 'jao/schedule', name: 'jao-schedule', component: () => import('@/modules/automation/components/job/schedule/JobScheduleView.vue'), meta: { title: '流程编排' } },
      { path: 'jao/requests', name: 'jao-requests', component: () => import('@/modules/automation/components/job/JobMyRequestsView.vue'), meta: { title: '我的申请' } },
      { path: 'jao/approvals', name: 'jao-approvals', component: () => import('@/modules/automation/components/job/JobApprovalsView.vue'), meta: { title: '作业审批' } },
      { path: 'jao/runLogs', name: 'jao-runLogs', component: () => import('@/modules/automation/components/job/JobRunLogsView.vue'), meta: { title: '运行记录' } },
      { path: 'jao/statistics', name: 'jao-statistics', component: () => import('@/modules/automation/components/job/JobStatisticsView.vue'), meta: { title: '数据统计' } },
      { path: 'jao/taskScheduler', name: 'jao-taskScheduler', component: () => import('@/modules/automation/components/job/JobTaskSchedulerView.vue'), meta: { title: '定时任务' } },

      // ============ 脚本中心 ============
      { path: 'gfs/scriptLibrary', name: 'gfs-scriptLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'git' }, meta: { title: '脚本库' } },
      { path: 'gfs/fileLibrary', name: 'gfs-fileLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'staticfs' }, meta: { title: '文件库' } },
      { path: 'gfs/scriptReview', name: 'gfs-scriptReview', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'stage' }, meta: { title: '脚本审核' } },

      // ============ 命令中心 ============
      { path: 'cmd/list', name: 'cmd-list', component: () => import('@/modules/automation/components/command/CommandList.vue'), meta: { title: '命令列表' } },
      { path: 'cmd/job', name: 'cmd-job', component: () => import('@/modules/automation/components/command/CommandJobList.vue'), meta: { title: '命令作业' } },
      { path: 'cmd/review', name: 'cmd-review', component: () => import('@/modules/automation/components/command/CommandApproveList.vue'), meta: { title: '命令审核' } },
      { path: 'cmd/logs', name: 'cmd-logs', component: () => import('@/modules/automation/components/command/CommandLogs.vue'), meta: { title: '执行日志' } },
      { path: 'cmd/console', name: 'cmd-console', component: () => import('@/modules/automation/components/command/CommandConsole.vue'), meta: { title: '控制台' } },

      // ============ 补丁管理 ============
      { path: 'patches/machineScan', name: 'patches-machineScan', component: () => import('@/modules/patches/components/LinuxPatchScan.vue'), meta: { title: '机器扫描' } },
      { path: 'patches/patchInstall', name: 'patches-patchInstall', component: () => import('@/modules/patches/components/LinuxPatchInstall.vue'), meta: { title: '补丁安装' } },
      { path: 'patches/changeRollback', name: 'patches-changeRollback', component: () => import('@/modules/patches/components/LinuxPatchRollback.vue'), meta: { title: '变更回滚' } },
      { path: 'patches/linuxYumManage', name: 'patches-linuxYumManage', component: () => import('@/modules/patches/components/LinuxYumManage.vue'), meta: { title: 'Linux YUM管理' } },
      { path: 'patches/patchLibrary', name: 'patches-patchLibrary', component: () => import('@/modules/patches/components/LinuxPatchLibrary.vue'), meta: { title: '补丁仓库' } },
      { path: 'patches/vulnerability', name: 'patches-vulnerability', component: () => import('@/modules/patches/components/LinuxVulnerability.vue'), meta: { title: '漏洞概览' } },
      { path: 'patches/windowsVulnerability', name: 'patches-windowsVulnerability', component: () => import('@/modules/patches/components/WindowsVulnerability.vue'), meta: { title: 'Windows漏洞' } },
      { path: 'patches/windowsUpdate', name: 'patches-windowsUpdate', component: () => import('@/modules/patches/components/WindowsUpdate.vue'), meta: { title: 'Windows更新' } },
      { path: 'patches/windowsRollback', name: 'patches-windowsRollback', component: () => import('@/modules/patches/components/WindowsRollback.vue'), meta: { title: 'Windows回滚' } },
      { path: 'patches/windowsView', name: 'patches-windowsView', component: () => import('@/modules/patches/components/WindowsView.vue'), meta: { title: 'Windows View' } },
      { path: 'patches/logs', name: 'patches-logs', component: () => import('@/modules/patches/components/OperationLogs.vue'), meta: { title: '操作日志' } },

      // ============ 软件管理 ============
      { path: 'software/packages', name: 'software-packages', component: () => import('@/modules/software/views/SoftwareHome.vue'), meta: { title: '软件概览' } },
      { path: 'software/repos', name: 'software-repos', component: () => import('@/modules/software/views/RepoManagement.vue'), meta: { title: '仓库管理' } },
      { path: 'software/localInstall', name: 'software-localInstall', component: () => import('@/modules/software/views/LocalInstall.vue'), meta: { title: '本地安装' } },
      { path: 'software/logs', name: 'software-logs', component: () => import('@/modules/software/views/LogReport.vue'), meta: { title: '操作日志' } },

      // ============ 系统巡检 ============
      { path: 'cac/overview', name: 'cac-overview', component: () => import('@/modules/inspection/views/InspectionOverview.vue'), meta: { title: '巡检总览' } },
      { path: 'cac/templates', name: 'cac-templates', component: () => import('@/modules/inspection/views/TemplateList.vue'), meta: { title: '巡检模板' } },
      { path: 'cac/results', name: 'cac-results', component: () => import('@/modules/inspection/views/ResultList.vue'), meta: { title: '执行记录' } },
      { path: 'cac/results/:jobId', name: 'cac-result-detail', component: () => import('@/modules/inspection/views/ResultDetail.vue'), meta: { title: '结果详情' } },
      { path: 'cac/structural-diagram/:jobId', name: 'cac-structural-diagram', component: () => import('@/modules/inspection/views/StructuralDiagram.vue'), meta: { title: '架构图' } },
      { path: 'cac/config', name: 'cac-config', component: () => import('@/modules/inspection/views/AssetModelConfig.vue'), meta: { title: '导出配置' } },
      { path: 'cac/email', name: 'cac-email', component: () => import('@/modules/inspection/views/EmailConfig.vue'), meta: { title: '邮件配置' } },

      // ============ 资产管理 ============
      { path: 'acm/overview', name: 'acm-overview', component: () => import('@/modules/asset/views/AssetOverview.vue'), meta: { title: '资产总览' } },
      { path: 'acm/info', name: 'acm-info', component: () => import('@/modules/asset/views/AssetInfo.vue'), meta: { title: '资产列表' } },
      { path: 'acm/data', name: 'acm-data', component: () => import('@/modules/asset/views/DataManage.vue'), meta: { title: '数据管理' } },
      { path: 'acm/model', name: 'acm-model', component: () => import('@/modules/asset/views/AssetModel.vue'), meta: { title: '资产模型' } },
      { path: 'acm/exception', name: 'acm-exception', component: () => import('@/modules/asset/views/ExceptionDevice.vue'), meta: { title: '异常设备' } },
      { path: 'acm/automation', name: 'acm-automation', component: () => import('@/modules/asset/views/AutomationConfig.vue'), meta: { title: '自动化配置' } },
      { path: 'acm/permission', name: 'acm-permission', component: () => import('@/modules/asset/views/ResourcePermission.vue'), meta: { title: '资源权限' } },
      { path: 'acm/log', name: 'acm-log', component: () => import('@/modules/asset/views/OperationLog.vue'), meta: { title: '操作日志' } },

      // ============ 用户管理 ============
      { path: 'users/overview', name: 'users-overview', component: () => import('@/modules/user/components/overview/OverviewView.vue'), meta: { title: '用户总览' } },
      { path: 'users/users', name: 'users-list', component: () => import('@/modules/user/components/users/UsersView.vue'), meta: { title: '用户列表' } },
      { path: 'users/groups', name: 'users-groups', component: () => import('@/modules/user/components/groups/UserGroupsView.vue'), meta: { title: '用户组' } },
      { path: 'users/logs', name: 'users-logs', component: () => import('@/modules/user/components/operation/OperationLogsView.vue'), meta: { title: '操作日志' } },
      { path: 'users/config', name: 'users-config', component: () => import('@/modules/user/components/config/FeatureConfigView.vue'), meta: { title: '功能配置' } },

      // ============ 流程管理 ============
      { path: 'flow/list', name: 'flow-list', component: () => import('@/modules/flow/components/FlowListView.vue'), meta: { title: '流程定义' } },
      { path: 'flow/execution', name: 'flow-execution', component: () => import('@/modules/flow/components/ExecutionListView.vue'), meta: { title: '执行记录' } },

      // ============ sudo权限 ============
      { path: 'sudo/permission', name: 'sudo-permission', component: () => import('@/modules/sudo/components/SudoPermissionList.vue'), meta: { title: 'sudo列表' } },
      { path: 'sudo/apply', name: 'sudo-apply', component: () => import('@/modules/sudo/components/SudoApplyList.vue'), meta: { title: '权限申请' } },
      { path: 'sudo/reset', name: 'sudo-reset', component: () => import('@/modules/sudo/components/SudoResetPassword.vue'), meta: { title: '重置密码' } },
      { path: 'sudo/settings', name: 'sudo-settings', component: () => import('@/modules/sudo/components/SudoSettings.vue'), meta: { title: '功能设置' } },
      { path: 'sudo/log', name: 'sudo-log', component: () => import('@/modules/sudo/components/SudoOperationLog.vue'), meta: { title: '操作日志' } },

      // ============ 密码管理 ============
      { path: 'password/application', name: 'password-application', component: () => import('@/modules/password/components/ApplicationApprovalList.vue'), meta: { title: '申请审批' } },
      { path: 'password/settings', name: 'password-settings', component: () => import('@/modules/password/components/PasswordSettings.vue'), meta: { title: '参数配置' } },
      { path: 'password/logs', name: 'password-logs', component: () => import('@/modules/password/components/PasswordOperationLog.vue'), meta: { title: '操作日志' } },

      // ============ 系统设置 ============
      { path: 'ssc/user', name: 'ssc-user', component: () => import('@/modules/settings/components/UserManagement.vue'), meta: { title: '用户管理' } },
      { path: 'ssc/team', name: 'ssc-team', component: () => import('@/modules/settings/components/TeamManagement.vue'), meta: { title: '团队管理' } },
      { path: 'ssc/template', name: 'ssc-template', component: () => import('@/modules/settings/components/TemplateAssignment.vue'), meta: { title: '模版分配' } },
      { path: 'ssc/applet', name: 'ssc-applet', component: () => import('@/modules/settings/components/AppletManagement.vue'), meta: { title: '应用管理' } },
      { path: 'ssc/tag', name: 'ssc-tag', component: () => import('@/modules/settings/components/TagManagement.vue'), meta: { title: '应用标签' } },
      { path: 'ssc/param', name: 'ssc-param', component: () => import('@/modules/settings/components/ParamSettings.vue'), meta: { title: '参数配置' } },
      { path: 'ssc/appres', name: 'ssc-appres', component: () => import('@/modules/settings/components/AppResManagement.vue'), meta: { title: '应用资源' } },
      { path: 'ssc/email', name: 'ssc-email', component: () => import('@/modules/settings/components/EmailSettings.vue'), meta: { title: '邮件设置' } },
      { path: 'ssc/datasource', name: 'ssc-datasource', component: () => import('@/modules/settings/components/DataSourceManagement.vue'), meta: { title: '数据源管理' } },
      { path: 'ssc/engine', name: 'ssc-engine', component: () => import('@/modules/settings/components/EngineManagement.vue'), meta: { title: '引擎管理' } },

      // ============ 模块默认重定向 ============
      { path: 'jao', redirect: '/jao/jobs' },
      { path: 'gfs', redirect: '/gfs/scriptLibrary' },
      { path: 'cmd', redirect: '/cmd/list' },
      { path: 'patches', redirect: '/patches/machineScan' },
      { path: 'software', redirect: '/software/packages' },
      { path: 'cac', redirect: '/cac/overview' },
      { path: 'acm', redirect: '/acm/overview' },
      { path: 'users', redirect: '/users/overview' },
      { path: 'flow', redirect: '/flow/list' },
      { path: 'sudo', redirect: '/sudo/permission' },
      { path: 'password', redirect: '/password/application' },
      { path: 'ssc', redirect: '/ssc/user' }
    ]
  },

  // 通配符路由 - 必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error/404'
  }
]
