import {
  AUTO_WORKBENCH_ROUTE_DEFS,
  JAO_ROUTE_DEFS,
  RUN_RECORDS_ROUTE_DEFS,
  GFS_ROUTE_DEFS,
  CMD_ROUTE_DEFS
} from './routes.js'

// 1. 工作台
export const autoWorkbenchModule = {
  code: 'auto-workbench',
  groupCode: 'automation',
  name: '工作台',
  icon: 'fas fa-th-large',
  description: '自动化待办与运行态总览',
  permissions: ['jao:view', 'gfs:view', 'cmd:view'],
  defaultRoute: '/auto-workbench/overview',
  routes: AUTO_WORKBENCH_ROUTE_DEFS
}

// 2. 运维工具箱
export const jaoModule = {
  code: 'jao',
  groupCode: 'automation',
  name: '运维工具箱',
  icon: 'fas fa-tasks',
  description: '自动化运维工具编排和调度管理',
  permissions: ['jao:view'],
  defaultRoute: '/jao/jobs',
  routes: JAO_ROUTE_DEFS,
  // 运维工具的侧边导航过滤掉审批相关和定时任务
  navItems: JAO_ROUTE_DEFS.filter(
    def => def.navLabel && def.menuCode !== 'review-center' && def.menuCode !== 'task-scheduler'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/jao/${def.path}`
  }))
}

// 3. 脚本中心
export const gfsModule = {
  code: 'gfs',
  groupCode: 'automation',
  name: '脚本中心',
  icon: 'fas fa-file-code',
  description: '脚本文件管理和版本控制',
  permissions: ['gfs:view'],
  defaultRoute: '/gfs/scriptLibrary',
  routes: GFS_ROUTE_DEFS,
  // 过滤掉审批相关项
  navItems: GFS_ROUTE_DEFS.filter(
    def => def.navLabel && def.menuCode !== 'review-center'
  ).map(def => ({
    key: def.key,
    label: def.navLabel || def.title,
    icon: def.icon,
    path: `/gfs/${def.path}`
  }))
}

// 4. 命令执行
const cmdSecondaryNavItems = CMD_ROUTE_DEFS.filter(
  def => def.navLabel && !['list', 'job'].includes(def.key) && def.menuCode !== 'review-center'
).map(def => ({
  key: def.key,
  label: def.navLabel || def.title,
  icon: def.icon,
  path: `/cmd/${def.path}`
}))

export const cmdModule = {
  code: 'cmd',
  groupCode: 'automation',
  name: '命令执行',
  icon: 'fas fa-terminal',
  description: '系统命令管理和执行',
  permissions: ['cmd:view'],
  defaultRoute: '/cmd/list',
  routes: CMD_ROUTE_DEFS,
  navItems: [
    {
      key: 'workspace',
      label: '命令与运维工具',
      icon: 'fas fa-layer-group',
      path: '/cmd/list'
    },
    ...cmdSecondaryNavItems
  ]
}

// 5. 运行记录
export const runRecordsModule = {
  code: 'run-records',
  groupCode: 'automation',
  name: '运行记录',
  icon: 'fas fa-history',
  description: '统一查看自动化任务运行记录和统计',
  permissions: ['jao:view', 'gfs:view', 'cmd:view'],
  defaultRoute: '/run-records/logs',
  routes: RUN_RECORDS_ROUTE_DEFS
}

// 6. 定时任务 (虚拟)
export const taskSchedulerModule = {
  code: 'task-scheduler',
  groupCode: 'automation',
  name: '定时任务',
  icon: 'fas fa-clock',
  description: '自动化定时任务调度管理',
  permissions: ['jao:view'],
  defaultRoute: '/jao/taskScheduler',
  isVirtual: true,
  // 定时任务侧边导航项，映射到 /jao/taskScheduler
  navItems: (() => {
    const def = JAO_ROUTE_DEFS.find(item => item.key === 'taskScheduler')
    if (!def) return []
    return [{
      key: def.key,
      label: def.navLabel || def.title,
      icon: def.icon,
      path: `/jao/${def.path}`,
      accessCode: 'jao'
    }]
  })()
}

// 7. 审批中心 (虚拟)
export const reviewCenterModule = {
  code: 'review-center',
  groupCode: 'automation',
  name: '审批中心',
  icon: 'fas fa-stamp',
  description: '运维工具审批、命令审核与脚本审核的统一入口',
  permissions: ['jao:view', 'gfs:view', 'cmd:view'],
  defaultRoute: '/jao/approvals',
  isVirtual: true,
  navItems: [
    {
      key: 'approvals',
      label: '运维工具审批',
      icon: 'fas fa-user-check',
      path: '/jao/approvals',
      accessCode: 'jao'
    },
    {
      key: 'review',
      label: '命令审核',
      icon: 'fas fa-clipboard-check',
      path: '/cmd/review',
      accessCode: 'cmd'
    },
    {
      key: 'scriptReview',
      label: '脚本审核',
      icon: 'fas fa-file-signature',
      path: '/gfs/scriptReview',
      accessCode: 'gfs'
    }
  ]
}
