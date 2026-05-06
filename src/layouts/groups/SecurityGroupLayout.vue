<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'

const router = useRouter()
const route = useRoute()

const currentModuleCode = computed(() => route.params.moduleCode || 'sudo')
const menuGroups = computed(() => getGroupMenuConfig('security-management', MENU_CONFIG))
const defaultOpeneds = ['sudo', 'password']

function handleNavigate({ view, moduleCode, params = {} }) {
  const targetModule = moduleCode || currentModuleCode.value
  if (view) {
    router.push({
      path: `/${targetModule}/${view}`,
      query: params
    })
  }
}

provide('handleNavigate', handleNavigate)
provide('currentModuleCode', currentModuleCode)
</script>
