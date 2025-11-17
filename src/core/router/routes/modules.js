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

  return routes
}

export const moduleRoutes = buildModuleRoutes()
