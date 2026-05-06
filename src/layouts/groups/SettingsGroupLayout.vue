<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'

const defaultOpeneds = ['ssc']
const menuGroups = computed(() => getGroupMenuConfig('system-settings', MENU_CONFIG))
</script>
