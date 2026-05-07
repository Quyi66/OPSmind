/**
 * 软件管理模块 (SPM - Software Package Management)
 * 对应源系统 applet: spm
 */

export default {
  name: 'software',
  title: 'Yum仓库管理',
  icon: 'fa-cube',
  routes: [
    {
      path: '/software',
      name: 'Software',
      component: () => import('./views/SoftwareIndex.vue'),
      meta: { title: '软件概览', icon: 'fa-cube' },
      children: [
        {
          path: '',
          name: 'SoftwareHome',
          component: () => import('./views/SoftwareHomePage.vue'),
          meta: { title: '软件包概览' }
        },
        {
          path: 'hosts',
          name: 'SoftwareHosts',
          component: () => import('./views/HostOverviewPage.vue'),
          meta: { title: '主机概览' }
        },
        {
          path: 'hosts/:hostKey',
          name: 'SoftwareHostDetail',
          component: () => import('./views/HostDetailPage.vue'),
          meta: { title: '主机详情' }
        },
        {
          path: 'packages',
          name: 'AvailablePackages',
          component: () => import('./views/AvailablePackagesPage.vue'),
          meta: { title: '可用软件包' }
        },
        {
          path: 'installed',
          name: 'InstalledPackages',
          component: () => import('./views/InstalledPackagesPage.vue'),
          meta: { title: '已安装软件包' }
        },
        {
          path: 'repos',
          name: 'SoftwareRepos',
          component: () => import('./views/RepoManagementPage.vue'),
          meta: { title: '仓库管理' }
        },
        {
          path: 'local-install',
          name: 'LocalInstall',
          component: () => import('./views/LocalInstallPage.vue'),
          meta: { title: '本地安装' }
        },
        {
          path: 'yumManage',
          name: 'YumManage',
          component: () => import('@/modules/patches/views/LinuxYumManagePage.vue'),
          meta: { title: '软件源管理' }
        },
        {
          path: 'logs',
          name: 'SoftwareLogs',
          component: () => import('./views/LogReportPage.vue'),
          meta: { title: '操作日志' }
        }
      ]
    }
  ]
}
