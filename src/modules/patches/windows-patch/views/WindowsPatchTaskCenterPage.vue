<template>
  <div class="ops-page-layout win-patch-page">
    <WinPatchInstallHistoryPanel />
  </div>
</template>

<script setup>
import WinPatchInstallHistoryPanel from '../components/tasks/WinPatchInstallHistoryPanel.vue'
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}
</style>
