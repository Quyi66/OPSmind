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

const currentModuleCode = computed(() => route.params.moduleCode || 'jao')
const menuGroups = computed(() => getGroupMenuConfig('automation', MENU_CONFIG))
const defaultOpeneds = ['jao', 'gfs', 'cmd', 'users', 'rpm-install']

provide('currentModuleCode', currentModuleCode)
</script>
