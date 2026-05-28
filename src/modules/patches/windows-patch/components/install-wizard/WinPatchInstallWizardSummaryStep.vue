<template>
  <div class="install-content win-patch-summary-step">
    <div class="install-card">
      <div class="card-header">
        <i class="fa fa-desktop" />
        目标主机
      </div>
      <div class="card-body card-body--scroll">
        <div class="selection-item">
          <div class="selection-item__primary">{{ resolveHostKey(hostSummary) }}</div>
          <div class="selection-item__secondary">
            主机 ID：{{ resolveHostId(hostSummary) || '-' }}
          </div>
        </div>
        <div class="selection-item">
          <div class="selection-item__primary">
            {{ pickValue(hostSummary, ['osDistro', 'os_distro'], '-') }}
          </div>
          <div class="selection-item__secondary">
            版本 / 架构：{{ pickValue(hostSummary, ['osVersion', 'os_version'], '-') }} /
            {{ pickValue(hostSummary, ['osArch', 'os_arch'], '-') }}
          </div>
        </div>
        <div class="selection-item">
          <div class="selection-item__primary">待安装补丁 {{ patchItems.length }} 条</div>
        </div>
      </div>
    </div>

    <div class="install-card">
      <div class="card-header">
        <i class="fa fa-list" />
        待安装补丁
      </div>
      <div class="card-body">
        <div class="ops-table-wrapper win-patch-summary-step__table">
          <el-table :data="patchItems" max-height="320">
            <el-table-column label="KB 编号" width="140">
              <template #default="{ row }">
                {{ row.kbNumber }}
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="320" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.title }}
              </template>
            </el-table-column>
            <el-table-column label="严重级别" width="120">
              <template #default="{ row }">
                <el-tag :type="getSeverityTagType(row.severity)" size="small" effect="plain">
                  {{ row.severityLabel }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSeverityTagType, pickValue, resolveHostId, resolveHostKey } from '../../utils'

const props = defineProps({
  hostSummary: {
    type: Object,
    default: null
  },
  selectedRows: {
    type: Array,
    default: () => []
  }
})

const patchItems = computed(() => (Array.isArray(props.selectedRows) ? props.selectedRows : []))
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
