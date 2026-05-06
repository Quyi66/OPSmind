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

const menuGroups = computed(() => getGroupMenuConfig('asset-management', MENU_CONFIG))
const defaultOpeneds = ['acm']

function handleEditModel(modelId) {
  router.push({
    path: '/acm/model',
    query: { editor: 'model', modelId }
  })
}

function handleViewAssetType(assetTypeCode) {
  router.push({
    path: '/acm/info',
    query: { type: assetTypeCode }
  })
}

provide('handleEditModel', handleEditModel)
provide('handleViewAssetType', handleViewAssetType)
</script>
