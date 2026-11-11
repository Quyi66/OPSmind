<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="860px"
    destroy-on-close
    @close="$emit('close')"
    :close-on-click-modal="true"
  >
    <div class="kpi-filter-bar">
      <el-input
        v-model="filterText"
        placeholder="搜索主机或检查项名称..."
        clearable
        size="small"
        style="width: 280px"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <span class="kpi-count-badge">
        匹配 {{ filteredData.length }} / 共 {{ (data || []).length }} 条
      </span>
    </div>

    <el-table v-loading="loading" :data="filteredData" max-height="calc(100vh - 300px)">
      <el-table-column prop="host_key" label="目标主机" min-width="140" />
      <el-table-column prop="name" label="检查项名称" min-width="220" show-overflow-tooltip />
      <el-table-column label="检查状态" width="130">
        <template #default="{ row }">
          <el-tag :type="getKpiStatusTagType(row.status)" effect="light" round size="small">
            <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px"></i>
            {{ getKpiStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" text size="small" @click="$emit('show-detail', row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getKpiStatusTagType, getKpiStatusIcon, getKpiStatusLabel } from '../../constants/status'

const props = defineProps({
  visible: Boolean,
  title: String,
  data: Array,
  loading: Boolean
})

defineEmits(['close', 'show-detail'])

const filterText = ref('')

const filteredData = computed(() => {
  const list = props.data || []
  if (!filterText.value) return list

  const keyword = filterText.value.toLowerCase()
  return list.filter(item => {
    const hostMatch = item.host_key?.toLowerCase()?.includes(keyword)
    const nameMatch = item.name?.toLowerCase()?.includes(keyword)
    return hostMatch || nameMatch
  })
})

watch(
  () => props.visible,
  val => {
    if (!val) {
      filterText.value = ''
    }
  }
)
</script>

<style scoped lang="scss">
.kpi-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  .kpi-count-badge {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }
}
</style>
