<template>
  <el-dialog
    v-model="dialogVisible"
    title="修改记录"
    width="900px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    class="file-revision-dialog"
  >
    <div class="revision-container" v-loading="loading">
      <!-- 左侧版本列表 -->
      <div class="revision-sidebar">
        <div class="revision-list">
          <div
            v-for="(rev, index) in revisions"
            :key="rev.name || index"
            class="revision-item"
            :class="{ 'is-active': currentRev?.name === rev.name }"
            @click="selectRevision(rev)"
          >
            <div class="revision-header">
              <div class="revision-info">
                <span :class="['change-icon', getChangeIconClass(rev.changeType)]">
                  {{ getChangeIconText(rev.changeType) }}
                </span>
                <span class="revision-date">{{ formatDate(rev.date) }}</span>
              </div>
              <el-button
                v-if="currentRev?.name === rev.name && canRollback && index > 0"
                type="danger"
                size="small"
                class="rollback-btn"
                @click.stop="handleRollback(rev)"
                :loading="rollbackLoading"
              >
                <i class="fa fa-undo"></i> 回退
              </el-button>
            </div>
            <div class="revision-author">{{ rev.author }}</div>
          </div>
          <el-empty v-if="!loading && revisions.length === 0" description="暂无历史版本" :image-size="80" />
        </div>
      </div>

      <!-- 右侧变更内容 -->
      <div class="revision-content">
        <div v-if="currentRev" class="diff-panel">
          <!-- 文件头部 -->
          <div class="diff-file-header">
            <i class="fa fa-file-alt"></i>
            <span class="file-name">{{ fileName }}</span>
            <span :class="['change-badge', getChangeBadgeClass(currentRev.changeType)]">
              {{ getChangeTypeName(currentRev.changeType) }}
            </span>
          </div>

          <!-- Diff 内容 -->
          <div v-if="currentRev.changeType !== 'ADD'" class="diff-body">
            <table class="diff-table">
              <tbody>
                <tr v-for="(line, index) in diffLines" :key="index" :class="line.type">
                  <td class="line-num">{{ line.lineNum }}</td>
                  <td class="line-content">
                    <span class="line-prefix">{{ line.prefix }}</span>
                    <span class="line-text">{{ line.text }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="diff-add-placeholder">
            <i class="fa fa-plus-circle"></i>
            <span>新建文件</span>
          </div>
        </div>
        <el-empty v-else description="请选择一个版本查看详情" :image-size="80" />
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repo: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  canRollback: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'rollback'])

const dialogVisible = ref(false)
const loading = ref(false)
const rollbackLoading = ref(false)
const revisions = ref([])
const currentRev = ref(null)
const diffLines = ref([])

const fileName = computed(() => props.path?.split('/').pop() || '')

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    loadRevisions()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

async function loadRevisions() {
  loading.value = true
  try {
    const response = await gfsApi.getFileRevisions(props.repo, props.path)
    const data = response?.data || response || []
    revisions.value = Array.isArray(data) ? data : []

    if (revisions.value.length > 0) {
      selectRevision(revisions.value[0])
    }
  } catch (error) {
    console.error('获取历史版本失败:', error)
    ElMessage.error(error?.message || '获取历史版本失败')
    revisions.value = []
  } finally {
    loading.value = false
  }
}

function selectRevision(rev) {
  currentRev.value = rev
  parseDiff(rev)
}

/**
 * 解析 diff 内容为行数组
 */
function parseDiff(rev) {
  if (!rev.change || rev.changeType === 'ADD') {
    diffLines.value = []
    return
  }

  const lines = rev.change.split('\n')
  const result = []
  let newLineNum = 0
  let inHeader = true

  for (const line of lines) {
    // 跳过 diff 头部信息
    if (inHeader) {
      if (line.startsWith('@@')) {
        inHeader = false
        // 解析起始行号 @@ -1,3 +1,4 @@
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
        if (match) {
          newLineNum = parseInt(match[1], 10)
        }
        result.push({
          type: 'info',
          lineNum: '',
          prefix: '',
          text: line.replace(/^@@/, '@@').trim()
        })
      }
      continue
    }

    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/)
      if (match) {
        newLineNum = parseInt(match[1], 10)
      }
      result.push({
        type: 'info',
        lineNum: '',
        prefix: '',
        text: line.replace(/^@@/, '@@').trim()
      })
      continue
    }

    if (line.startsWith('+')) {
      result.push({
        type: 'add',
        lineNum: newLineNum,
        prefix: '+',
        text: line.substring(1)
      })
      newLineNum++
    } else if (line.startsWith('-')) {
      result.push({
        type: 'del',
        lineNum: '',
        prefix: '-',
        text: line.substring(1)
      })
    } else if (line.startsWith('\\')) {
      // 忽略 "\ No newline at end of file"
      continue
    } else {
      result.push({
        type: 'normal',
        lineNum: newLineNum,
        prefix: ' ',
        text: line.startsWith(' ') ? line.substring(1) : line
      })
      newLineNum++
    }
  }

  diffLines.value = result
}

async function handleRollback(rev) {
  try {
    await ElMessageBox.confirm(
      `确定要回退到此版本吗？此操作将覆盖当前文件内容。`,
      '回退确认',
      { type: 'warning' }
    )

    rollbackLoading.value = true
    await gfsApi.rollbackFileRevision(props.repo, rev.name, props.path)

    ElMessage.success('回退成功')
    emit('rollback', rev)
    loadRevisions()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '回退失败')
    }
  } finally {
    rollbackLoading.value = false
  }
}

function getChangeIconClass(changeType) {
  const map = {
    'ADD': 'icon-add',
    'DELETE': 'icon-delete',
    'MODIFY': 'icon-modify'
  }
  return map[changeType] || 'icon-modify'
}

function getChangeIconText(changeType) {
  const map = {
    'ADD': '+',
    'DELETE': '-',
    'MODIFY': 'M'
  }
  return map[changeType] || 'M'
}

function getChangeBadgeClass(changeType) {
  const map = {
    'ADD': 'badge-add',
    'DELETE': 'badge-delete',
    'MODIFY': 'badge-modify'
  }
  return map[changeType] || 'badge-modify'
}

function getChangeTypeName(changeType) {
  const map = {
    'ADD': '新建',
    'DELETE': '删除',
    'MODIFY': '修改'
  }
  return map[changeType] || changeType
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function handleClosed() {
  revisions.value = []
  currentRev.value = null
  diffLines.value = []
}
</script>

<style scoped lang="scss">
.file-revision-dialog {
  :deep(.el-dialog__body) {
    padding: 0 !important;
    height: 480px;
  }

  :deep(.el-dialog__footer) {
    padding: 12px 20px;
    border-top: 1px solid #ebeef5;
  }
}

.revision-container {
  display: flex;
  height: 100%;
  background: #fff;
}

// ========== 左侧版本列表 ==========
.revision-sidebar {
  width: 220px;
  border-right: 1px solid #e4e7ed;
  background: #fafbfc;
  overflow-y: auto;
  flex-shrink: 0;
}

.revision-list {
  padding: 0;
}

.revision-item {
  padding: 12px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.15s;

  &:hover {
    background: #f5f7fa;
  }

  &.is-active {
    background: #ecf5ff;
    border-left-color: #409eff;
  }
}

.revision-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.revision-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.change-icon {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  font-family: monospace;

  &.icon-add {
    background: #67c23a;
    color: #fff;
  }

  &.icon-delete {
    background: #f56c6c;
    color: #fff;
  }

  &.icon-modify {
    background: #409eff;
    color: #fff;
  }
}

.revision-date {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.revision-author {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  padding-left: 24px;
}

.rollback-btn {
  padding: 4px 8px !important;
  height: 24px !important;
  font-size: 12px !important;
  flex-shrink: 0;
}

// ========== 右侧 Diff 内容 ==========
.revision-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.diff-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diff-file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;

  > i {
    color: #909399;
    font-size: 14px;
  }

  .file-name {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }
}

.change-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;

  &.badge-add {
    background: #f0f9eb;
    color: #67c23a;
    border: 1px solid #c2e7b0;
  }

  &.badge-delete {
    background: #fef0f0;
    color: #f56c6c;
    border: 1px solid #fbc4c4;
  }

  &.badge-modify {
    background: #fdf6ec;
    color: #e6a23c;
    border: 1px solid #f5dab1;
  }
}

.diff-body {
  flex: 1;
  overflow: auto;
}

// 自定义 Diff 表格样式
.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 20px;

  tr {
    &.info {
      background: #f1f8ff;
      color: #0366d6;

      .line-num {
        background: #dbedff;
      }
    }

    &.add {
      background: #e6ffed;

      .line-num {
        background: #cdffd8;
      }

      .line-prefix {
        color: #22863a;
      }
    }

    &.del {
      background: #ffeef0;

      .line-num {
        background: #ffdce0;
      }

      .line-prefix {
        color: #cb2431;
      }
    }

    &.normal {
      .line-num {
        background: #fafbfc;
      }
    }
  }

  td {
    padding: 0;
    vertical-align: top;
  }

  .line-num {
    width: 50px;
    min-width: 50px;
    padding: 0 10px;
    text-align: right;
    color: rgba(27, 31, 35, 0.3);
    border-right: 1px solid #e1e4e8;
    user-select: none;
  }

  .line-content {
    padding: 0 10px;
    white-space: pre;
  }

  .line-prefix {
    display: inline-block;
    width: 12px;
    user-select: none;
  }

  .line-text {
    white-space: pre;
  }
}

.diff-add-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #67c23a;
  background: #f0f9eb;

  i {
    font-size: 48px;
    margin-bottom: 12px;
  }

  span {
    font-size: 15px;
    font-weight: 500;
  }
}
</style>
