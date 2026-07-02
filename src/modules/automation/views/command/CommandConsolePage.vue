<template>
  <div class="command-console">
    <div class="console-body">
      <div class="console-toolbar">
        <el-button size="small" @click="handleHistory">
          <i class="fas fa-history"></i>
          运行记录
        </el-button>
        <el-button size="small" :disabled="!command" @click="handleClearCommand">
          <i class="fas fa-eraser"></i>
          清空命令
        </el-button>
      </div>

      <el-form label-position="top" class="console-form">
        <el-form-item label="主机">
          <AcmDeviceSelector
            v-model="hosts"
            ci-types="[auto]"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择主机'
            }"
          />
        </el-form-item>

        <el-form-item label="语法">
          <el-select v-model="commandType" placeholder="请选择执行语法" class="grammar-select">
            <el-option label="请选择执行语法" value="" disabled />
            <el-option label="cmd" value="cmd" />
            <el-option label="shell" value="shell" />
            <el-option label="python" value="python" />
            <el-option label="playbook" value="playbook" />
            <el-option label="powershell" value="powershell" />
          </el-select>
        </el-form-item>

        <el-form-item label="命令" class="command-form-item">
          <div class="command-editor-field">
            <div class="code-editor">
              <div class="line-numbers">
                <span v-for="n in lineCount" :key="n">{{ n }}</span>
              </div>
              <textarea
                v-model="command"
                class="code-textarea"
                placeholder="请输入要执行的命令内容"
                @input="updateLineCount"
              ></textarea>
            </div>
            <div class="form-tip">当前共 {{ lineCount }} 行命令。</div>
          </div>
        </el-form-item>
      </el-form>

      <!-- 底部按钮 -->
      <div class="form-actions">
        <el-button type="primary" :loading="executing" @click="executeCommand">
          <i class="fas fa-check"></i>
          执行命令
        </el-button>
        <el-button @click="handleBack">
          <i class="fas fa-reply"></i>
          返回
        </el-button>
      </div>
    </div>

    <!-- 运行记录对话框 -->
    <el-dialog v-model="historyDialogVisible" title="运行记录" width="1200px">
      <div class="history-toolbar">
        <el-input
          v-model="historySearchKeyword"
          placeholder="搜索命令、主机、创建人..."
          style="width: 300px"
          clearable
          @clear="historyCurrentPage = 1"
          @keyup.enter="historyCurrentPage = 1"
        />
      </div>

      <el-table :data="paginatedHistoryData" max-height="calc(100vh - 450px)">
        <el-table-column prop="cmd" label="命令" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-ellipsis">{{ row.cmd }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="语法" width="80" />
        <el-table-column prop="hostname" label="主机" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-ellipsis">{{ row.hostname?.join(',') }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" sortable />
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="lastRunTime" label="最后执行时间" width="180" sortable />
        <el-table-column prop="runNumber" label="执行次数" width="110" sortable />
        <el-table-column label="操作" width="100" fixed="right" align="left">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleUseHistory(row)">
              填回控制台
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="history-pagination">
        <el-pagination
          v-model:current-page="historyCurrentPage"
          v-model:page-size="historyPageSize"
          :page-sizes="[10, 25, 50, 100]"
          :total="filteredHistoryData.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleHistoryPageSizeChange"
          @current-change="handleHistoryPageChange"
        />
      </div>

      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 日志查看器对话框 -->
    <el-dialog
      v-model="logViewerVisible"
      title="执行过程"
      width="900px"
      class="log-viewer-dialog"
      :close-on-click-modal="false"
      @close="closeLogViewer"
    >
      <div class="log-viewer-header">
        <div class="log-status">
          <el-tag
            :type="
              logStatus === 'RUNNING' ? 'warning' : logStatus === 'COMPLETED' ? 'success' : 'info'
            "
            size="small"
          >
            {{
              logStatus === 'RUNNING' ? '运行中' : logStatus === 'COMPLETED' ? '完成' : logStatus
            }}
          </el-tag>
          <el-switch
            v-model="autoScroll"
            active-text="自动滚动"
            size="small"
            style="margin-left: 16px"
          />
        </div>
      </div>
      <div class="log-viewer-content">
        <pre ref="logContentRef" class="log-output">{{ logContent || '等待输出...' }}</pre>
      </div>
      <template #footer>
        <el-button @click="closeLogViewer">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useApi } from '@/core/api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const emit = defineEmits(['back'])

// 状态
const commandType = ref('')
const hosts = ref([])
const command = ref('')
const executing = ref(false)
const lineCount = ref(1)

// 运行记录
const historyDialogVisible = ref(false)
const historyData = ref([])
const historyCurrentPage = ref(1)
const historyPageSize = ref(10)
const historySearchKeyword = ref('')

// 日志查看器
const logViewerVisible = ref(false)
const logContent = ref('')
const logStatus = ref('')
const logContentRef = ref(null)
const autoScroll = ref(true)
let websocket = null

// 过滤后的历史数据
const filteredHistoryData = computed(() => {
  if (!historySearchKeyword.value) {
    return historyData.value
  }
  const keyword = historySearchKeyword.value.toLowerCase()
  return historyData.value.filter(
    item =>
      (item.cmd && item.cmd.toLowerCase().includes(keyword)) ||
      (item.type && item.type.toLowerCase().includes(keyword)) ||
      (item.hostname && item.hostname.join(',').toLowerCase().includes(keyword)) ||
      (item.createdBy && item.createdBy.toLowerCase().includes(keyword))
  )
})

// 分页后的历史数据
const paginatedHistoryData = computed(() => {
  const start = (historyCurrentPage.value - 1) * historyPageSize.value
  const end = start + historyPageSize.value
  return filteredHistoryData.value.slice(start, end)
})

// 更新行号
function updateLineCount() {
  const lines = command.value.split('\n').length
  lineCount.value = Math.max(lines, 1)
}

// 执行命令
async function executeCommand() {
  if (!hosts.value.length) {
    ElMessage.error('请选择目标主机')
    return
  }
  if (!commandType.value) {
    ElMessage.error('请选择执行语法')
    return
  }
  if (!command.value.trim()) {
    ElMessage.error('请输入命令')
    return
  }

  executing.value = true

  try {
    const request = {
      commands: [],
      consoleCmd: [
        {
          name: 'console',
          cmd: command.value,
          type: commandType.value
        }
      ],
      hosts: hosts.value
    }

    const response = await useApi().post('/workflow/api/workflow/console-log/run', request)
    const result = response.data || response

    ElMessage.success('命令已提交执行')

    if (result.runId) {
      openLogViewer(result.runId)
    }
  } catch (error) {
    console.error('执行命令失败:', error)
    ElMessage.error(`执行命令失败: ${error?.message || '未知错误'}`)
  } finally {
    executing.value = false
  }
}

// 返回
function handleBack() {
  emit('back')
}

// 查看运行记录
async function handleHistory() {
  try {
    const response = await useApi().get('/workflow/api/workflow/console-log')
    const logs = response.data || response || []

    historyData.value = logs.map(log => {
      const cmdConfig = JSON.parse(log.cmdConfig || '[]')
      const hostConfig = JSON.parse(log.hostConfig || '[]')
      const hostNames = hostConfig.map(h => h.value)

      return {
        id: log.id,
        cmd: cmdConfig[0]?.cmd || '',
        type: cmdConfig[0]?.type || '',
        hostname: hostNames,
        hostConfig,
        createdAt: formatDate(log.createdAt),
        createdBy: log.createdBy,
        lastRunTime: formatDate(log.lastRunTime),
        runNumber: log.runNumber
      }
    })

    historyCurrentPage.value = 1
    historyDialogVisible.value = true
  } catch (error) {
    console.error('加载运行记录失败:', error)
    ElMessage.error('加载运行记录失败')
  }
}

// 使用历史记录
function handleUseHistory(row) {
  command.value = row.cmd
  commandType.value = row.type
  hosts.value = row.hostConfig || []
  updateLineCount()
  historyDialogVisible.value = false
}

function handleClearCommand() {
  command.value = ''
  updateLineCount()
}

// 分页变化
function handleHistoryPageSizeChange() {
  historyCurrentPage.value = 1
}

function handleHistoryPageChange(page) {
  historyCurrentPage.value = page
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    .replace(/\//g, '-')
}

// 获取 WebSocket URL
function getWebsocketUrl(runId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/oplus-ws/log/${runId}`
}

// 打开日志查看器
function openLogViewer(runId) {
  logContent.value = ''
  logStatus.value = 'RUNNING'
  logViewerVisible.value = true

  const wsUrl = getWebsocketUrl(runId)

  websocket = new WebSocket(wsUrl)

  websocket.onopen = () => {}

  websocket.onmessage = event => {
    try {
      const data = JSON.parse(event.data)
      const message = data.message || event.data
      logContent.value += message

      if (autoScroll.value && logContentRef.value) {
        setTimeout(() => {
          logContentRef.value.scrollTop = logContentRef.value.scrollHeight
        }, 50)
      }
    } catch {
      logContent.value += event.data
    }
  }

  websocket.onclose = () => {
    logStatus.value = 'COMPLETED'
  }

  websocket.onerror = error => {
    console.error('WebSocket error:', error)
    logStatus.value = 'ERROR'
  }
}

// 关闭日志查看器
function closeLogViewer() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.close()
  }
  websocket = null
  logViewerVisible.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  closeLogViewer()
})
</script>

<style scoped lang="scss">
.command-console {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  background: var(--el-bg-color);
}

.console-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  position: relative;
}

.console-toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.form-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.console-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  overflow: hidden;
}

.console-form :deep(.el-form-item__content) {
  display: block;
  width: 100%;
}

.console-form :deep(.el-form-item) {
  flex-shrink: 0;
}

.console-form :deep(.command-form-item) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.console-form :deep(.command-form-item .el-form-item__content) {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  width: 100%;
}

.command-editor-field {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.grammar-select {
  width: 240px;
}

.code-editor {
  display: flex;
  flex: 1;
  min-height: 320px;
  width: 100%;
  border-bottom: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
  height: auto;
  background: #1e1e2e;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  background: #2d2d3a;
  color: #6c7086;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  min-width: 40px;
  user-select: none;

  span {
    height: 1.5em;
  }
}

.code-textarea {
  flex: 1;
  min-height: 0;
  height: 100%;
  min-width: 0;
  padding: 12px;
  border: none;
  resize: none;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  outline: none;

  &::placeholder {
    color: #6c7086;
  }
}

.form-tip {
  display: block;
  margin-top: 8px;
  line-height: 1.5;
}

.form-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
}

.text-ellipsis {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 180px;
}

.history-toolbar {
  margin-bottom: 16px;
}

.history-toolbar :deep(.el-input) {
  width: 300px;
}

.history-toolbar {
  margin-bottom: 16px;
}

.history-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}

// 日志查看器样式
.log-viewer-header {
  margin-bottom: 16px;
}

.log-status {
  display: flex;
  align-items: center;
}

.log-viewer-content {
  background: #1e1e2e;
  border-radius: 6px;
  overflow: hidden;
}

.log-output {
  height: 400px;
  overflow: auto;
  padding: 16px;
  margin: 0;
  color: #cdd6f4;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

:deep(.el-dialog__header) {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 12px 20px;
}

@media (max-width: 1200px) {
  .console-toolbar,
  .history-toolbar,
  .form-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .grammar-select,
  .history-toolbar :deep(.el-input) {
    width: 100%;
  }
}
</style>
