<template>
  <el-dialog
    :model-value="visible"
    title="白名单列表"
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
      <el-table-column prop="hostKey" label="主机" min-width="150" />
      <el-table-column prop="itemName" label="检查项" min-width="200" />
      <el-table-column prop="createdAt" label="添加时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default="{ row }">
          <el-button type="danger" link size="small" @click="$emit('delete', row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup>
import { formatDateTime } from '../../utils/helpers'

defineProps({
  visible: Boolean,
  data: Array,
  loading: Boolean
})

defineEmits(['close', 'delete'])
</script>
