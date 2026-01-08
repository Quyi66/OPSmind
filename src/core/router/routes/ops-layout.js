/**
 * 新布局路由配置
 * 使用 OpsLayout.vue 作为主布局
 * 所有模块路由都在同一个布局下
 */

/**
 * OpsLayout 下的所有路由配置
 */
export const opsLayoutRoutes = {
    path: '/',
    name: 'ops-root',
    component: () => import('@/layouts/OpsLayout.vue'),
    redirect: '/home',
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

        // ============ 自动化管理 - 作业中心 ============
        {
            path: 'jao',
            name: 'jao',
            component: () => import('@/modules/automation/views/JobOrchestrationModule.vue'),
            redirect: '/jao/jobs',
            meta: { title: '作业中心' },
            children: [
                { path: 'jobs', name: 'jao-jobs', component: () => import('@/modules/automation/components/job/JobListView/JobListView.vue'), meta: { title: '作业列表' } },
                { path: 'schedule', name: 'jao-schedule', component: () => import('@/modules/automation/components/job/schedule/JobScheduleView.vue'), meta: { title: '流程编排' } },
                { path: 'requests', name: 'jao-requests', component: () => import('@/modules/automation/components/job/JobMyRequestsView.vue'), meta: { title: '我的申请' } },
                { path: 'approvals', name: 'jao-approvals', component: () => import('@/modules/automation/components/job/JobApprovalsView.vue'), meta: { title: '作业审批' } },
                { path: 'runLogs', name: 'jao-runLogs', component: () => import('@/modules/automation/components/job/JobRunLogsView.vue'), meta: { title: '运行记录' } },
                { path: 'statistics', name: 'jao-statistics', component: () => import('@/modules/automation/components/job/JobStatisticsView.vue'), meta: { title: '数据统计' } },
                { path: 'taskScheduler', name: 'jao-taskScheduler', component: () => import('@/modules/automation/components/job/JobTaskSchedulerView.vue'), meta: { title: '定时任务' } }
            ]
        },

        // ============ 自动化管理 - 脚本中心 ============
        {
            path: 'gfs',
            name: 'gfs',
            component: () => import('@/modules/automation/views/ScriptManagementModule.vue'),
            redirect: '/gfs/scriptLibrary',
            meta: { title: '脚本中心' },
            children: [
                { path: 'scriptLibrary', name: 'gfs-scriptLibrary', component: () => import('@/modules/automation/components/script/ScriptLibrary.vue'), meta: { title: '脚本库' } },
                { path: 'fileLibrary', name: 'gfs-fileLibrary', component: () => import('@/modules/automation/components/script/FileLibrary.vue'), meta: { title: '文件库' } },
                { path: 'scriptReview', name: 'gfs-scriptReview', component: () => import('@/modules/automation/components/script/ScriptReview.vue'), meta: { title: '脚本审核' } }
            ]
        },

        // ============ 自动化管理 - 命令中心 ============
        {
            path: 'cmd',
            name: 'cmd',
            component: () => import('@/modules/automation/views/CommandManagementModule.vue'),
            redirect: '/cmd/list',
            meta: { title: '命令中心' },
            children: [
                { path: 'list', name: 'cmd-list', component: () => import('@/modules/automation/components/command/CommandListView.vue'), meta: { title: '命令列表' } },
                { path: 'job', name: 'cmd-job', component: () => import('@/modules/automation/components/command/CommandJobView.vue'), meta: { title: '命令作业' } },
                { path: 'review', name: 'cmd-review', component: () => import('@/modules/automation/components/command/CommandReviewView.vue'), meta: { title: '命令审核' } },
                { path: 'logs', name: 'cmd-logs', component: () => import('@/modules/automation/components/command/CommandLogsView.vue'), meta: { title: '执行日志' } },
                { path: 'console', name: 'cmd-console', component: () => import('@/modules/automation/components/command/WebSSH.vue'), meta: { title: '控制台' } }
            ]
        },

        // ============ 补丁管理 ============
        {
            path: 'patches',
            name: 'patches',
            component: () => import('@/modules/patches/views/PatchManagementModule.vue'),
            redirect: '/patches/machineScan',
            meta: { title: '补丁管理' },
            children: [
                { path: 'machineScan', name: 'patches-machineScan', component: () => import('@/modules/patches/components/linuxScan/LinuxPatchScan.vue'), meta: { title: '机器扫描' } },
                { path: 'patchInstall', name: 'patches-patchInstall', component: () => import('@/modules/patches/components/patchInstall/PatchInstallList.vue'), meta: { title: '补丁安装' } },
                { path: 'logs', name: 'patches-logs', component: () => import('@/modules/patches/components/OperationLogView.vue'), meta: { title: '操作日志报告' } }
            ]
        },

        // ============ 软件管理 ============
        {
            path: 'software',
            name: 'software',
            component: () => import('@/modules/software/views/SoftwareManagementModule.vue'),
            redirect: '/software/packages',
            meta: { title: '软件管理' },
            children: [
                { path: 'packages', name: 'software-packages', component: () => import('@/modules/software/components/SoftwareOverview.vue'), meta: { title: '软件概览' } },
                { path: 'repos', name: 'software-repos', component: () => import('@/modules/software/components/RepoManagement.vue'), meta: { title: '仓库管理' } },
                { path: 'localInstall', name: 'software-localInstall', component: () => import('@/modules/software/components/LocalInstall.vue'), meta: { title: '本地安装' } },
                { path: 'logs', name: 'software-logs', component: () => import('@/modules/software/components/SoftwareOperationLog.vue'), meta: { title: '操作日志' } }
            ]
        },

        // ============ 系统巡检 ============
        {
            path: 'cac',
            name: 'cac',
            component: () => import('@/modules/check/views/CheckModule.vue'),
            redirect: '/cac/overview',
            meta: { title: '系统巡检' },
            children: [
                { path: 'overview', name: 'cac-overview', component: () => import('@/modules/check/components/OverviewView.vue'), meta: { title: '巡检总览' } },
                { path: 'templates', name: 'cac-templates', component: () => import('@/modules/check/components/TemplateListView.vue'), meta: { title: '巡检模板' } },
                { path: 'results', name: 'cac-results', component: () => import('@/modules/check/components/ExecutionRecords.vue'), meta: { title: '执行记录' } },
                { path: 'config', name: 'cac-config', component: () => import('@/modules/check/components/ExportConfigView.vue'), meta: { title: '导出配置' } },
                { path: 'email', name: 'cac-email', component: () => import('@/modules/check/components/EmailConfigView.vue'), meta: { title: '邮件配置' } }
            ]
        },

        // ============ 资产管理 ============
        {
            path: 'acm',
            name: 'acm',
            component: () => import('@/modules/asset/views/AssetManagementModule.vue'),
            redirect: '/acm/overview',
            meta: { title: '资产管理' },
            children: [
                { path: 'overview', name: 'acm-overview', component: () => import('@/modules/asset/components/AssetOverview.vue'), meta: { title: '资产总览' } },
                { path: 'info', name: 'acm-info', component: () => import('@/modules/asset/components/AssetInfo.vue'), meta: { title: '资产列表' } },
                { path: 'data', name: 'acm-data', component: () => import('@/modules/asset/components/DataManagement.vue'), meta: { title: '数据管理' } },
                { path: 'model', name: 'acm-model', component: () => import('@/modules/asset/components/AssetModel.vue'), meta: { title: '资产模型' } },
                { path: 'exception', name: 'acm-exception', component: () => import('@/modules/asset/components/ExceptionDevice.vue'), meta: { title: '异常设备' } },
                { path: 'automation', name: 'acm-automation', component: () => import('@/modules/asset/components/AutomationConfig.vue'), meta: { title: '自动化配置' } },
                { path: 'permission', name: 'acm-permission', component: () => import('@/modules/asset/components/ResourcePermission.vue'), meta: { title: '资源权限' } },
                { path: 'log', name: 'acm-log', component: () => import('@/modules/asset/components/OperationLog.vue'), meta: { title: '操作日志' } }
            ]
        },

        // ============ 用户管理 ============
        {
            path: 'users',
            name: 'users',
            component: () => import('@/modules/user/views/UserManagementModule.vue'),
            redirect: '/users/overview',
            meta: { title: '用户管理' },
            children: [
                { path: 'overview', name: 'users-overview', component: () => import('@/modules/user/components/overview/OverviewView.vue'), meta: { title: '用户总览' } },
                { path: 'users', name: 'users-list', component: () => import('@/modules/user/components/user/UserManagement.vue'), meta: { title: '用户列表' } },
                { path: 'groups', name: 'users-groups', component: () => import('@/modules/user/components/groups/UserGroupsView.vue'), meta: { title: '用户组' } },
                { path: 'logs', name: 'users-logs', component: () => import('@/modules/user/components/logs/OperationLogsView.vue'), meta: { title: '操作日志' } },
                { path: 'config', name: 'users-config', component: () => import('@/modules/user/components/config/FeatureConfigView.vue'), meta: { title: '功能配置' } }
            ]
        },

        // ============ 流程管理 ============
        {
            path: 'flow',
            name: 'flow',
            component: () => import('@/modules/flow/views/FlowManagementModule.vue'),
            redirect: '/flow/list',
            meta: { title: '流程管理' },
            children: [
                { path: 'list', name: 'flow-list', component: () => import('@/modules/flow/components/FlowListView.vue'), meta: { title: '流程定义' } },
                { path: 'execution', name: 'flow-execution', component: () => import('@/modules/flow/components/ExecutionListView.vue'), meta: { title: '执行记录' } }
            ]
        },

        // ============ sudo权限 ============
        {
            path: 'sudo',
            name: 'sudo',
            component: () => import('@/modules/sudo/views/SudoManagementModule.vue'),
            redirect: '/sudo/permission',
            meta: { title: 'sudo权限' },
            children: [
                { path: 'permission', name: 'sudo-permission', component: () => import('@/modules/sudo/components/SudoPermissionList.vue'), meta: { title: 'sudo列表' } },
                { path: 'apply', name: 'sudo-apply', component: () => import('@/modules/sudo/components/SudoApplyList.vue'), meta: { title: '权限申请' } },
                { path: 'reset', name: 'sudo-reset', component: () => import('@/modules/sudo/components/SudoResetPassword.vue'), meta: { title: '重置密码' } },
                { path: 'settings', name: 'sudo-settings', component: () => import('@/modules/sudo/components/SudoSettings.vue'), meta: { title: '功能设置' } },
                { path: 'log', name: 'sudo-log', component: () => import('@/modules/sudo/components/SudoOperationLog.vue'), meta: { title: '操作日志' } }
            ]
        },

        // ============ 密码管理 ============
        {
            path: 'password',
            name: 'password',
            component: () => import('@/modules/password/views/PasswordManagementModule.vue'),
            redirect: '/password/application',
            meta: { title: '密码管理' },
            children: [
                { path: 'application', name: 'password-application', component: () => import('@/modules/password/components/ApplicationApprovalList.vue'), meta: { title: '申请审批' } },
                { path: 'settings', name: 'password-settings', component: () => import('@/modules/password/components/PasswordSettings.vue'), meta: { title: '参数配置' } },
                { path: 'logs', name: 'password-logs', component: () => import('@/modules/password/components/PasswordOperationLog.vue'), meta: { title: '操作日志' } }
            ]
        },

        // ============ 系统设置 ============
        {
            path: 'ssc',
            name: 'ssc',
            component: () => import('@/modules/settings/views/SystemSettingsModule.vue'),
            redirect: '/ssc/user',
            meta: { title: '系统设置' },
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
}

/**
 * 新布局独立路由（登录、错误页等不需要布局的页面）
 */
export const standaloneRoutes = [
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/Login.vue'),
        meta: {
            title: '登录 - OPSmind',
            requiresGuest: true
        }
    },
    {
        path: '/error/404',
        name: 'error-404',
        component: () => import('@/views/Error404.vue'),
        meta: { title: '未找到页面' }
    },
    // Redirect 路由（用于刷新页面）
    {
        path: '/redirect/:path(.*)',
        name: 'redirect',
        component: {
            beforeRouteEnter(to, from, next) {
                next(vm => {
                    vm.$router.replace('/' + to.params.path)
                })
            },
            render() {
                return null
            }
        }
    }
]

/**
 * 获取完整的新布局路由配置
 */
export function getOpsLayoutRoutes() {
    return [
        opsLayoutRoutes,
        ...standaloneRoutes,
        // 404 兜底路由
        {
            path: '/:pathMatch(.*)*',
            redirect: '/error/404'
        }
    ]
}
