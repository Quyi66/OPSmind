<template>
  <div class="available-packages">
    <div class="page-content">
      <AvailablePackagesTable />
    </div>
  </div>
</template>

<script setup>
import AvailablePackagesTable from '../components/AvailablePackagesTable.vue'
</script>

<style scoped lang="scss">
.available-packages {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: #fff;
}

.page-content {
  flex: 1;
  overflow: hidden;
}
</style>
