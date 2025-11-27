<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="800px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="loadHistory"
  >
    <div v-loading="loading" class="history-container">
      <!-- 全部审批历史列表 -->
      <template v-if="viewMode === 'all'">
        <el-table :data="historyList" stripe height="400">
          <el-table-column label="时间" prop="actionDate" width="160" />
          <el-table-column label="文件数" width="100">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                @click="showApprovalDetail(row)"
              >
                {{ row.approvalFileCount || row.paths?.length || '-' }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column label="审批人" prop="approvalBy" width="120" />
          <el-table-column label="审批结果" prop="action" width="100">
            <template #default="{ row }">
              <el-tag
                :type="getActionTagType(row.action)"
                size="small"
              >
                {{ getActionText(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="comment" show-overflow-tooltip />
        </el-table>
      </template>

      <!-- 单个文件的审批历史 -->
      <template v-else-if="viewMode === 'singleFile'">
        <div class="file-info">
          <el-tag type="info">{{ file?.name }}</el-tag>
        </div>
        <el-table :data="historyList" stripe height="350">
          <el-table-column label="时间" prop="actionDate" width="160" />
          <el-table-column label="备注" prop="comment" show-overflow-tooltip />
          <el-table-column label="审批结果" width="150">
            <template #default="{ row }">
              <el-tag
                :type="getActionTagType(row.action)"
                size="small"
              >
                {{ getActionText(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 审批详情（某次审批涉及的文件列表） -->
      <template v-else-if="viewMode === 'approvalDetail'">
        <div class="detail-header">
          <el-button
            type="primary"
            link
            @click="backToList"
          >
            <i class="fa fa-arrow-left" /> 返回列表
          </el-button>
          <span class="detail-info">
            审批人：{{ currentDetail?.approverBy || currentDetail?.approvalBy }}
            | 时间：{{ currentDetail?.actionDate }}
            | 结果：{{ getActionText(currentDetail?.action) }}
          </span>
        </div>
        <el-table :data="detailPaths" stripe height="350">
          <el-table-column label="文件路径" prop="path">
            <template #default="{ row }">
              <el-button type="primary" link @click="goFile(row)">
                {{ typeof row === 'string' ? row : row.path }}
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
              {{ currentDetail?.approverBy || currentDetail?.approvalBy }}
            </template>
          </el-table-column>
          <el-table-column label="备注" width="200">
            <template #default>
              {{ currentDetail?.comment || '-' }}
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 空状态 -->
      <el-empty v-if="!loading && historyList.length === 0 && viewMode !== 'approvalDetail'" description="暂无审批记录" />
    </div>

    <template #footer>
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
    default: 'stage'
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

const emit = defineEmits(['update:modelValue', 'go-file'])

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

  loading.value = true
  try {
    let response
    if (props.mode === 'singleFile' && props.file) {
      // 加载单个文件的审批历史
      response = await gfsApi.getFileApprovalHistory(props.repoType, props.repo, props.file.path)
    } else {
      // 加载全部审批历史
      response = await gfsApi.getApprovalHistory(props.repo)
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

// 检测审批动作
function detectActionOfApprove(record) {
  const status = record.onlineStatus || record.status
  if (status === 'PUBLISHED') return 'APPROVED'
  if (status === 'REJECTED') return 'REJECTED'
  if (status === 'DISABLED') return 'DISABLED'
  return record.action || status || ''
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

// 显示审批详情
async function showApprovalDetail(record) {
  currentDetail.value = record
  viewMode.value = 'approvalDetail'

  // 如果记录中已有 paths，直接使用
  if (record.paths && record.paths.length > 0) {
    detailPaths.value = record.paths.map(p => typeof p === 'string' ? { path: p } : p)
    return
  }

  // 否则根据 ID 获取详情
  if (record.id) {
    loading.value = true
    try {
      const response = await gfsApi.getApprovalDetail(props.repo, record.id)
      // API 返回格式: { _status: "ok", result: {...} }
      const data = response?.data || response
      const detail = data?.result || data
      currentDetail.value = {
        ...detail,
        actionDate: formatDateTime(detail.updatedAt || detail.actionDate),
        action: detectActionOfApprove(detail)
      }
      detailPaths.value = (detail.paths || []).map(p => typeof p === 'string' ? { path: p } : p)
    } catch (error) {
      ElMessage.error(error?.message || '加载详情失败')
    } finally {
      loading.value = false
    }
  }
}

// 返回列表
function backToList() {
  viewMode.value = 'all'
  currentDetail.value = null
  detailPaths.value = []
}

// 跳转到文件
function goFile(file) {
  const path = typeof file === 'string' ? file : file.path
  emit('go-file', path)
}

// 获取操作标签类型
function getActionTagType(action) {
  const typeMap = {
    'APPROVE': 'success',
    'APPROVED': 'success',
    'REJECT': 'danger',
    'REJECTED': 'danger',
    'REVERT': 'warning',
    'REVERTED': 'warning'
  }
  return typeMap[action?.toUpperCase()] || 'info'
}

// 获取操作文本
function getActionText(action) {
  const textMap = {
    'APPROVE': '通过',
    'APPROVED': '已通过',
    'REJECT': '拒绝',
    'REJECTED': '已拒绝',
    'REVERT': '撤销',
    'REVERTED': '已撤销'
  }
  return textMap[action?.toUpperCase()] || action || '-'
}

// 监听模式变化
watch(() => props.mode, (val) => {
  viewMode.value = val
})
</script>

<style scoped lang="scss">
.history-container {
  min-height: 300px;
}

.file-info {
  margin-bottom: 12px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.detail-info {
  color: #606266;
  font-size: 13px;
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
