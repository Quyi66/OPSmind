<template>
  <div class="ops-page-layout rpm-package-list-page">
    <el-tabs v-model="activeTab" class="ops-tabs">
      <el-tab-pane label="软件包信息" name="package-info">
        <RpmPackageInfoQueryPanel />
      </el-tab-pane>
      <el-tab-pane label="机器包清单" name="machine-packages" lazy>
        <LinuxMachinePackageListPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LinuxMachinePackageListPanel from '../components/rpm/LinuxMachinePackageListPanel.vue'
import RpmPackageInfoQueryPanel from '../components/rpm/RpmPackageInfoQueryPanel.vue'

const activeTab = ref('package-info')
</script>

<style scoped lang="scss">
.rpm-package-list-page :deep(.el-tabs__content) {
  overflow: visible;
}
</style>
