<template>
  <div class="install-content win-patch-summary-step">
    <div class="install-card">
      <div class="card-header">
        <i class="fa fa-desktop" />
        {{ t('execution.ui.targetHost') }}
      </div>
      <div class="card-body card-body--scroll">
        <div v-if="hostItems.length === 0" class="selection-item">
          <div class="selection-item__primary">{{ t('patches.linux.noHosts') }}</div>
        </div>
        <div
          v-for="item in hostItems"
          :key="`${item.hostId}-${item.hostKey}`"
          class="selection-item"
        >
          <div class="selection-item__primary">{{ item.hostKey || '-' }}</div>
          <div class="selection-item__secondary">{{ t('patches.windows.hostIdLabel') }}{{ item.hostId || '-' }}</div>
        </div>
        <div class="selection-item">
          <div class="selection-item__primary">{{ t('patches.windows.patchesToRollback') }} {{ rollbackItems.length }} {{ t('patches.windows.itemUnit') }}</div>
        </div>
      </div>
    </div>

    <div class="install-card">
      <div class="card-header">
        <i class="fa fa-list" />
        {{ t('patches.windows.patchesToRollback') }}
      </div>
      <div class="card-body">
        <div class="ops-table-wrapper win-patch-summary-step__table">
          <el-table :data="rollbackItems" max-height="320">
            <el-table-column :label="t('execution.ui.host')" width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.hostKey || '-' }}
              </template>
            </el-table-column>
            <el-table-column :label="t('patches.windows.kbId')" width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.kbNumber || '-' }}
              </template>
            </el-table-column>
            <el-table-column :label="t('automation.command.updatedAt')" width="190">
              <template #default="{ row }">
                {{ formatDateTime(row.updateTime) }}
              </template>
            </el-table-column>
            <el-table-column label="Run ID" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.runId || '-' }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/core/i18n'
import { computed } from 'vue'
import { formatDateTime } from '../../utils'

const props = defineProps({
  hostItems: {
    type: Array,
    default: () => []
  },
  selectedRows: {
    type: Array,
    default: () => []
  }
})

const rollbackItems = computed(() => (Array.isArray(props.selectedRows) ? props.selectedRows : []))
</script>

<style scoped lang="scss">
.win-patch-summary-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.install-card {
  margin-bottom: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
}

.install-card .card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--el-fill-color-light);
  padding: 8px 12px;
  font-weight: 500;
  font-size: 13px;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.install-card .card-body {
  padding: 10px 12px;
  background: var(--el-bg-color);
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.card-body--scroll {
  max-height: 220px;
  overflow-y: auto;
}

.selection-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.selection-item:last-child {
  border-bottom: none;
}

.selection-item__primary {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.selection-item__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}

.win-patch-summary-step__table {
  margin-top: 0;
}
</style>
