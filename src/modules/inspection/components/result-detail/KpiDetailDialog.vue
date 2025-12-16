<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="800px"
    destroy-on-close
    @close="$emit('close')"
  >
    <el-table
      v-loading="loading"
      :data="data"
      border
      stripe
      max-height="400"
    >
      <el-table-column prop="host_key" label="主机" min-width="150" />
      <el-table-column prop="name" label="检查项" min-width="200" />
      <el-table-column label="检查状态" width="120" align="left">
        <template #default="{ row }">
          <el-tag :type="getKpiStatusTagType(row.status)" effect="dark" round>
            <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px;"></i>
            {{ getKpiStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="left" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="$emit('show-detail', row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup>
import { getKpiStatusTagType, getKpiStatusIcon, getKpiStatusLabel } from '../../constants/status'

defineProps({
  visible: Boolean,
  title: String,
  data: Array,
  loading: Boolean
})

defineEmits(['close', 'show-detail'])
</script>
