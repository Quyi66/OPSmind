<template>
  <el-dialog
    :model-value="visible"
    title="检查项跨主机比对"
    width="920px"
    destroy-on-close
    @close="$emit('close')"
    :close-on-click-modal="true"
  >
    <div class="check-item-hosts-dialog">
      <!-- 现代检查项摘要栏 -->
      <div class="dialog-header-card">
        <div class="header-icon-badge">
          <i class="fas fa-clipboard-check" aria-hidden="true"></i>
        </div>
        <div class="header-meta">
          <span class="meta-label">当前检查项</span>
          <strong class="meta-title">{{ itemName || '—' }}</strong>
        </div>
        <span class="header-count-pill">
          关联主机 <strong>{{ (data || []).length }}</strong> 台
        </span>
      </div>

      <!-- 状态筛选栏 -->
      <div class="dialog-toolbar">
        <div class="toolbar-left">
          <span class="filter-label">结果状态筛选：</span>
          <el-select
            :model-value="statusFilter"
            placeholder="全部状态"
            size="small"
            style="width: 150px"
            @update:model-value="$emit('filter-change', $event)"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </el-select>
        </div>
      </div>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="data" max-height="380" class="hosts-compare-table">
        <el-table-column prop="host_key" label="目标主机" min-width="220" />
        <el-table-column label="检查状态" width="140" align="left">
          <template #default="{ row }">
            <el-tag :type="getKpiStatusTagType(row.status)" effect="light" round size="small">
              <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px"></i>
              {{ getKpiStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="left">
          <template #default="{ row }">
            <el-button type="primary" text size="small" @click="$emit('show-detail', row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup>
import { STATUS_FILTER_OPTIONS } from '../../constants/status'
import { getKpiStatusTagType, getKpiStatusIcon, getKpiStatusLabel } from '../../constants/status'

defineProps({
  visible: Boolean,
  itemName: String,
  data: Array,
  loading: Boolean,
  statusFilter: String
})

defineEmits(['close', 'filter-change', 'show-detail'])

const statusOptions = STATUS_FILTER_OPTIONS
</script>

<style scoped lang="scss">
.check-item-hosts-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .dialog-header-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .header-icon-badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .header-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;

    .meta-label {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }

    .meta-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      overflow-wrap: anywhere;
    }
  }

  .header-count-pill {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    padding: 4px 10px;
    border-radius: 999px;
    flex-shrink: 0;
    strong {
      color: var(--el-color-primary);
      font-variant-numeric: tabular-nums;
    }
  }

  .dialog-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-label {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
