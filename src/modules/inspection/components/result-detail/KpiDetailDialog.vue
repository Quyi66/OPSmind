<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="800px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div class="kpi-filter-bar" style="margin-bottom: 12px">
      <el-input
        v-model="filterText"
        placeholder="搜索 主机 或 检查项..."
        clearable
        style="width: 300px"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table v-loading="loading" :data="filteredData" stripe max-height="calc(100vh - 300px)">
      <el-table-column prop="host_key" label="主机" min-width="120" />
      <el-table-column prop="name" label="检查项" min-width="200" />
      <el-table-column label="检查状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getKpiStatusTagType(row.status)" effect="dark" round>
            <i :class="['fa', getKpiStatusIcon(row.status)]" style="margin-right: 5px"></i>
            {{ getKpiStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70" fixed="right">
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

/**
 * 前端筛选后的数据
 */
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

/**
 * 监听弹窗显示状态，关闭时重置筛选
 */
watch(
  () => props.visible,
  val => {
    if (!val) {
      filterText.value = ''
    }
  }
)
</script>
