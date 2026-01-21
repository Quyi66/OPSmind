<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="1000px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="loadHistory"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="history-container">
      <!-- 单个文件的审批历史 (singleFile) -->
      <template v-if="viewMode === 'singleFile'">
        <el-table :data="historyList" stripe height="400">
          <el-table-column label="时间" prop="actionDate" width="160" />
          <el-table-column label="备注" prop="comment" show-overflow-tooltip />
          <el-table-column label="审批结果" width="150">
            <template #default="{ row }">
              <span>{{ row.action }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 全部审批历史列表 (all) -->
      <template v-else-if="viewMode === 'all'">
        <el-table :data="historyList" stripe height="400">
          <el-table-column label="时间" prop="actionDate" width="160" />
          <el-table-column label="文件数" width="100">
            <template #default="{ row }">
              <el-button type="primary" link @click="showApprovalDetail(row.id)">
                {{ row.approvalFileCount || '-' }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="审批人" prop="approvalBy" width="120" />
          <el-table-column label="审批结果" width="100">
            <template #default="{ row }">
              <span>{{ row.action }}</span>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="comment" show-overflow-tooltip />
        </el-table>
      </template>

      <!-- 审批详情（某次审批涉及的文件列表）(approvalDetail) -->
      <template v-else-if="viewMode === 'approvalDetail'">
        <el-table :data="detailPaths" stripe height="400">
          <el-table-column label="文件路径" min-width="200">
            <template #default="{ row }">
              <el-button type="primary" link @click="openFile(row)">
                {{ row }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="160">
            <template #default>
              {{ currentDetail?.actionDate }}
            </template>
          </el-table-column>
          <el-table-column label="审批人" width="120">
            <template #default>
              {{ currentDetail?.approverBy }}
            </template>
          </el-table-column>
          <el-table-column label="审批结果" width="100">
            <template #default>
              {{ currentDetail?.action }}
            </template>
          </el-table-column>
          <el-table-column label="备注" width="200">
            <template #default>
              {{ currentDetail?.comment || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>

    <template #footer>
      <el-button v-if="viewMode === 'approvalDetail'" @click="backToList" type="primary">
        <i class="fa fa-arrow-left" />
        返回列表
      </el-button>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  // 单个文件模式
  file: {
    type: Object,
    default: null
  },
  // all: 全部历史, singleFile: 单个文件历史
  mode: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['update:modelValue', 'open-file', 'closed'])

const loading = ref(false)
const historyList = ref([])
const viewMode = ref('all')
const currentDetail = ref(null)
const detailPaths = ref([])

// 弹窗标题
const dialogTitle = computed(() => {
  if (viewMode.value === 'singleFile' && props.file) {
    return `审批历史 - ${props.file.name}`
  }
  if (viewMode.value === 'approvalDetail') {
    return '审批文件详情'
  }
  return '审批历史'
})

// 加载历史记录
async function loadHistory() {
  viewMode.value = props.mode
  historyList.value = []
  currentDetail.value = null
  detailPaths.value = []

  loading.value = true
  try {
    let response
    if (props.mode === 'singleFile' && props.file) {
      // 加载单个文件的审批历史
      // 接口示例: /gfs/api/gfs/v2/git/f/{repo}/history/{filePath}
      response = await gfsApi.getFileApproveHistory(props.repo, props.file.path)
    } else {
      // 加载全部审批历史
      // 接口示例: /gfs/api/gfs/v2/git/f/{repo}/history
      response = await gfsApi.getAllApproveHistory(props.repo)
    }

    // API 返回格式: { _status: "ok", result: [...] } 或 axios response
    const data = response?.data || response
    const list = data?.result || data || []

    // 解析历史记录
    historyList.value = parseHistories(Array.isArray(list) ? list : [])
  } catch (error) {
    ElMessage.error(error?.message || '加载审批历史失败')
  } finally {
    loading.value = false
  }
}

// 解析历史记录，转换字段名
function parseHistories(records) {
  return records.map(record => ({
    ...record,
    actionDate: formatDateTime(record.updatedAt || record.actionDate),
    action: detectActionOfApprove(record)
  }))
}

// 解析单条详情
function parseDetail(detail) {
  return {
    ...detail,
    actionDate: formatDateTime(detail.approverAt || detail.updatedAt || detail.actionDate),
    action: detectActionOfApprove(detail)
  }
}

// 检测审批动作 (与源代码 detectActionOfApprove 逻辑一致)
function detectActionOfApprove(record) {
  const ACTION_DEFS = [
    { name: 'APPROVE', text: '通过', status: 'PUBLISHED' },
    { name: 'REJECT', text: '拒绝', status: 'REJECTED' },
    { name: 'DISABLE', text: '停用', status: 'DISABLED' },
    { name: 'REVERT', text: '撤销', status: 'REVERT' }
  ]

  const fileStatus = record.onlineStatus || record.approverStatus || ''
  const action = ACTION_DEFS.find(o => o.status === fileStatus && o.name !== 'PUBLISH')
  return action?.text || fileStatus || '-'
}

// 格式化日期时间
function formatDateTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 显示审批详情 (与源代码 showApprovalDetail 逻辑一致)
async function showApprovalDetail(approvalId) {
  if (!approvalId) return

  loading.value = true
  try {
    // 接口示例: /gfs/api/gfs/v2/git/f/{repo}/history/{approvalId}
    const response = await gfsApi.getApprovalDetail(props.repo, approvalId)
    // API 返回格式: { _status: "ok", result: {...} }
    const data = response?.data || response
    if (data?._status === 'ok' || data?.result) {
      const detail = data.result || data
      currentDetail.value = parseDetail(detail)
      detailPaths.value = normalizePaths(detail)
      viewMode.value = 'approvalDetail'
    }
  } catch (error) {
    ElMessage.error(error?.message || '加载详情失败')
  } finally {
    loading.value = false
  }
}

// 返回列表
function backToList() {
  viewMode.value = 'all'
  currentDetail.value = null
  detailPaths.value = []
}

// 打开文件内容弹窗（直接预览，不再跳转目录）
function openFile(filePath) {
  if (!filePath) return
  const repo = currentDetail.value?.repo || props.repo
  emit('open-file', { path: filePath, repo })
}

// 解析 paths 字段（兼容字符串与数组）
function normalizePaths(detail) {
  if (Array.isArray(detail?.paths)) return detail.paths

  const rawPath = detail?.path
  if (Array.isArray(rawPath)) return rawPath

  if (typeof rawPath === 'string') {
    try {
      const parsed = JSON.parse(rawPath)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {
      // ignore JSON parse error
    }
    return [rawPath]
  }

  return []
}

// 弹窗关闭时重置状态
function handleClosed() {
  viewMode.value = props.mode
  historyList.value = []
  currentDetail.value = null
  detailPaths.value = []
  emit('closed')
}

// 监听模式变化
watch(
  () => props.mode,
  val => {
    viewMode.value = val
  }
)
</script>

<style scoped lang="scss">
.history-container {
  min-height: 300px;
}

/* 表头浅灰色样式 */
:deep(.el-table__header-wrapper) {
  th {
    background-color: #e9ecef !important;
    color: #495057 !important;
  }
}

:deep(.el-table__header) {
  th.el-table__cell {
    background-color: #e9ecef !important;
    color: #495057 !important;
  }
}
</style>
