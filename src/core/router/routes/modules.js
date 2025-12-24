import { moduleRegistryEntries } from '@/modules/registry'
import { GROUP_ALIAS_MAP } from '@/config/menu.config.js'

const ModuleLayout = () => import('@/layouts/MainLayout.vue')
const ModuleHost = () => import('@/views/modules/ModuleRouterView.vue')

function createModuleRoute(entry, path, nameSuffix, extraMeta = {}) {
  const baseMeta = {
    title: entry.title,
    requiresAuth: true,
    moduleCode: entry.code,
    moduleType: entry.moduleType || 'vue-native',
    groupCode: entry.groupCode,
    moduleStatus: entry.status,
    ...extraMeta
  }

  return {
    path,
    name: `${entry.code}-${nameSuffix}`,
    component: ModuleLayout,
    meta: { ...baseMeta },
    children: [
      {
        path: '',
        name: `${entry.code}-${nameSuffix}-index`,
        component: ModuleHost,
        meta: {
          ...baseMeta,
          moduleTitle: entry.title
        }
      },
      {
        path: ':pathMatch(.*)*',
        name: `${entry.code}-${nameSuffix}-legacy`,
        component: ModuleHost,
        meta: {
          ...baseMeta,
          moduleTitle: entry.title,
          legacyPath: true
        }
      }
    ]
  }
}

export function buildModuleRoutes() {
  const routes = []

  // 这些模块已在 base.js 中使用子路由方式定义，需要从动态生成中排除
  const skipModules = ['sudo', 'jao', 'cmd', 'gfs', 'patches', 'cac', 'acm', 'ssc', 'users', 'flow', 'password']

  moduleRegistryEntries.forEach(entry => {
    // 跳过已在 baseRoutes 中定义的模块
    if (skipModules.includes(entry.code)) {
      return
    }

    routes.push(createModuleRoute(entry, `/${entry.path}`, 'main'))

    const alias = GROUP_ALIAS_MAP?.[entry.groupCode]
    if (alias && alias !== entry.path) {
      routes.push(
        createModuleRoute(entry, `/${alias}/${entry.path}`, `${alias}-alias`, {
          groupAlias: alias
        })
      )
    }
  })

  // 手动添加 ssc（系统设置）路由，因为它不在 MENU_CONFIG 中
  const sscEntry = {
    code: 'ssc',
    name: '系统设置',
    title: '系统设置',
    groupCode: 'system',
    path: 'ssc',
    moduleType: 'vue-native',
    status: 'ready'
  }
  routes.push(createModuleRoute(sscEntry, '/ssc', 'main', { showModuleToolbar: true }))

  return routes
}

export const moduleRoutes = buildModuleRoutes()
