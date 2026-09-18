<template>
  <div class="ops-action-bar">
    <el-select v-model="status" size="small" aria-label="任务状态" style="width: 180px" @change="search">
      <el-option label="全部任务" value="" />
      <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>
    <span style="flex: 1" />
    <el-button
      class="toolbar-icon-btn"
      circle
      size="small"
      :loading="loading"
      title="刷新"
      aria-label="刷新"
      @click="load"
    >
      <el-icon v-show="!loading"><Refresh /></el-icon>
    </el-button>
  </div>
  <div class="ops-table-wrapper">
    <el-table v-loading="loading" :data="rows" height="100%">
      <el-table-column prop="createdBy" label="申请人" width="120" />
      <el-table-column label="软件包" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.packages) || '-' }}</template>
      </el-table-column>
      <el-table-column label="目标主机" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ formatJsonArray(row.hostIds) || '-' }}</template>
      </el-table-column>
      <el-table-column label="计划执行时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.scheduledTime) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag :type="getTaskStatusTagType(row.status)" :style="getTaskStatusTagStyle(row.status)" size="small" effect="light" round>{{ row.status === 'CREATED' && row.scheduledTime ? '等待定时执行' : formatTaskStatus(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="errorMessage" label="异常原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="$emit('detail', row)">详情</el-button>
          <template v-if="isAdmin && row.status === 'PENDING_APPROVAL'">
            <el-button text type="success" size="small" :disabled="approving || !isFutureSchedule(row.scheduledTime)" @click="approve(row, true)">通过</el-button>
            <el-button text type="danger" size="small" :disabled="approving" @click="approve(row, false)">驳回</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <div class="ops-pagination-wrapper">
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" background @current-change="load" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { patchInstallApi } from '../api'
import { formatDateTime, formatJsonArray, formatTaskStatus, getTaskStatusTagType, getTaskStatusTagStyle } from '../utils/patchProcessLogs'
import { isFutureSchedule, isPackageInstallFinished } from '../utils/patchInstallSchedule'

const props = defineProps({ isAdmin: Boolean })
defineEmits(['detail'])
const status = ref('PENDING_APPROVAL')
const statuses = [
  { value: 'PENDING_APPROVAL', label: '待管理员审批' },
  { value: 'CREATED', label: '已创建 / 等待执行' },
  { value: 'REJECTED', label: '审批驳回' },
  { value: 'EXPIRED', label: '已失效' }
]
const rows = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const approving = ref(false)
let requestId = 0
let timer

async function load() {
  const id = ++requestId
  loading.value = true
  try {
    const response = await patchInstallApi.listTasks({ status: status.value, page: page.value - 1, size: 20 })
    if (id !== requestId) return
    rows.value = response?.data?.content || []
    total.value = response?.data?.totalElements || 0
  } catch (error) {
    if (id === requestId) ElMessage.error(error?.message || '获取安装任务失败')
  } finally {
    if (id === requestId) loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

async function approve(task, approved) {
  if (!props.isAdmin || approving.value || task.status !== 'PENDING_APPROVAL') return
  approving.value = true
  try {
    const { value } = await ElMessageBox.prompt(
      `申请人：${task.createdBy || '-'}；计划执行时间：${formatDateTime(task.scheduledTime)}。请填写审批意见（可选）。`,
      approved ? '通过安装申请' : '驳回安装申请',
      { confirmButtonText: approved ? '确认通过' : '确认驳回', cancelButtonText: '取消', inputType: 'textarea' }
    )
    await patchInstallApi.approveTask(task.id, { approved, comment: value || '' })
    ElMessage.success(approved ? '已批准，等待计划时间自动执行' : '已驳回安装申请')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.response?.data?.message || error?.response?.data?.error || error?.message || '审批失败')
    }
  } finally {
    approving.value = false
    await load()
  }
}

onMounted(() => {
  load()
  timer = setInterval(() => {
    const hasDueTask = rows.value.some(task =>
      !isPackageInstallFinished(task.status) && !isFutureSchedule(task.scheduledTime)
    )
    if (!loading.value && !approving.value && hasDueTask) load()
  }, 15000)
})
onUnmounted(() => {
  clearInterval(timer)
  requestId += 1
})
</script>
