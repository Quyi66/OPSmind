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
  patches: () => import('@/modules/patches/views/PatchManagementModule.vue'),
  software: () => import('@/modules/software/views/SoftwareIndex.vue'),
  cac: () => import('@/modules/inspection/views/InspectionIndex.vue'),
  acm: () => import('@/modules/asset/views/AssetIndex.vue'),
  users: () => import('@/modules/user/views/UserManagementModule.vue'),
  flow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  workflow: () => import('@/modules/flow/views/FlowManagementModule.vue'),
  sudo: () => import('@/modules/sudo/views/SudoManagementModule.vue'),
  password: () => import('@/modules/password/views/PasswordManagementModule.vue'),
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

// 手动添加 ssc（系统设置）模块，因为它不在 MENU_CONFIG 中
const sscLoader = moduleComponentLoaders['ssc']
if (sscLoader) {
  moduleRegistry['ssc'] = {
    code: 'ssc',
    name: '系统设置',
    title: '系统设置',
    groupCode: 'system',
    description: '系统设置中心',
    icon: 'fa-cog',
    path: 'ssc',
    loader: sscLoader,
    moduleType: 'vue-native',
    status: 'ready'
  }
}

export const moduleRegistryEntries: ModuleRegistryEntry[] = Object.values(moduleRegistry)

export function getModuleDefinition(code: string): ModuleRegistryEntry | null {
  return moduleRegistry[code] || null
}

export function listModuleCodes(): string[] {
  return moduleRegistryEntries.map(entry => entry.code)
}

export { moduleRegistry }
