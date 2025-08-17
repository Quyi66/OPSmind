/**
 * 模块路由配置
 * 支持 Vue 原生模块和 Angular iframe 模块
 */

export const moduleRoutes = [
  // CAC 配置管理模块
  {
    path: '/cac',
    name: 'cac-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'CAC 配置管理',
      requiresAuth: true,
      moduleCode: 'cac',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/cac/:pathMatch(.*)*',
    name: 'cac-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'CAC 配置管理',
      requiresAuth: true,
      moduleCode: 'cac',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // JAO 作业编排模块
  {
    path: '/jao',
    name: 'jao-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'JAO 作业编排',
      requiresAuth: true,
      moduleCode: 'jao',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/jao/:pathMatch(.*)*',
    name: 'jao-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'JAO 作业编排',
      requiresAuth: true,
      moduleCode: 'jao',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // GFS 脚本管理模块
  {
    path: '/gfs',
    name: 'gfs-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'GFS 脚本管理',
      requiresAuth: true,
      moduleCode: 'gfs',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/gfs/:pathMatch(.*)*',
    name: 'gfs-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'GFS 脚本管理',
      requiresAuth: true,
      moduleCode: 'gfs',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // DTS 数据传输模块
  {
    path: '/dts',
    name: 'dts-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'DTS 数据传输',
      requiresAuth: true,
      moduleCode: 'dts',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/dts/:pathMatch(.*)*',
    name: 'dts-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'DTS 数据传输',
      requiresAuth: true,
      moduleCode: 'dts',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // UDP 统一开发平台模块
  {
    path: '/udp',
    name: 'udp-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'UDP 统一开发平台',
      requiresAuth: true,
      moduleCode: 'udp',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/udp/:pathMatch(.*)*',
    name: 'udp-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'UDP 统一开发平台',
      requiresAuth: true,
      moduleCode: 'udp',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // CMD 命令管理模块
  {
    path: '/cmd',
    name: 'cmd-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '命令管理',
      requiresAuth: true,
      moduleCode: 'cmd',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/cmd/:pathMatch(.*)*',
    name: 'cmd-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '命令管理',
      requiresAuth: true,
      moduleCode: 'cmd',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // ACM 资产管理模块
  {
    path: '/acm',
    name: 'acm-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '资产管理',
      requiresAuth: true,
      moduleCode: 'acm',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/acm/:pathMatch(.*)*',
    name: 'acm-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '资产管理',
      requiresAuth: true,
      moduleCode: 'acm',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 新增模块路由 - 密码管理
  {
    path: '/password',
    name: 'password-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '密码管理',
      requiresAuth: true,
      moduleCode: 'password',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/password/:pathMatch(.*)*',
    name: 'password-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '密码管理',
      requiresAuth: true,
      moduleCode: 'password',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // sudo权限管理
  {
    path: '/sudo',
    name: 'sudo-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'sudo权限管理',
      requiresAuth: true,
      moduleCode: 'sudo',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/sudo/:pathMatch(.*)*',
    name: 'sudo-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: 'sudo权限管理',
      requiresAuth: true,
      moduleCode: 'sudo',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 补丁管理
  {
    path: '/patches',
    name: 'patches-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '补丁管理',
      requiresAuth: true,
      moduleCode: 'patches',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/patches/:pathMatch(.*)*',
    name: 'patches-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '补丁管理',
      requiresAuth: true,
      moduleCode: 'patches',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 软件管理
  {
    path: '/software',
    name: 'software-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '软件管理',
      requiresAuth: true,
      moduleCode: 'software',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/software/:pathMatch(.*)*',
    name: 'software-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '软件管理',
      requiresAuth: true,
      moduleCode: 'software',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 流程管理
  {
    path: '/workflow',
    name: 'workflow-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '流程管理',
      requiresAuth: true,
      moduleCode: 'workflow',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/workflow/:pathMatch(.*)*',
    name: 'workflow-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '流程管理',
      requiresAuth: true,
      moduleCode: 'workflow',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 用户管理
  {
    path: '/users',
    name: 'users-main',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '用户管理',
      requiresAuth: true,
      moduleCode: 'users',
      moduleType: 'angular-iframe'
    }
  },
  {
    path: '/users/:pathMatch(.*)*',
    name: 'users-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '用户管理',
      requiresAuth: true,
      moduleCode: 'users',
      moduleType: 'angular-iframe',
      isSubRoute: true
    }
  },

  // 通用模块路由 (用于动态模块)
  {
    path: '/modules/:moduleCode',
    name: 'dynamic-module',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '模块',
      requiresAuth: true,
      isDynamic: true
    },
    beforeEnter: (to, from, next) => {
      // 动态设置模块信息
      const moduleCode = to.params.moduleCode
      to.meta.moduleCode = moduleCode
      to.meta.title = `${moduleCode.toUpperCase()} 模块`
      next()
    }
  },
  {
    path: '/modules/:moduleCode/:pathMatch(.*)*',
    name: 'dynamic-module-sub',
    component: () => import('@/views/AngularModuleView.vue'),
    meta: {
      title: '模块',
      requiresAuth: true,
      isDynamic: true,
      isSubRoute: true
    },
    beforeEnter: (to, from, next) => {
      // 动态设置模块信息
      const moduleCode = to.params.moduleCode
      to.meta.moduleCode = moduleCode
      to.meta.title = `${moduleCode.toUpperCase()} 模块`
      next()
    }
  }
]
