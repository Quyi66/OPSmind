<template>
  <div class="host-overview">
    <div class="page-content">
      <HostOverviewTable
        @rescan="handleRescan"
        @view-host="handleViewHost"
        @view-installed="handleViewInstalled"
      />
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import HostOverviewTable from '../components/HostOverviewTable.vue'

const emit = defineEmits(['navigate'])

function handleRescan() {
  ElMessage.info('正在启动软件包扫描...')
}

function handleViewHost(hostKey) {
  emit('navigate', { view: 'hostDetail', hostKey })
}

function handleViewInstalled(hostKey) {
  emit('navigate', { view: 'installed', hostKey })
}
</script>

<style scoped lang="scss">
.host-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: var(--el-bg-color);
}

.page-content {
  flex: 1;
  overflow: hidden;
}
</style>
