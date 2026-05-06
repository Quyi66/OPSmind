<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'
import { provideGroupPathNavigation } from './useGroupLayoutContext.js'

const menuGroups = computed(() => getGroupMenuConfig('system-inspection', MENU_CONFIG))
const defaultOpeneds = ['cac']

provideGroupPathNavigation('cac', {
  resolveNavigationTarget({ view, params }) {
    if (view === 'results' && params?.templateId) {
      return { path: '/cac/results', query: { templateId: params.templateId } }
    }

    if (view === 'structural-diagram' && params?.jobId) {
      return `/cac/structural-diagram/${params.jobId}`
    }

    if (view === 'result-detail' && params?.jobId) {
      return `/cac/results/${params.jobId}`
    }

    return null
  }
})
</script>
