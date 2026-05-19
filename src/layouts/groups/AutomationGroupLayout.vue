<template>
  <GroupLayoutShell
    :menu-groups="menuGroups"
    :default-openeds="defaultOpeneds"
    :badge-counts="badgeCounts"
    page-scroll
  >
    <template #content-top>
      <AutomationWorkflowHeader />
    </template>
  </GroupLayoutShell>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { MENU_CONFIG } from '@/config/menu.config.js'
import { getGroupMenuConfig } from '@/config/module-nav.config.js'
import GroupLayoutShell from './GroupLayoutShell.vue'
import AutomationWorkflowHeader from '@/modules/automation/components/shared/AutomationWorkflowHeader.vue'
import { provideCurrentGroupModuleCode } from './useGroupLayoutContext.js'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'

const menuGroups = computed(() => getGroupMenuConfig('automation', MENU_CONFIG))
const defaultOpeneds = ['jao', 'gfs', 'cmd', 'run-records', 'review-center', 'users', 'rpm-install']

provideCurrentGroupModuleCode('jao')

const reviewStore = useReviewCountStore()

const badgeCounts = computed(() => ({
  'review-center::approvals': reviewStore.approvalCount,
  'review-center::review': reviewStore.commandCount,
  'review-center::scriptReview': reviewStore.scriptCount
}))

onMounted(() => {
  reviewStore.fetchAll()
})
</script>
