<template>
  <el-dialog
    v-model="visible"
    title="Windows扫描报告"
    width="1000px"
    destroy-on-close
    class="windows-scan-report-dialog"
  >
    <div class="dialog-content">
      <div class="summary-card" v-loading="summaryLoading">
        <div class="summary-item">
          <span class="label">扫描时间：</span>
          <span class="value">{{ formatDateTime(summary.scan_date) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">扫描主机数：</span>
          <span class="value">{{ summary.machine_count || 0 }}</span>
        </div>
      </div>

      <div class="ops-action-bar">
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="loading"
          @click="loadReport"
          title="刷新"
        >
          <el-icon v-show="!loading">
            <Refresh />
          </el-icon>
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" max-height="500px" size="small">
        <el-table-column prop="host_key" label="主机" width="130" show-overflow-tooltip />
        <el-table-column prop="os_distro" label="操作系统" min-width="180" show-overflow-tooltip />
        <el-table-column prop="os_version" label="系统版本" min-width="140" />
        <el-table-column prop="kb_count" label="漏洞数量" width="100" />
        <el-table-column prop="scan_date" label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.scan_date) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          size="small"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/utils/date'
import { Refresh } from '@element-plus/icons-vue'
import { useApi } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  runId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const summaryLoading = ref(false)
const summary = ref({
  scan_date: '',
  machine_count: 0
})
const tableData = ref([])
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})



async function loadSummary() {
  if (!props.runId) return
  summaryLoading.value = true
  try {
    const api = useApi()
    const res = await api.get('/secops/api/secops/dashboard/win-scan-hist', {
      params: {
        runId: props.runId
      }
    })
    const records = res.data?.data || []
    summary.value = records[0] || { scan_date: '', machine_count: 0 }
  } catch (error) {
    ElMessage.error(`加载扫描摘要失败: ${error.message || '未知错误'}`)
  } finally {
    summaryLoading.value = false
  }
}

async function loadDetail() {
  if (!props.runId) return
  loading.value = true
  try {
    const api = useApi()
    const res = await api.get('/secops/api/secops/dashboard/hist-win-scan-detail', {
      params: {
        runId: props.runId,
        page: pagination.value.page,
        size: pagination.value.pageSize
      }
    })
    const payload = res.data?.data
    let records = []
    let total = 0
    if (payload) {
      if (Array.isArray(payload)) {
        records = payload
        total = payload.length
      } else if (Array.isArray(payload.records)) {
        records = payload.records
        total = payload.total ?? payload.records.length
      } else if (Array.isArray(payload.content)) {
        records = payload.content
        total = payload.totalElements ?? payload.total ?? payload.content.length
      }
    }
    tableData.value = records
    pagination.value.total = total
  } catch (error) {
    ElMessage.error(`加载扫描详情失败: ${error.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function loadReport() {
  await Promise.all([loadSummary(), loadDetail()])
}

function handlePageChange(page) {
  pagination.value.page = page
  loadDetail()
}

function handleSizeChange(size) {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadDetail()
}

watch(
  () => props.modelValue,
  val => {
    if (val) {
      pagination.value.page = 1
      loadReport()
    }
  }
)

watch(
  () => props.runId,
  val => {
    if (val && props.modelValue) {
      pagination.value.page = 1
      loadReport()
    }
  }
)
</script>

<style scoped lang="scss">
.windows-scan-report-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
  }
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.summary-item .label {
  color: #303133;
  font-weight: 600;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}
</style>
