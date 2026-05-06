<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'
import { provideCurrentGroupModuleCode } from './useGroupLayoutContext.js'

const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))
const defaultOpeneds = ['patches', 'windows-patches', 'software']

provideCurrentGroupModuleCode('patches')
</script>
