<template>
  <el-dialog
    :model-value="visible"
    :title="`${host?.host_key || ''} - 巡检项详情`"
    width="920px"
    destroy-on-close
    @close="$emit('close')"
    :close-on-click-modal="true"
  >
    <div v-if="host" class="host-detail-dialog">
      <div class="host-info-card">
        <div class="host-badge">
          <i class="fas fa-server" aria-hidden="true"></i>
        </div>
        <div class="host-info-main">
          <span class="host-name">{{ host.host_key }}</span>
          <span class="host-os">
            操作系统：{{ machineInfo.os_distro || host.os_distro || '未知' }}
            {{ machineInfo.os_version || host.os_version || '' }}
          </span>
        </div>
      </div>

      <div class="host-detail-toolbar">
        <el-select
          :model-value="statusFilter"
          placeholder="检查状态"
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
        <el-input
          v-model="filterText"
          placeholder="搜索检查项名称"
          clearable
          size="small"
          style="width: 240px"
        />
        <span class="match-count-badge">
          匹配 {{ filteredCheckItems.length }} / 已加载 {{ checkItems?.length || 0 }} 条
        </span>
      </div>

      <el-table
        v-loading="loading"
        :data="filteredCheckItems"
        max-height="400"
        :empty-text="filterText.trim() ? '没有匹配的已加载检查项' : '暂无检查项'"
      >
        <el-table-column prop="name" label="检查项" min-width="220" />
        <el-table-column label="状态" width="130" align="left">
          <template #default="{ row }">
            <el-tag :type="getKpiStatusTagType(row.status)" effect="light" round size="small">
              <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px"></i>
              {{ getKpiStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="84" align="left">
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
import { computed, ref, watch } from 'vue'
import { STATUS_FILTER_OPTIONS } from '../../constants/status'
import { getKpiStatusTagType, getKpiStatusIcon, getKpiStatusLabel } from '../../constants/status'

const props = defineProps({
  visible: Boolean,
  host: Object,
  machineInfo: Object,
  checkItems: Array,
  loading: Boolean,
  statusFilter: String
})

defineEmits(['close', 'filter-change', 'show-detail'])

const statusOptions = STATUS_FILTER_OPTIONS
const filterText = ref('')
const filteredCheckItems = computed(() => {
  const rows = props.checkItems || []
  const keyword = filterText.value.trim().toLowerCase()
  if (!keyword) return rows
  return rows.filter(item =>
    String(item.name ?? '')
      .toLowerCase()
      .includes(keyword)
  )
})

watch([() => props.visible, () => props.host?.host_id, () => props.host?.host_key], () => {
  filterText.value = ''
})
</script>

<style scoped lang="scss">
.host-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .host-info-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;

    .host-badge {
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

    .host-info-main {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .host-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .host-os {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .host-detail-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .match-count-badge {
      margin-left: auto;
      font-size: 12px;
      color: var(--el-text-color-secondary);
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
