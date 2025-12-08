<template>
  <div class="recently-selector">
    <!-- 搜索栏 -->
    <div class="search-toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索作业名称"
        clearable
        :prefix-icon="Search"
        @input="handleSearch"
      />
      <el-button :icon="Refresh" @click="fetchData" />
    </div>

    <!-- 作业列表 -->
    <el-table
      ref="tableRef"
      :data="filteredData"
      v-loading="loading"
      border
      height="350"
      row-key="id"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" reserve-selection />
      <el-table-column prop="jobTitle" label="作业" min-width="280" show-overflow-tooltip sortable />
      <el-table-column label="执行主机" width="120" show-overflow-tooltip sortable>
        <template #default="{ row }">
          <span v-if="row.run_result_hosts?.length">
            {{ row.run_result_hosts[0]?.value || '-' }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="jobType" label="类型" width="80" align="center" sortable>
        <template #default="{ row }">
          {{ row.jobType || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="结束时间" width="160" sortable>
        <template #default="{ row }">
          {{ formatDateTime(row.endTime || row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column label="Ansible Node" width="150" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.ata_node" type="primary" size="small">
            {{ parseAnsibleNode(row.ata_node) }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center" sortable>
        <template #default="{ row }">
          <el-tag
            :type="getStatusStyle(row.status)"
            size="small"
            class="clickable-status"
            @click="handleViewResult(row)"
          >
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="详情" width="60" align="center">
        <template #default="{ row }">
          <span class="detail-count" v-if="row.statsJson" @click="handleViewResult(row)">
            {{ getHostCount(row.statsJson) }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 作业运行结果弹窗 -->
    <ExecuteResultDialog
      v-model:visible="resultDialogVisible"
      :run-id="currentRunId"
      :job-title="currentJobTitle"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import * as jaoApi from '@/modules/automation/api/jao'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue'])

const tableRef = ref(null)
const loading = ref(false)
const tableData = ref([])
const searchKeyword = ref('')

// 运行结果弹窗状态
const resultDialogVisible = ref(false)
const currentRunId = ref('')
const currentJobTitle = ref('')

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchKeyword.value) return tableData.value
  const keyword = searchKeyword.value.toLowerCase()
  return tableData.value.filter(item =>
    item.jobTitle?.toLowerCase().includes(keyword)
  )
})

watch(() => props.ciType, () => {
  fetchData()
}, { immediate: true })

onMounted(() => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const response = await jaoApi.queryAcmRecentlyUsed({
      jobTypes: 'script,command',
      limit: 100
    })

    const data = response?.data || response
    console.log('最近作业 API 响应:', data)
    // API 返回的是作业记录列表
    tableData.value = Array.isArray(data) ? data : (data?.records || [])

  } catch (error) {
    console.error('Failed to fetch recently used:', error)
    tableData.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  // 搜索是实时过滤，不需要额外操作
}

function handleSelectionChange(selection) {
  // 选择作业记录时，将其关联的主机添加到已选列表
  const selectedHosts = []

  selection.forEach(job => {
    if (job.run_result_hosts && Array.isArray(job.run_result_hosts)) {
      job.run_result_hosts.forEach(host => {
        // 避免重复添加
        if (!selectedHosts.some(h => h.key === host.key || h.value === host.value)) {
          selectedHosts.push({
            key: host.key || host.id,
            value: host.value || host.IP,
            assetType: host.assetType || props.ciType
          })
        }
      })
    }
  })

  emit('update:modelValue', selectedHosts)
}

/**
 * 查看作业运行结果
 */
function handleViewResult(row) {
  if (!row.runId && !row.id) return

  currentRunId.value = row.runId || row.id
  currentJobTitle.value = row.jobTitle || ''
  resultDialogVisible.value = true
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

function parseAnsibleNode(nodeValue) {
  if (!nodeValue) return '-'
  try {
    // 如果是 JSON 数组字符串，解析它
    if (typeof nodeValue === 'string' && nodeValue.startsWith('[')) {
      const arr = JSON.parse(nodeValue)
      return Array.isArray(arr) ? arr.join(', ') : nodeValue
    }
    // 如果已经是数组
    if (Array.isArray(nodeValue)) {
      return nodeValue.join(', ')
    }
    return nodeValue
  } catch {
    return nodeValue
  }
}

function getStatusLabel(status) {
  if (!status) return '-'
  const statusUpper = status.toUpperCase()
  const labels = {
    'SUCCESS': '完成',
    'COMPLETED': '完成',
    'FAILED': '运行失败',
    'ERROR': '运行错误',
    'RUNNING': '执行中',
    'PENDING': '等待中'
  }
  return labels[statusUpper] || status
}

function getStatusStyle(status) {
  if (!status) return 'info'
  const statusUpper = status.toUpperCase()
  const styles = {
    'SUCCESS': 'success',
    'COMPLETED': 'success',
    'FAILED': 'warning',
    'ERROR': 'danger',
    'RUNNING': 'primary',
    'PENDING': 'info'
  }
  return styles[statusUpper] || 'info'
}

function getHostCount(statsJson) {
  try {
    const stats = typeof statsJson === 'string' ? JSON.parse(statsJson) : statsJson
    return stats?.totalHosts || stats?.total || '-'
  } catch {
    return '-'
  }
}
</script>

<style scoped>
.recently-selector {
  padding: 10px;
}

.search-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.search-toolbar .el-input {
  width: 200px;
}

.detail-count {
  color: #409eff;
  cursor: pointer;
}

.detail-count:hover {
  text-decoration: underline;
}

.clickable-status {
  cursor: pointer;
  transition: transform 0.2s;
}

.clickable-status:hover {
  transform: scale(1.05);
}
</style>

