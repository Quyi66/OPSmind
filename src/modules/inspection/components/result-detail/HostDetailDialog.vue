<template>
  <el-dialog
    :model-value="visible"
    :title="`${host?.host_key || ''} - 巡检项详情`"
    width="900px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div v-if="host" class="host-detail-dialog">
      <div class="host-info">
        <div class="host-info-main">
          <span class="host-name">{{ host.host_key }}</span>
          <span class="host-os">
            OS：{{ machineInfo.os_distro || host.os_distro }}
            {{ machineInfo.os_version || host.os_version }}
          </span>
        </div>
        <div class="host-icon">
          <i class="fa fa-desktop"></i>
        </div>
      </div>
      <div class="host-detail-toolbar">
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
      <el-table v-loading="loading" :data="checkItems"  max-height="400">
        <el-table-column prop="name" label="检查项" min-width="200" />
        <el-table-column label="状态" width="120" align="left">
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
  host: Object,
  machineInfo: Object,
  checkItems: Array,
  loading: Boolean,
  statusFilter: String
})

defineEmits(['close', 'filter-change', 'show-detail'])

const statusOptions = STATUS_FILTER_OPTIONS
</script>

<style scoped lang="scss">
.host-detail-dialog {
  .host-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;

    .host-info-main {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .host-name {
        font-size: 18px;
        font-weight: bold;
        color: #303133;
      }

      .host-os {
        font-size: 14px;
        color: #606266;
      }
    }

    .host-icon {
      font-size: 48px;
      color: #909399;
      opacity: 0.5;
    }
  }

  .host-detail-toolbar {
    margin-bottom: 12px;
  }
}
</style>
