/**
 * 模块路由配置
 *
 * 注意：大部分模块路由已迁移到 base.js 中，按一级菜单分组组织
 * 此文件仅处理需要动态生成的模块路由（如软件管理等非核心模块）
 */

import { moduleRegistryEntries, getModuleDefinition } from '@/modules/registry'
import { GROUP_ALIAS_MAP } from '@/config/menu.config.js'
import MainLayout from '@/layouts/MainLayout.vue'
import { BASE_REGISTERED_MODULES } from './base.js'

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
    component: MainLayout,
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
    const def = getModuleDefinition(entry.code)
    // 跳过已在 baseRoutes 中定义或属于虚拟菜单项的模块
    if (BASE_REGISTERED_MODULES.has(entry.code) || def?.isVirtual) {
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

  return routes
}

export const moduleRoutes = buildModuleRoutes()
