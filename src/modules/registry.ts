import type { AsyncComponentLoader } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'

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
  jao: () => import('@/modules/automation/views/JobOrchestrationModule.vue'),
  gfs: () => import('@/modules/automation/views/ScriptLibraryModule.vue'),
  cmd: () => import('@/modules/automation/views/CommandCenterModule.vue'),
  'rpm-install': () => import('@/modules/software/views/LocalInstall.vue'),
  patches: () => import('@/modules/patches/views/PatchManagementModule.vue'),
  software: () => import('@/modules/software/views/SoftwareIndex.vue'),
  cac: () => import('@/modules/inspection/views/InspectionIndex.vue'),
  acm: () => import('@/modules/asset/views/AssetIndex.vue'),
  users: () => import('@/modules/user/views/UserManagementModule.vue'),
  flow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  workflow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  sudo: () => import('@/modules/sudo/views/SudoManagementModule.vue'),
  password: () => import('@/modules/password/views/PasswordManagementModule.vue'),
  uam: () => import('@/modules/settings/views/SystemSettingsModule.vue'),
  ssc: () => import('@/modules/settings/views/SystemSettingsModule.vue')
  // 其余模块将逐步补充 Vue 实现
}

const moduleRegistry: Record<string, ModuleRegistryEntry> = {}

MENU_CONFIG.groups.forEach(group => {
  group.children.forEach(child => {
    const loader = moduleComponentLoaders[child.code]

    const entry: ModuleRegistryEntry = {
      code: child.code,
      name: child.name,
      title: child.name,
      groupCode: group.code,
      description: child.description,
      icon: child.icon,
      path: child.code,
      moduleType: 'vue-native',
      status: loader ? 'ready' : 'under-construction'
    }

    if (loader) {
      entry.loader = loader
    }

    moduleRegistry[child.code] = entry
  })
})

export const moduleRegistryEntries: ModuleRegistryEntry[] = Object.values(moduleRegistry)

export function getModuleDefinition(code: string): ModuleRegistryEntry | null {
  return moduleRegistry[code] || null
}

export function listModuleCodes(): string[] {
  return moduleRegistryEntries.map(entry => entry.code)
}

export { moduleRegistry }
