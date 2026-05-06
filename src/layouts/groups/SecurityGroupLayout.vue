<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'
import { provideGroupPathNavigation } from './useGroupLayoutContext.js'

const menuGroups = computed(() => getGroupMenuConfig('security-management', MENU_CONFIG))
const defaultOpeneds = ['sudo', 'password']

provideGroupPathNavigation('sudo')
</script>
