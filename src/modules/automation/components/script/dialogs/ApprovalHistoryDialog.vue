<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="1000px"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
    :close-on-click-modal="true"
  >
    <div v-loading="loading" class="history-container">
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false">
        <el-button link type="primary" @click="retryRead">{{ t('common.retry') }}</el-button>
      </el-alert>
      <!-- 单个文件的审批历史 (singleFile) -->
      <template v-if="viewMode === 'singleFile'">
        <el-table :data="historyList" height="400" :empty-text="emptyText">
          <el-table-column :label="t('automation.library.time')" prop="actionDate" width="160" />
          <el-table-column :label="t('automation.library.remark')" prop="comment" show-overflow-tooltip />
          <el-table-column :label="t('automation.library.approvalResult')" width="150">
            <template #default="{ row }">
              <span>{{ row.action }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 全部审批历史列表 (all) -->
      <template v-else-if="viewMode === 'all'">
        <el-table :data="historyList" height="400" :empty-text="emptyText">
          <el-table-column :label="t('automation.library.time')" prop="actionDate" width="160" />
          <el-table-column :label="t('automation.library.fileCount')" width="100">
            <template #default="{ row }">
              <el-button type="primary" link @click="showApprovalDetail(row.id)">
                {{ row.approvalFileCount ?? '-' }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.approval.approver')" prop="approvalBy" width="120" />
          <el-table-column :label="t('automation.library.approvalResult')" width="100">
            <template #default="{ row }">
              <span>{{ row.action }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.remark')" prop="comment" show-overflow-tooltip />
        </el-table>
      </template>

      <!-- 审批详情（某次审批涉及的文件列表）(approvalDetail) -->
      <template v-else-if="viewMode === 'approvalDetail'">
        <el-table :data="detailPaths" height="400">
          <el-table-column :label="t('automation.library.filePath')" min-width="200">
            <template #default="{ row }">
              <el-button type="primary" link @click="openFile(row)">
                {{ row }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.time')" width="160">
            <template #default>
              {{ currentDetail?.actionDate }}
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.approval.approver')" width="120">
            <template #default>
              {{ currentDetail?.approverBy }}
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.approvalResult')" width="100">
            <template #default>
              {{ currentDetail?.action }}
            </template>
          </el-table-column>
          <el-table-column :label="t('automation.library.remark')" width="200">
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
        {{ t('automation.library.backToList') }}
      </el-button>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/modules/automation/utils/helpers'
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
const loadError = messageRef('')
const failedDetailId = ref('')
let readVersion = 0
const emptyText = computed(() =>
  loading.value ? t('automation.library.readingHistory') : loadError.value || t('automation.library.noHistory')
)

function readContext() {
  return JSON.stringify([props.repoType, props.repo, props.mode, props.file?.path])
}

function beginRead() {
  const version = ++readVersion
  const context = readContext()
  return () => props.modelValue && version === readVersion && context === readContext()
}

function invalidateRead() {
  readVersion += 1
  loading.value = false
}

// 弹窗标题
const dialogTitle = computed(() => {
  if (viewMode.value === 'singleFile' && props.file) {
    return t('automation.library.fileHistoryTitle', { name: props.file.name })
  }
  if (viewMode.value === 'approvalDetail') {
    return t('automation.library.approvalFileDetails')
  }
  return t('automation.library.approvalHistory')
})

// 加载历史记录
async function loadHistory() {
  if (!props.modelValue) return
  const isCurrent = beginRead()
  viewMode.value = props.mode
  historyList.value = []
  currentDetail.value = null
  detailPaths.value = []
  loadError.value = ''
  failedDetailId.value = ''

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
    if (!isCurrent()) return

    // API 返回格式: { _status: "ok", result: [...] } 或 axios response
    const data = response?.data || response
    const list = data?.result || data || []
    if (!Array.isArray(list)) throw Object.assign(new Error(t('automation.library.invalidHistory')), { i18nKey: 'automation.library.invalidHistory' })

    // 解析历史记录
    historyList.value = parseHistories(list)
  } catch (error) {
    if (!isCurrent()) return
    loadError.value = error?.i18nKey ? message(error.i18nKey) : error?.message || message('automation.library.historyFailedRetry')
    ElMessage.error(error?.message || t('automation.library.historyFailed'))
  } finally {
    if (isCurrent()) loading.value = false
  }
}

// 解析历史记录，转换字段名
function parseHistories(records) {
  return records.map(record => ({
    ...record,
    actionDate: formatDateTime(record.updatedAt || record.actionDate),
    get action() { return detectActionOfApprove(record) }
  }))
}

// 解析单条详情
function parseDetail(detail) {
  return {
    ...detail,
    actionDate: formatDateTime(detail.approverAt || detail.updatedAt || detail.actionDate),
    get action() { return detectActionOfApprove(detail) }
  }
}

// 检测审批动作 (与源代码 detectActionOfApprove 逻辑一致)
function detectActionOfApprove(record) {
  const ACTION_DEFS = [
    { name: 'APPROVE', text: t('automation.workbench.approve'), status: 'PUBLISHED' },
    { name: 'REJECT', text: t('automation.workbench.reject'), status: 'REJECTED' },
    { name: 'DISABLE', text: t('automation.workbench.disable'), status: 'DISABLED' },
    { name: 'REVERT', text: t('automation.library.revoke'), status: 'REVERT' }
  ]

  const fileStatus = record.onlineStatus || record.approverStatus || ''
  const action = ACTION_DEFS.find(o => o.status === fileStatus && o.name !== 'PUBLISH')
  return action?.text || fileStatus || '-'
}



// 显示审批详情 (与源代码 showApprovalDetail 逻辑一致)
async function showApprovalDetail(approvalId) {
  if (!approvalId || !props.modelValue) return

  const isCurrent = beginRead()
  loading.value = true
  loadError.value = ''
  failedDetailId.value = ''
  try {
    // 接口示例: /gfs/api/gfs/v2/git/f/{repo}/history/{approvalId}
    const response = await gfsApi.getApprovalDetail(props.repo, approvalId)
    if (!isCurrent()) return
    // API 返回格式: { _status: "ok", result: {...} }
    const data = response?.data || response
    if (data?._status === 'ok' || data?.result) {
      const detail = data.result || data
      currentDetail.value = parseDetail(detail)
      detailPaths.value = normalizePaths(detail)
      viewMode.value = 'approvalDetail'
    } else {
      throw Object.assign(new Error(t('automation.library.detailUnavailable')), { i18nKey: 'automation.library.detailUnavailable' })
    }
  } catch (error) {
    if (!isCurrent()) return
    failedDetailId.value = approvalId
    loadError.value = error?.i18nKey ? message(error.i18nKey) : error?.message || message('automation.library.detailFailedRetry')
    ElMessage.error(error?.message || t('automation.library.detailFailed'))
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function retryRead() {
  if (failedDetailId.value) return showApprovalDetail(failedDetailId.value)
  return loadHistory()
}

// 返回列表
function backToList() {
  invalidateRead()
  loadError.value = ''
  failedDetailId.value = ''
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
  if (props.modelValue) return
  invalidateRead()
  loadError.value = ''
  failedDetailId.value = ''
  viewMode.value = props.mode
  historyList.value = []
  currentDetail.value = null
  detailPaths.value = []
  emit('closed')
}

// 打开或切换仓库/文件时重读；不依赖延迟触发的对话框动画事件。
watch(
  [() => props.modelValue, readContext],
  () => {
    if (props.modelValue) loadHistory()
  },
  { immediate: true }
)
watch(
  () => props.modelValue,
  open => {
    if (!open) invalidateRead()
  },
  { flush: 'sync' }
)
onBeforeUnmount(invalidateRead)
</script>

<style scoped lang="scss">
.history-container {
  min-height: 300px;
}

/* 表头浅灰色样式 */
:deep(.el-table__header-wrapper) {
  th {
    background-color: var(--el-fill-color-light) !important;
    color: var(--el-text-color-regular) !important;
  }
}

:deep(.el-table__header) {
  th.el-table__cell {
    background-color: var(--el-fill-color-light) !important;
    color: var(--el-text-color-regular) !important;
  }
}
</style>
