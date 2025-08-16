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
