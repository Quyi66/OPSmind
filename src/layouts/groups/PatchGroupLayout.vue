<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'

const route = useRoute()

const currentModuleCode = computed(() => route.params.moduleCode || 'patches')
const menuGroups = computed(() => getGroupMenuConfig('patch-testing', MENU_CONFIG))
const defaultOpeneds = ['patches', 'windows-patches', 'software']

provide('currentModuleCode', currentModuleCode)
</script>
