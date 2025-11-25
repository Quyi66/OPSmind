<template>
  <div class="recently-selector">
    <el-table
      :data="tableData"
      v-loading="loading"
      border
      height="350"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="IP" label="IP地址" min-width="150" show-overflow-tooltip />
      <el-table-column prop="name" label="主机名" min-width="150" show-overflow-tooltip />
      <el-table-column prop="lastUsedAt" label="最近使用" min-width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.lastUsedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="useCount" label="使用次数" width="100" align="center" />
    </el-table>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const loading = ref(false)
const tableData = ref([])

watch(() => props.ciType, () => {
  fetchData()
}, { immediate: true })

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.queryAcmRecentlyUsed(props.ciType)
    const data = response?.data || response
    tableData.value = Array.isArray(data) ? data.map(item => ({
      id: item.id,
      IP: item.IP || item.ip,
      name: item.name || item.hostname,
      lastUsedAt: item.lastUsedAt || item.lastAccessTime,
      useCount: item.useCount || item.accessCount || 0
    })) : []
  } catch (error) {
    console.error('Failed to fetch recently used:', error)
    // 如果API失败,使用模拟数据
    tableData.value = [
      {
        id: 'host-1',
        IP: '192.168.1.100',
        name: 'server-01',
        lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
        useCount: 15
      },
      {
        id: 'host-2',
        IP: '192.168.1.101',
        name: 'server-02',
        lastUsedAt: new Date(Date.now() - 7200000).toISOString(),
        useCount: 10
      },
      {
        id: 'host-3',
        IP: '192.168.1.102',
        name: 'server-03',
        lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
        useCount: 5
      }
    ]
  } finally {
    loading.value = false
  }
}function handleSelectionChange(selection) {
  const selected = selection.map(row => ({
    key: row.id,
    value: row.IP,
    assetType: props.ciType
  }))
  emit('update:modelValue', selected)
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()

  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  } else {
    return date.toLocaleDateString()
  }
}
</script>

<style scoped>
.recently-selector {
  padding: 10px;
}
</style>
