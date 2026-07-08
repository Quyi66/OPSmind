import type { AsyncComponentLoader } from 'vue'

import {
  patchesModule,
  windowsPatchesModule,
  patchLogsModule,
  patchProcessLogsModule,
  middlewareCveModule
} from './patches'
import { yumRepoModule } from './yum-repo'
import {
  autoWorkbenchModule,
  jaoModule,
  gfsModule,
  cmdModule,
  runRecordsModule,
  taskSchedulerModule,
  reviewCenterModule
} from './automation'
import { cacModule } from './inspection'
import { acmModule } from './asset'
import { usersModule } from './user'
import { flowModule } from './flow'
import { sudoModule } from './sudo'
import { passwordModule } from './password'
import { sscModule, uamModule } from './settings'

export interface ModuleDefinition {
  code: string
  groupCode: string
  name: string
  icon: string
  description?: string
  permissions?: string[]
  defaultRoute: string
  routePermission?: string
  isVirtual?: boolean
  routes?: any[]
  menuCodeOverride?: string
  navItems?: any[]
}

// 统一注册的模块列表（定义一级菜单分组中子菜单的整体集合）
export const registeredModules: ModuleDefinition[] = [
  acmModule,
  autoWorkbenchModule,
  jaoModule,
  gfsModule,
  cmdModule,
  taskSchedulerModule,
  runRecordsModule,
  reviewCenterModule,
  flowModule,
  patchesModule,
  windowsPatchesModule,
  patchLogsModule,
  patchProcessLogsModule,
  middlewareCveModule,
  yumRepoModule,
  cacModule,
  usersModule,
  sudoModule,
  passwordModule,
  uamModule,
  sscModule
]

const moduleLookup = Object.fromEntries(registeredModules.map(m => [m.code, m]))

export function getModuleDefinition(code: string): ModuleDefinition | null {
  return moduleLookup[code] || null
}

// ================== 以下为向下兼容的旧接口 ==================

export interface ModuleRegistryEntry {
  code: string
  name: string
  title: string
  groupCode: string
  description?: string
  icon?: string
  path: string
  loader?: AsyncComponentLoader
  moduleType?: string
  status: 'under-construction' | 'ready'
}

const moduleComponentLoaders: Partial<Record<string, AsyncComponentLoader>> = {
  'auto-workbench': () => import('@/modules/automation/views/AutomationWorkbenchPage.vue'),
  jao: () => import('@/modules/automation/views/JobOrchestrationModule.vue'),
  gfs: () => import('@/modules/automation/views/ScriptLibraryModule.vue'),
  cmd: () => import('@/modules/automation/views/CommandCenterModule.vue'),
  patches: () => import('@/modules/patches/views/PatchManagementModule.vue'),
  'yum-repo': () => import('@/modules/yum-repo/views/YumRepoIndex.vue'),
  software: () => import('@/modules/yum-repo/views/YumRepoIndex.vue'),
  cac: () => import('@/modules/inspection/views/InspectionIndex.vue'),
  acm: () => import('@/modules/asset/views/AssetIndex.vue'),
  users: () => import('@/modules/user/views/UserManagementModule.vue'),
  flow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  workflow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  sudo: () => import('@/modules/sudo/views/SudoManagementModule.vue'),
  password: () => import('@/modules/password/views/PasswordManagementModule.vue'),
  uam: () => import('@/modules/settings/views/SystemSettingsModule.vue'),
  ssc: () => import('@/modules/settings/views/SystemSettingsModule.vue')
}

const legacyRegistry: Record<string, ModuleRegistryEntry> = {}

registeredModules.forEach(m => {
  const loader = moduleComponentLoaders[m.code]
  legacyRegistry[m.code] = {
    code: m.code,
    name: m.name,
    title: m.name,
    groupCode: m.groupCode,
    description: m.description,
    icon: m.icon,
    path: m.code,
    moduleType: 'vue-native',
    status: loader ? 'ready' : 'under-construction',
    ...(loader && { loader })
  }
})

export const moduleRegistryEntries: ModuleRegistryEntry[] = Object.values(legacyRegistry)
export const moduleRegistry = legacyRegistry
export function listModuleCodes(): string[] {
  return registeredModules.map(m => m.code)
}
