/**
 * 基础路由配置
 * 按一级菜单分组组织路由，使用动态路由参数让同一分组内的模块共享布局组件
 * 这样在同一分组内切换模块时，侧边菜单不会重新加载
 */

// 同步导入布局组件
import MainLayout from '@/layouts/MainLayout.vue'

// 分组布局组件（懒加载）
const AutomationGroupLayout = () => import('@/layouts/groups/AutomationGroupLayout.vue')
const PatchGroupLayout = () => import('@/layouts/groups/PatchGroupLayout.vue')
const InspectionGroupLayout = () => import('@/layouts/groups/InspectionGroupLayout.vue')
const AssetGroupLayout = () => import('@/layouts/groups/AssetGroupLayout.vue')
const UserGroupLayout = () => import('@/layouts/groups/UserGroupLayout.vue')
const SettingsGroupLayout = () => import('@/layouts/groups/SettingsGroupLayout.vue')

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
    component: MainLayout,
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
    component: MainLayout,
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
    component: () => import('@/views/Dashboard.vue'),
    meta: {
      title: '迁移管理 - OPSmind',
      requiresAuth: true,
      requiresPermission: 'admin'
    }
  },

  // ========== 自动化管理分组 (jao, gfs, cmd) ==========
  // 使用动态路由参数，让同一分组内的模块共享 AutomationGroupLayout
  {
    path: '/:moduleCode(jao|gfs|cmd)',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'automation' },
    children: [
      {
        path: '',
        component: AutomationGroupLayout,
        children: [
          // jao 模块路由
          {
            path: '', redirect: to => {
              const defaults = { jao: '/jao/jobs', gfs: '/gfs/scriptLibrary', cmd: '/cmd/list' }
              return defaults[to.params.moduleCode] || '/jao/jobs'
            }
          },
          { path: 'jobs', name: 'jao-jobs', component: () => import('@/modules/automation/components/job/JobListView/JobListView.vue'), meta: { title: '作业列表', moduleCode: 'jao' } },
          { path: 'schedule', name: 'jao-schedule', component: () => import('@/modules/automation/components/job/schedule/JobScheduleView.vue'), meta: { title: '流程编排', moduleCode: 'jao' } },
          { path: 'requests', name: 'jao-requests', component: () => import('@/modules/automation/components/job/JobMyRequestsView.vue'), meta: { title: '我的申请', moduleCode: 'jao' } },
          { path: 'approvals', name: 'jao-approvals', component: () => import('@/modules/automation/components/job/JobApprovalsView.vue'), meta: { title: '作业审批', moduleCode: 'jao' } },
          { path: 'runLogs', name: 'jao-runLogs', component: () => import('@/modules/automation/components/job/JobRunLogsView.vue'), meta: { title: '运行记录', moduleCode: 'jao' } },
          { path: 'statistics', name: 'jao-statistics', component: () => import('@/modules/automation/components/job/JobStatisticsView.vue'), meta: { title: '数据统计', moduleCode: 'jao' } },
          { path: 'taskScheduler', name: 'jao-taskScheduler', component: () => import('@/modules/automation/components/job/JobTaskSchedulerView.vue'), meta: { title: '定时任务', moduleCode: 'jao' } },
          // gfs 模块路由
          { path: 'scriptLibrary', name: 'gfs-scriptLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'git' }, meta: { title: '脚本库', moduleCode: 'gfs' } },
          { path: 'fileLibrary', name: 'gfs-fileLibrary', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'staticfs' }, meta: { title: '文件库', moduleCode: 'gfs' } },
          { path: 'scriptReview', name: 'gfs-scriptReview', component: () => import('@/modules/automation/components/script/ScriptFileList.vue'), props: { repoType: 'stage' }, meta: { title: '脚本审核', moduleCode: 'gfs' } },
          // cmd 模块路由 - 需要通过 CommandCenterModule 包裹以支持执行命令对话框
          {
            path: 'list',
            name: 'cmd-list',
            component: () => import('@/modules/automation/views/CommandCenterModule.vue'),
            meta: { title: '命令列表', moduleCode: 'cmd' },
            children: [
              { path: '', component: () => import('@/modules/automation/components/command/CommandList.vue') }
            ]
          },
          { path: 'job', name: 'cmd-job', component: () => import('@/modules/automation/components/command/CommandJobList.vue'), meta: { title: '命令作业', moduleCode: 'cmd' } },
          { path: 'review', name: 'cmd-review', component: () => import('@/modules/automation/components/command/CommandApproveList.vue'), meta: { title: '命令审核', moduleCode: 'cmd' } },
          { path: 'logs', name: 'cmd-logs', component: () => import('@/modules/automation/components/command/CommandLogs.vue'), meta: { title: '执行日志', moduleCode: 'cmd' } },
          { path: 'console', name: 'cmd-console', component: () => import('@/modules/automation/components/command/CommandConsole.vue'), meta: { title: '控制台', moduleCode: 'cmd' } }
        ]
      }
    ]
  },

  // ========== 补丁漏洞分组 (patches, software) ==========
  {
    path: '/:moduleCode(patches|software)',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'patch-testing' },
    children: [
      {
        path: '',
        component: PatchGroupLayout,
        children: [
          // 动态重定向
          {
            path: '', redirect: to => {
              const defaults = { patches: '/patches/machineScan', software: '/software/packages' }
              return defaults[to.params.moduleCode] || '/patches/machineScan'
            }
          },
          // patches 模块路由
          { path: 'machineScan', name: 'patches-machineScan', component: () => import('@/modules/patches/components/LinuxPatchScan.vue'), meta: { title: '机器扫描', moduleCode: 'patches' } },
          { path: 'patchInstall', name: 'patches-patchInstall', component: () => import('@/modules/patches/components/LinuxPatchInstall.vue'), meta: { title: '补丁安装', moduleCode: 'patches' } },
          { path: 'changeRollback', name: 'patches-changeRollback', component: () => import('@/modules/patches/components/LinuxPatchRollback.vue'), meta: { title: '变更回滚', moduleCode: 'patches' } },
          { path: 'linuxYumManage', name: 'patches-linuxYumManage', component: () => import('@/modules/patches/components/LinuxYumManage.vue'), meta: { title: 'Linux YUM管理', moduleCode: 'patches' } },
          { path: 'patchLibrary', name: 'patches-patchLibrary', component: () => import('@/modules/patches/components/LinuxPatchLibrary.vue'), meta: { title: '补丁仓库', moduleCode: 'patches' } },
          { path: 'vulnerability', name: 'patches-vulnerability', component: () => import('@/modules/patches/components/LinuxVulnerability.vue'), meta: { title: '漏洞概览', moduleCode: 'patches' } },
          { path: 'windowsVulnerability', name: 'patches-windowsVulnerability', component: () => import('@/modules/patches/components/WindowsVulnerability.vue'), meta: { title: 'Windows漏洞', moduleCode: 'patches' } },
          { path: 'windowsUpdate', name: 'patches-windowsUpdate', component: () => import('@/modules/patches/components/WindowsUpdate.vue'), meta: { title: 'Windows更新', moduleCode: 'patches' } },
          { path: 'windowsRollback', name: 'patches-windowsRollback', component: () => import('@/modules/patches/components/WindowsRollback.vue'), meta: { title: 'Windows回滚', moduleCode: 'patches' } },
          { path: 'windowsView', name: 'patches-windowsView', component: () => import('@/modules/patches/components/WindowsView.vue'), meta: { title: 'Windows View', moduleCode: 'patches' } },
          { path: 'logs', name: 'patches-logs', component: () => import('@/modules/patches/components/OperationLogs.vue'), meta: { title: '操作日志', moduleCode: 'patches' } },
          // software 模块路由
          { path: 'packages', name: 'software-packages', component: () => import('@/modules/software/views/SoftwareHome.vue'), meta: { title: '软件概览', moduleCode: 'software' } },
          { path: 'repos', name: 'software-repos', component: () => import('@/modules/software/views/RepoManagement.vue'), meta: { title: '仓库管理', moduleCode: 'software' } },
          { path: 'localInstall', name: 'software-localInstall', component: () => import('@/modules/software/views/LocalInstall.vue'), meta: { title: '本地安装', moduleCode: 'software' } },
          { path: 'yumManage', name: 'software-yumManage', component: () => import('@/modules/patches/components/LinuxYumManage.vue'), meta: { title: '软件源管理', moduleCode: 'software' } },
          { path: 'logs', name: 'software-logs', component: () => import('@/modules/software/views/LogReport.vue'), meta: { title: '操作日志', moduleCode: 'software' } }
        ]
      }
    ]
  },

  // ========== 系统巡检分组 (cac) - 单模块分组 ==========
  {
    path: '/cac',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', moduleCode: 'cac', groupCode: 'system-inspection' },
    children: [
      {
        path: '',
        component: InspectionGroupLayout,
        redirect: '/cac/overview',
        children: [
          { path: 'overview', name: 'cac-overview', component: () => import('@/modules/inspection/views/InspectionOverview.vue'), meta: { title: '巡检总览' } },
          { path: 'templates', name: 'cac-templates', component: () => import('@/modules/inspection/views/TemplateList.vue'), meta: { title: '巡检模板' } },
          { path: 'results', name: 'cac-results', component: () => import('@/modules/inspection/views/ResultList.vue'), meta: { title: '执行记录' } },
          { path: 'results/:jobId', name: 'cac-result-detail', component: () => import('@/modules/inspection/views/ResultDetail.vue'), meta: { title: '结果详情' } },
          { path: 'structural-diagram/:jobId', name: 'cac-structural-diagram', component: () => import('@/modules/inspection/views/StructuralDiagram.vue'), meta: { title: '架构图' } },
          { path: 'config', name: 'cac-config', component: () => import('@/modules/inspection/views/AssetModelConfig.vue'), meta: { title: '导出配置' } },
          { path: 'email', name: 'cac-email', component: () => import('@/modules/inspection/views/EmailConfig.vue'), meta: { title: '邮件配置' } }
        ]
      }
    ]
  },

  // ========== 资产管理分组 (acm) - 单模块分组 ==========
  {
    path: '/acm',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', moduleCode: 'acm', groupCode: 'asset-management' },
    children: [
      {
        path: '',
        component: AssetGroupLayout,
        redirect: '/acm/overview',
        children: [
          { path: 'overview', name: 'acm-overview', component: () => import('@/modules/asset/views/AssetOverview.vue'), meta: { title: '资产总览' } },
          { path: 'info', name: 'acm-info', component: () => import('@/modules/asset/views/AssetInfo.vue'), meta: { title: '资产列表' } },
          { path: 'data', name: 'acm-data', component: () => import('@/modules/asset/views/DataManage.vue'), meta: { title: '数据管理' } },
          { path: 'model', name: 'acm-model', component: () => import('@/modules/asset/views/AssetModel.vue'), meta: { title: '资产模型' } },
          { path: 'exception', name: 'acm-exception', component: () => import('@/modules/asset/views/ExceptionDevice.vue'), meta: { title: '异常设备' } },
          { path: 'automation', name: 'acm-automation', component: () => import('@/modules/asset/views/AutomationConfig.vue'), meta: { title: '自动化配置' } },
          { path: 'permission', name: 'acm-permission', component: () => import('@/modules/asset/views/ResourcePermission.vue'), meta: { title: '资源权限' } },
          { path: 'log', name: 'acm-log', component: () => import('@/modules/asset/views/OperationLog.vue'), meta: { title: '操作日志' } }
        ]
      }
    ]
  },

  // ========== 用户管理分组 (users, flow, sudo, password) ==========
  {
    path: '/:moduleCode(users|flow|sudo|password)',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', groupCode: 'user-management' },
    children: [
      {
        path: '',
        component: UserGroupLayout,
        children: [
          // 动态重定向
          {
            path: '', redirect: to => {
              const defaults = { users: '/users/overview', flow: '/flow/list', sudo: '/sudo/permission', password: '/password/application' }
              return defaults[to.params.moduleCode] || '/users/overview'
            }
          },
          // users 模块路由
          { path: 'overview', name: 'users-overview', component: () => import('@/modules/user/components/overview/OverviewView.vue'), meta: { title: '用户总览', moduleCode: 'users' } },
          { path: 'users', name: 'users-list', component: () => import('@/modules/user/components/users/UsersView.vue'), meta: { title: '用户列表', moduleCode: 'users' } },
          { path: 'groups', name: 'users-groups', component: () => import('@/modules/user/components/groups/UserGroupsView.vue'), meta: { title: '用户组', moduleCode: 'users' } },
          { path: 'logs', name: 'users-logs', component: () => import('@/modules/user/components/operation/OperationLogsView.vue'), meta: { title: '操作日志', moduleCode: 'users' } },
          { path: 'config', name: 'users-config', component: () => import('@/modules/user/components/config/FeatureConfigView.vue'), meta: { title: '功能配置', moduleCode: 'users' } },
          // flow 模块路由 - 需要通过 FlowManagementModule 包裹以支持设计器/执行器等全屏视图
          {
            path: 'list',
            name: 'flow-list',
            component: () => import('@/modules/flow/views/FlowManagementModule.vue'),
            meta: { title: '流程定义', moduleCode: 'flow' },
            children: [
              { path: '', component: () => import('@/modules/flow/components/FlowListView.vue') }
            ]
          },
          { path: 'execution', name: 'flow-execution', component: () => import('@/modules/flow/components/ExecutionListView.vue'), meta: { title: '执行记录', moduleCode: 'flow' } },
          // sudo 模块路由
          { path: 'permission', name: 'sudo-permission', component: () => import('@/modules/sudo/components/SudoPermissionList.vue'), meta: { title: 'sudo列表', moduleCode: 'sudo' } },
          { path: 'apply', name: 'sudo-apply', component: () => import('@/modules/sudo/components/SudoApplyList.vue'), meta: { title: '权限申请', moduleCode: 'sudo' } },
          { path: 'reset', name: 'sudo-reset', component: () => import('@/modules/sudo/components/SudoResetPassword.vue'), meta: { title: '重置密码', moduleCode: 'sudo' } },
          { path: 'settings', name: 'sudo-settings', component: () => import('@/modules/sudo/components/SudoSettings.vue'), meta: { title: '功能设置', moduleCode: 'sudo' } },
          { path: 'log', name: 'sudo-log', component: () => import('@/modules/sudo/components/SudoOperationLog.vue'), meta: { title: '操作日志', moduleCode: 'sudo' } },
          // password 模块路由 - 需要通过 PasswordManagementModule 包裹以支持管理员面板
          {
            path: 'application',
            name: 'password-application',
            component: () => import('@/modules/password/views/PasswordManagementModule.vue'),
            meta: { title: '申请审批', moduleCode: 'password' },
            children: [
              { path: '', component: () => import('@/modules/password/components/ApplicationApprovalList.vue') }
            ]
          },
          { path: 'settings', name: 'password-settings', component: () => import('@/modules/password/components/PasswordSettings.vue'), meta: { title: '参数配置', moduleCode: 'password' } },
          { path: 'logs', name: 'password-logs', component: () => import('@/modules/password/components/PasswordOperationLog.vue'), meta: { title: '操作日志', moduleCode: 'password' } }
        ]
      }
    ]
  },

  // ========== 系统设置（独立分组） ==========
  {
    path: '/ssc',
    component: MainLayout,
    meta: { requiresAuth: true, moduleType: 'vue-native', moduleCode: 'ssc', showModuleToolbar: true },
    children: [
      {
        path: '',
        component: SettingsGroupLayout,
        redirect: '/ssc/user',
        children: [
          { path: 'user', name: 'ssc-user', component: () => import('@/modules/settings/components/UserManagement.vue'), meta: { title: '用户管理' } },
          { path: 'team', name: 'ssc-team', component: () => import('@/modules/settings/components/TeamManagement.vue'), meta: { title: '团队管理' } },
          { path: 'template', name: 'ssc-template', component: () => import('@/modules/settings/components/TemplateAssignment.vue'), meta: { title: '模版分配' } },
          { path: 'applet', name: 'ssc-applet', component: () => import('@/modules/settings/components/AppletManagement.vue'), meta: { title: '应用管理' } },
          { path: 'tag', name: 'ssc-tag', component: () => import('@/modules/settings/components/TagManagement.vue'), meta: { title: '应用标签' } },
          { path: 'param', name: 'ssc-param', component: () => import('@/modules/settings/components/ParamSettings.vue'), meta: { title: '参数配置' } },
          { path: 'appres', name: 'ssc-appres', component: () => import('@/modules/settings/components/AppResManagement.vue'), meta: { title: '应用资源' } },
          { path: 'email', name: 'ssc-email', component: () => import('@/modules/settings/components/EmailSettings.vue'), meta: { title: '邮件设置' } },
          { path: 'datasource', name: 'ssc-datasource', component: () => import('@/modules/settings/components/DataSourceManagement.vue'), meta: { title: '数据源管理' } },
          { path: 'engine', name: 'ssc-engine', component: () => import('@/modules/settings/components/EngineManagement.vue'), meta: { title: '引擎管理' } }
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
