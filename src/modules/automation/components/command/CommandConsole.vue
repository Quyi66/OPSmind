<template>
  <div class="command-console">
    <!-- 标题栏 -->
    <div class="console-header">
      <nav class="navbar navbar-light">
        <div class="navbar-title">Console</div>
      </nav>
    </div>

    <div class="console-body">
      <!-- 运行记录按钮 -->
      <div class="history-btn-wrapper">
        <el-button type="primary" @click="handleHistory">
          <i class="fas fa-history"></i>
          运行记录
        </el-button>
      </div>

      <!-- 主机选择 -->
      <div class="form-group">
        <label class="control-label">主机</label>
        <div class="host-selector">
          <el-button @click="showHostSelector = true">
            <i class="fas fa-list"></i>
            选择
          </el-button>
          <div v-if="hosts.length > 0" class="host-tags">
            <el-tag
              v-for="(host, index) in hosts"
              :key="index"
              closable
              type="success"
              @close="removeHost(index)"
            >
              {{ host.value || host }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 语法选择 -->
      <div class="form-group">
        <label class="control-label">语法</label>
        <el-select v-model="commandType" placeholder="请选择执行语法" class="grammar-select">
          <el-option label="请选择执行语法" value="" disabled />
          <el-option label="cmd" value="cmd" />
          <el-option label="shell" value="shell" />
          <el-option label="python" value="python" />
          <el-option label="playbook" value="playbook" />
          <el-option label="powershell" value="powershell" />
        </el-select>
      </div>

      <!-- 命令编辑器 -->
      <div class="form-group">
        <label class="control-label">命令</label>
        <div class="code-editor">
          <div class="line-numbers">
            <span v-for="n in lineCount" :key="n">{{ n }}</span>
          </div>
          <textarea
            v-model="command"
            class="code-textarea"
            placeholder=""
            @input="updateLineCount"
          ></textarea>
        </div>
      </div>

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

    <!-- 主机选择对话框 -->
    <HostSelectorDialog
      v-model:visible="showHostSelector"
      v-model="hosts"
      @confirm="handleHostsSelected"
    />

    <!-- 运行记录对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="运行记录"
      width="1000px"
    >
      <el-table
        :data="historyData"
        border
        max-height="400"
      >
        <el-table-column prop="cmd" label="命令" min-width="120">
          <template #default="{ row }">
            <span class="text-ellipsis" :title="row.cmd">{{ row.cmd }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="语法" width="100" />
        <el-table-column prop="hostname" label="主机" min-width="120">
          <template #default="{ row }">
            <span class="text-ellipsis" :title="row.hostname?.join(',')">{{ row.hostname?.join(',') }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column prop="lastRunTime" label="最后执行时间" width="160" />
        <el-table-column prop="runNumber" label="执行次数" width="90" />
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link @click="handleUseHistory(row)" title="数据回填">
              <i class="fas fa-reply"></i>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="historyDialogVisible = false">返回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useApi } from '@/core/api'
import HostSelectorDialog from './dialogs/HostSelectorDialog.vue'

const emit = defineEmits(['back'])

// 状态
const commandType = ref('')
const hostInput = ref('')
const hosts = ref([])
const command = ref('')
const executing = ref(false)
const lineCount = ref(1)

// 主机选择对话框
const showHostSelector = ref(false)

// 运行记录
const historyDialogVisible = ref(false)
const historyData = ref([])

// 更新行号
function updateLineCount() {
  const lines = command.value.split('\n').length
  lineCount.value = Math.max(lines, 1)
}

// 添加主机
function addHostsFromInput() {
  if (!hostInput.value.trim()) return

  const newHosts = hostInput.value.split(',').map(h => h.trim()).filter(h => h)
  newHosts.forEach(host => {
    const exists = hosts.value.some(h => (h.value || h) === host)
    if (!exists) {
      hosts.value.push({
        key: host,
        value: host,
        assetType: 'host'
      })
    }
  })
  hostInput.value = ''
}

// 移除主机
function removeHost(index) {
  hosts.value.splice(index, 1)
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
      consoleCmd: [{
        name: 'console',
        cmd: command.value,
        type: commandType.value
      }],
      hosts: hosts.value
    }

    await useApi().post('/jao/api/jao/job/run-console-command', request)
    ElMessage.success('命令已提交执行')
  } catch (error) {
    console.error('执行命令失败:', error)
    ElMessage.error('执行命令失败')
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
    const response = await useApi().get('/jao/api/jao/console-log')
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
        hostConfig: hostConfig,
        createdAt: formatDate(log.createdAt),
        createdBy: log.createdBy,
        lastRunTime: formatDate(log.lastRunTime),
        runNumber: log.runNumber
      }
    })

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

// 处理主机选择
function handleHostsSelected(selectedHosts) {
  hosts.value = selectedHosts
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-')
}
</script>

<style scoped lang="scss">
.command-console {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.console-header {
  border-bottom: 1px solid #dee2e6;

  .navbar {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #f8f9fa;
    margin: 0;
  }

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #212529;
  }
}

.console-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  position: relative;
}

.history-btn-wrapper {
  position: absolute;
  top: 16px;
  right: 16px;
}

.form-group {
  margin-bottom: 16px;

  .control-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #212529;
    font-size: 14px;
  }
}

.host-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.host-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.grammar-select {
  width: 240px;
}

.code-editor {
  display: flex;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
  height: 30rem;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.host-input-dialog {
  display: flex;
  gap: 12px;

  .el-input {
    flex: 1;
  }
}

.text-ellipsis {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100px;
}

:deep(.el-button) {
  border-radius: 4px;
}

:deep(.el-input__wrapper) {
  border-radius: 4px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid #dee2e6;
  padding: 16px 20px;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #dee2e6;
  padding: 12px 20px;
}
</style>
