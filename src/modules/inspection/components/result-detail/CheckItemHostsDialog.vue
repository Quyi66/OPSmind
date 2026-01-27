<template>
  <el-dialog
    :model-value="visible"
    title="检查项详情"
    width="900px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div class="check-item-hosts-dialog">
      <!-- 标题区域 -->
      <div class="dialog-header-info">
        <div class="item-title">
          <span class="title-label">检查项：</span>
        </div>
        <div class="item-name">{{ itemName }}</div>
        <div class="item-icon">
          <i class="fad fa-desktop fa-3x"></i>
        </div>
      </div>

      <!-- 状态筛选 -->
      <div class="dialog-toolbar">
        <el-select
          :model-value="statusFilter"
          placeholder="检查状态"
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

      <!-- 表格 -->
      <el-table v-loading="loading" :data="data" stripe max-height="350">
        <el-table-column prop="host_key" label="主机" min-width="200" />
        <el-table-column label="检查状态" width="120" align="left">
          <template #default="{ row }">
            <el-tag :type="getKpiStatusTagType(row.status)" effect="dark" round size="small">
              <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px"></i>
              {{ getKpiStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="left">
          <template #default="{ row }">
            <el-button type="primary" text @click="$emit('show-detail', row)">详情</el-button>
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
  .dialog-header-info {
    display: flex;
    align-items: center;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 16px;

    .item-title {
      .title-label {
        font-size: 18px;
        font-weight: bold;
        color: #303133;
      }
    }

    .item-name {
      flex: 1;
      font-size: 14px;
      color: #606266;
      margin-left: 8px;
    }

    .item-icon {
      color: #909399;
      opacity: 0.5;
    }
  }

  .dialog-toolbar {
    margin-bottom: 12px;
  }
}
</style>
