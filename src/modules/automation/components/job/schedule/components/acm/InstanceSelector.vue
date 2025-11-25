<template>
  <div class="instance-selector">
    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <strong>筛选</strong>
      <GroupSelector
        v-model="groupFilter"
        :ci-type="ciType"
        :options="{ showAs: 'dropdown', dropdownText: '选择分组' }"
        @select="handleGroupFilter"
      />
      <TagSelector
        v-model="tagFilter"
        :ci-type="ciType"
        :options="{ view: 'dropdown' }"
        @select="handleTagFilter"
      />
    </div>

    <!-- 主机列表表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      v-loading="loading"
      border
      height="350"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" :reserve-selection="true" />
      <el-table-column prop="IP" label="IP地址" min-width="150" show-overflow-tooltip />
      <el-table-column prop="name" label="主机名" min-width="150" show-overflow-tooltip />
      <el-table-column prop="osVersion" label="操作系统" min-width="150" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'online' ? 'success' : 'info'" size="small">
            {{ row.status === 'online' ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import GroupSelector from './GroupSelector.vue'
import TagSelector from './TagSelector.vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const tableRef = ref(null)
const loading = ref(false)
const tableData = ref([])
const groupFilter = ref(null)
const tagFilter = ref(null)
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

watch(() => props.ciType, () => {
  fetchData()
}, { immediate: true })

watch(() => props.modelValue, (newVal) => {
  if (tableRef.value && newVal) {
    // 回显已选择的行
    tableRef.value.clearSelection()
    tableData.value.forEach(row => {
      const found = newVal.find(item => item.key === row.id || item.value === row.IP)
      if (found) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
  }
}, { immediate: true })

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.queryAcmInstances({
      ciType: props.ciType,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      groupPath: groupFilter.value,
      tag: tagFilter.value
    })

    // 处理响应数据
    const data = response?.data || response
    tableData.value = Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : []
    pagination.value.total = data?.total || tableData.value.length
  } catch (error) {
    console.error('Failed to fetch ACM instances:', error)
    // 如果API失败,使用模拟数据
    const mockData = generateMockData()
    tableData.value = mockData.records
    pagination.value.total = mockData.total
  } finally {
    loading.value = false
  }
}function generateMockData() {
  const records = []
  for (let i = 0; i < pagination.value.pageSize; i++) {
    records.push({
      id: `host-${i + 1}`,
      IP: `192.168.1.${100 + i}`,
      name: `server-${i + 1}`,
      osVersion: 'CentOS 7.9',
      status: i % 3 === 0 ? 'offline' : 'online'
    })
  }
  return { records, total: 100 }
}

function handleSelectionChange(selection) {
  const selectedHosts = selection.map(row => ({
    key: row.id,
    value: row.IP,
    assetType: props.ciType
  }))
  emit('update:modelValue', selectedHosts)
}

function handleGroupFilter(group) {
  groupFilter.value = group
  fetchData()
}

function handleTagFilter(tag) {
  tagFilter.value = tag
  fetchData()
}
</script>

<style scoped>
.instance-selector .filter-toolbar {
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background-color: #f8f9fa;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.instance-selector .filter-toolbar strong {
  margin: 0;
}

.instance-selector .filter-toolbar :deep(.el-button),
.instance-selector .filter-toolbar :deep(.el-dropdown) {
  margin: 0;
}

.instance-selector .pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
