/**
 * Angular 模块配置
 * 统一管理所有Angular模块的路由和配置信息
 */

export const ANGULAR_MODULES_CONFIG = {
  // CAC - 配置审计与合规性检查
  cac: {
    code: 'cac',
    name: 'CAC 配置管理',
    title: '配置审计与合规性检查',
    icon: 'fa-cogs',
    color: '#28a745',
    description: '系统配置审计、合规性检查和配置管理',
    angularModule: 'oplus.cac',
    // 入口URL - 会自动跳转到具体页面
    entryUrl: '/cac',
    // 可用的子路由
    routes: {
      main: '/cac', // 主入口，会自动跳转
      dashboard: '/cac/template/square', // 仪表盘
      template: '/cac/template', // 模板管理
      rules: '/cac/rules', // 规则管理
      hosts: '/cac/hosts', // 主机管理
      jobs: '/cac/jobs', // 作业管理
      results: '/cac/results', // 结果查看
      script: '/cac/script' // 脚本管理
    },
    defaultRoute: '/cac',
    features: ['配置检查', '合规审计', '模板管理', '主机管理', '脚本管理']
  },

  // JAO - 作业编排
  jao: {
    code: 'jao',
    name: 'JAO 作业编排',
    title: '自动化作业编排与调度',
    icon: 'fa-tasks',
    color: '#007bff',
    description: '自动化作业编排、调度和执行管理',
    angularModule: 'oplus.jao',
    entryUrl: '/jao',
    routes: {
      main: '/jao',
      jobs: '/jao/jobs',
      commands: '/jao/commands',
      flows: '/jao/flows',
      schedules: '/jao/schedules',
      history: '/jao/history'
    },
    defaultRoute: '/jao',
    features: ['作业编排', '任务调度', '流程管理', '命令执行']
  },

  // DTS - 数据传输服务
  dts: {
    code: 'dts',
    name: 'DTS 数据传输',
    title: '数据传输与同步服务',
    icon: 'fa-exchange-alt',
    color: '#6f42c1',
    description: '数据传输、同步和转换服务',
    angularModule: 'oplus.dts',
    entryUrl: '/dts',
    routes: {
      main: '/dts',
      datasources: '/dts/datasources',
      datasets: '/dts/datasets',
      transfers: '/dts/transfers',
      monitoring: '/dts/monitoring'
    },
    defaultRoute: '/dts',
    features: ['数据传输', '数据同步', '数据转换', '数据源管理']
  },

  // UDP - 统一开发平台
  udp: {
    code: 'udp',
    name: 'UDP 统一开发平台',
    title: '统一开发与部署平台',
    icon: 'fa-code',
    color: '#fd7e14',
    description: '统一的应用开发、部署和管理平台',
    angularModule: 'oplus.udp',
    entryUrl: '/udp',
    routes: {
      main: '/udp',
      pages: '/udp/pages',
      widgets: '/udp/widgets',
      themes: '/udp/themes',
      apps: '/udp/apps'
    },
    defaultRoute: '/udp',
    features: ['页面设计', '组件开发', '主题管理', '应用部署']
  },

  // GFS - 脚本文件管理
  gfs: {
    code: 'gfs',
    name: 'GFS 脚本管理',
    title: '脚本文件管理系统',
    icon: 'fa-file-code',
    color: '#20c997',
    description: '脚本文件管理、版本控制和执行',
    angularModule: 'oplus.gfs',
    entryUrl: '/gfs',
    routes: {
      main: '/gfs',
      scripts: '/gfs/scripts',
      versions: '/gfs/versions',
      executions: '/gfs/executions',
      repository: '/gfs/repo'
    },
    defaultRoute: '/gfs',
    features: ['脚本管理', '版本控制', '脚本执行', '文件管理']
  },

  // ACM - 资产配置管理
  acm: {
    code: 'acm',
    name: 'ACM 资产配置管理',
    title: 'IT资产配置管理',
    icon: 'fa-server',
    color: '#6c757d',
    description: 'IT资产配置管理和监控',
    angularModule: 'oplus.acm',
    entryUrl: '/acm',
    routes: {
      main: '/acm',
      assets: '/acm/assets',
      configs: '/acm/configs',
      monitoring: '/acm/monitoring',
      discovery: '/acm/discovery'
    },
    defaultRoute: '/acm',
    features: ['资产管理', '配置管理', '监控告警', '资产发现']
  },

  // ADM - 系统管理
  adm: {
    code: 'adm',
    name: 'ADM 系统管理',
    title: '系统管理与配置',
    icon: 'fa-cog',
    color: '#dc3545',
    description: '系统管理、配置和维护',
    angularModule: 'oplus.adm',
    entryUrl: '/adm',
    routes: {
      main: '/adm',
      config: '/adm/config',
      users: '/adm/users',
      logs: '/adm/logs',
      settings: '/adm/settings'
    },
    defaultRoute: '/adm',
    features: ['系统配置', '用户管理', '日志管理', '系统维护']
  },

  // APP - 应用管理
  app: {
    code: 'app',
    name: 'APP 应用管理',
    title: '应用程序管理',
    icon: 'fa-cube',
    color: '#17a2b8',
    description: '应用程序管理和配置',
    angularModule: 'oplus.app',
    entryUrl: '/applets',
    routes: {
      main: '/applets',
      list: '/applets/list',
      config: '/applets/config',
      deploy: '/applets/deploy'
    },
    defaultRoute: '/applets',
    features: ['应用管理', '应用配置', '应用部署', '应用监控']
  },

  // SEARCH - 搜索中心
  search: {
    code: 'search',
    name: 'SEARCH 搜索中心',
    title: '系统搜索中心',
    icon: 'fa-search',
    color: '#343a40',
    description: '全局搜索和数据检索',
    angularModule: 'oplus.search',
    entryUrl: '/search',
    routes: {
      main: '/search',
      advanced: '/search/advanced',
      history: '/search/history'
    },
    defaultRoute: '/search',
    features: ['全局搜索', '数据检索', '搜索分析', '搜索配置']
  },

  // DEV - 开发工具
  dev: {
    code: 'dev',
    name: 'DEV 开发工具',
    title: '开发工具与调试',
    icon: 'fa-wrench',
    color: '#ffc107',
    description: '开发工具、调试和测试',
    angularModule: 'oplus.dev',
    entryUrl: '/dev',
    routes: {
      main: '/dev',
      translator: '/translator',
      components: '/dev/components',
      debug: '/dev/debug'
    },
    defaultRoute: '/dev',
    features: ['开发调试', '组件测试', '翻译工具', '系统诊断']
  }
}

/**
 * 模块分类配置
 */
export const MODULE_CATEGORIES = {
  management: {
    name: '管理类',
    modules: ['cac', 'acm', 'adm'],
    icon: 'fa-cogs',
    color: '#28a745'
  },
  automation: {
    name: '自动化类',
    modules: ['jao', 'gfs'],
    icon: 'fa-robot',
    color: '#007bff'
  },
  development: {
    name: '开发类',
    modules: ['udp', 'dev'],
    icon: 'fa-code',
    color: '#fd7e14'
  },
  data: {
    name: '数据类',
    modules: ['dts'],
    icon: 'fa-database',
    color: '#6f42c1'
  },
  system: {
    name: '系统类',
    modules: ['app', 'search'],
    icon: 'fa-cube',
    color: '#17a2b8'
  }
}

/**
 * URL路径配置
 */
export const URL_CONFIG = {
  // 开发环境配置
  development: {
    baseUrl: 'http://localhost:3000',
    pathPrefix: '/oplus/base/#'
  },
  // 生产环境配置
  production: {
    baseUrl: '',
    pathPrefix: '/oplus/base/#'
  }
}

/**
 * 获取模块的完整URL
 * @param {string} moduleCode 模块代码
 * @param {string} route 路由路径（可选）
 * @param {boolean} isDev 是否开发环境
 * @returns {string} 完整的URL
 */
export function getModuleUrl(moduleCode, route = null, isDev = false) {
  const moduleConfig = ANGULAR_MODULES_CONFIG[moduleCode]
  if (!moduleConfig) {
    throw new Error(`Module ${moduleCode} not found`)
  }

  const urlConfig = isDev ? URL_CONFIG.development : URL_CONFIG.production
  const targetRoute = route || moduleConfig.entryUrl

  // 构建基础URL - 开发环境直接访问Angular服务器
  const baseUrl = isDev ? urlConfig.baseUrl : window.location.origin

  // 构建完整URL
  const url = `${baseUrl}${urlConfig.pathPrefix}${targetRoute}`

  // 添加Vue认证标识和时间戳
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}vue_auth=true&module=${moduleCode}&t=${Date.now()}`
}

/**
 * 获取模块配置
 * @param {string} moduleCode 模块代码
 * @returns {object|null} 模块配置
 */
export function getModuleConfig(moduleCode) {
  return ANGULAR_MODULES_CONFIG[moduleCode] || null
}

/**
 * 获取所有模块列表
 * @returns {array} 模块列表
 */
export function getAllModules() {
  return Object.values(ANGULAR_MODULES_CONFIG)
}

/**
 * 根据分类获取模块
 * @returns {object} 分类模块映射
 */
export function getModulesByCategory() {
  const result = {}
  for (const [categoryKey, category] of Object.entries(MODULE_CATEGORIES)) {
    result[categoryKey] = {
      ...category,
      modules: category.modules.map(code => ANGULAR_MODULES_CONFIG[code]).filter(Boolean)
    }
  }
  return result
}

/**
 * 搜索模块
 * @param {string} keyword 搜索关键词
 * @returns {array} 匹配的模块列表
 */
export function searchModules(keyword) {
  if (!keyword) return getAllModules()

  const lowerKeyword = keyword.toLowerCase()
  return getAllModules().filter(
    module =>
      module.name.toLowerCase().includes(lowerKeyword) ||
      module.title.toLowerCase().includes(lowerKeyword) ||
      module.description.toLowerCase().includes(lowerKeyword) ||
      module.features.some(feature => feature.toLowerCase().includes(lowerKeyword))
  )
}
