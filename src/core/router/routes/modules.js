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

  moduleRegistryEntries.forEach(entry => {
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
