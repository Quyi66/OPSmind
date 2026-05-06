<template>
  <GroupLayoutShell :menu-groups="menuGroups" :default-openeds="defaultOpeneds" />
</template>

<script setup>
import { computed, provide } from 'vue'
import { useRouter } from 'vue-router'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'

const router = useRouter()

const menuGroups = computed(() => getGroupMenuConfig('system-inspection', MENU_CONFIG))
const defaultOpeneds = ['cac']

function handleNavigate(payload) {
  const { view, params } = payload

  if (view === 'results' && params?.templateId) {
    router.push({ path: '/cac/results', query: { templateId: params.templateId } })
  } else if (view === 'structural-diagram' && params?.jobId) {
    router.push(`/cac/structural-diagram/${params.jobId}`)
  } else if (view === 'result-detail' && params?.jobId) {
    router.push(`/cac/results/${params.jobId}`)
  }
}

provide('handleNavigate', handleNavigate)
</script>
