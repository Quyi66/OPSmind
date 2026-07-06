<template>
  <div class="ansible-log-viewer">
    <!-- 工具栏 -->
    <div class="log-toolbar">
      <div class="log-toolbar-left">
        <!-- 自动滚动切换 -->
        <el-tooltip content="自动滚动到底部" placement="top">
          <el-button
            size="small"
            :type="autoScroll ? 'primary' : 'default'"
            @click="toggleAutoScroll"
          >
            <i class="fa fa-arrows-alt-v" />
          </el-button>
        </el-tooltip>
        <!-- 下载按钮 -->
        <el-tooltip content="下载原始输出" placement="top">
          <el-button size="small" :disabled="!logContent" @click="handleDownload">
            <i class="fa fa-file-download" />
          </el-button>
        </el-tooltip>
        <!-- 批次切换按钮组 -->
        <el-button-group v-if="batchList.length > 1">
          <el-button
            v-for="batch in batchList"
            :key="batch"
            size="small"
            :type="activeBatch === batch ? 'primary' : 'default'"
            @click="switchBatch(batch)"
          >
            {{ batch }}
          </el-button>
        </el-button-group>
      </div>
      <div class="log-toolbar-right">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索目标 (Enter搜索)"
          clearable
          class="log-search-input"
          @keyup.enter="handleSearch"
          @clear="clearSearch"
        >
          <template #suffix>
            <div class="search-nav" v-if="searchMatches.length > 0">
              <span class="search-count">
                {{ searchCurrentIndex + 1 }}/{{ searchMatches.length }}
              </span>
              <el-button size="small" text @click="navigateSearch(-1)">
                <i class="fa fa-chevron-up" />
              </el-button>
              <el-button size="small" text @click="navigateSearch(1)">
                <i class="fa fa-chevron-down" />
              </el-button>
            </div>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 日志内容区域 -->
    <div class="log-container" ref="logContainerRef">
      <div class="log-content" ref="logContentRef">
        <!-- 虚拟滚动区域 -->
        <div class="log-virtual-spacer" :style="{ height: `${virtualSpacerHeight}px` }" />
        <div class="log-visible-lines" :style="{ transform: `translateY(${virtualOffset}px)` }">
          <div
            v-for="(line, index) in visibleLines"
            :key="startLineIndex + index"
            class="log-line"
            :class="getLineClass(line)"
            :data-line="startLineIndex + index + 1"
          >
            <span class="line-number">{{ startLineIndex + index + 1 }}</span>
            <span class="line-content" v-html="highlightLine(line, startLineIndex + index)"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 连接状态 -->
    <div v-if="wsStatus !== 'closed'" class="log-status">
      <span v-if="wsStatus === 'connecting'" class="status-connecting">
        <i class="fa fa-spinner fa-spin" />
        连接中...
      </span>
      <span v-else-if="wsStatus === 'connected'" class="status-connected">
        <i class="fa fa-circle" />
        实时日志
      </span>
      <span v-else-if="wsStatus === 'error'" class="status-error">
        <i class="fa fa-exclamation-triangle" />
        连接失败
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { authService } from '@/core/auth'

const props = defineProps({
  runId: { type: String, default: '' },
  content: { type: String, default: '' },
  active: { type: Boolean, default: false } // 是否激活状态，用于控制 WebSocket 连接
})

const emit = defineEmits(['loaded'])

// 状态
const autoScroll = ref(true)
const activeBatch = ref('default')
const batchData = ref({})
const batchList = ref([])
const wsStatus = ref('closed')
const searchKeyword = ref('')
const searchMatches = ref([])
const searchCurrentIndex = ref(0)
const logContainerRef = ref(null)
const logContentRef = ref(null)

// 虚拟滚动相关
const LINE_HEIGHT = 20
const BUFFER_LINES = 10
const scrollTop = ref(0)
const containerHeight = ref(500)
let programmaticScroll = false // 标记是否为程序化滚动

// WebSocket 实例
let websocket = null

// 计算日志内容
const logContent = computed(() => {
  if (props.content) {
    return props.content
  }
  const batch = batchData.value[activeBatch.value]
  return batch?.content || ''
})

// 分割成行
const logLines = computed(() => {
  if (!logContent.value) return []
  return logContent.value.split('\n')
})

// 虚拟滚动计算
const totalHeight = computed(() => logLines.value.length * LINE_HEIGHT)
const virtualSpacerHeight = computed(() => totalHeight.value)
const startLineIndex = computed(() => {
  const start = Math.floor(scrollTop.value / LINE_HEIGHT) - BUFFER_LINES
  return Math.max(0, start)
})
const endLineIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / LINE_HEIGHT)
  const end = startLineIndex.value + visibleCount + BUFFER_LINES * 2
  return Math.min(logLines.value.length, end)
})
const visibleLines = computed(() => {
  return logLines.value.slice(startLineIndex.value, endLineIndex.value)
})
const virtualOffset = computed(() => startLineIndex.value * LINE_HEIGHT)

// 获取 WebSocket URL
function getWebsocketUrl(runId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host === 'localhost:5173' ? '192.168.1.200' : host}/sjxy-ws/log/${runId}`
}

// 连接 WebSocket
function connectWebsocket() {
  if (!props.runId || websocket) return

  wsStatus.value = 'connecting'
  const url = getWebsocketUrl(props.runId)

  try {
    websocket = new WebSocket(url)

    websocket.onopen = () => {
      wsStatus.value = 'connected'
    }

    websocket.onmessage = event => {
      try {
        const data = JSON.parse(event.data)
        const batchId = data.batchId || 'default'
        const message = data.message || ''

        // 初始化批次
        if (!batchData.value[batchId]) {
          batchData.value[batchId] = { content: '' }
          batchList.value = Object.keys(batchData.value)
          if (batchList.value.length === 1) {
            activeBatch.value = batchId
          }
        }

        // 追加消息
        batchData.value[batchId].content += message

        // 自动滚动到底部
        if (autoScroll.value) {
          scrollToBottom()
        }
      } catch (e) {
        // 非 JSON 格式，直接作为消息处理
        if (!batchData.value['default']) {
          batchData.value['default'] = { content: '' }
          batchList.value = ['default']
        }
        batchData.value['default'].content += event.data
        if (autoScroll.value) {
          scrollToBottom()
        }
      }
    }

    websocket.onerror = error => {
      console.error('WebSocket error:', error)
      wsStatus.value = 'error'
    }

    websocket.onclose = () => {
      wsStatus.value = 'closed'
      websocket = null
    }
  } catch (error) {
    console.error('Failed to connect WebSocket:', error)
    wsStatus.value = 'error'
  }
}

// 关闭 WebSocket
function closeWebsocket() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.close()
  }
  websocket = null
}

// 切换自动滚动
function toggleAutoScroll() {
  autoScroll.value = !autoScroll.value
  if (autoScroll.value) {
    scrollToBottom()
  }
}

// 切换批次
function switchBatch(batchId) {
  if (activeBatch.value !== batchId) {
    activeBatch.value = batchId
    nextTick(() => {
      if (autoScroll.value) {
        scrollToBottom()
      }
    })
  }
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    const container = logContainerRef.value
    if (!container) return

    // 标记为程序化滚动，避免触发 autoScroll = false
    programmaticScroll = true
    const targetScrollTop =
      Math.max(container.scrollHeight, totalHeight.value) - containerHeight.value
    container.scrollTop = Math.max(0, targetScrollTop)

    // 延迟重置标志
    setTimeout(() => {
      programmaticScroll = false
    }, 100)
  })
}

// 处理滚动
function handleScroll(event) {
  scrollTop.value = event.target.scrollTop

  // 如果是程序化滚动，不处理自动滚动状态
  if (programmaticScroll) return

  // 检测是否在底部 - 只有用户手动向上滚动时才关闭自动滚动
  const container = logContainerRef.value
  if (!container) return
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
  if (!isAtBottom && autoScroll.value) {
    autoScroll.value = false
  }
}

// 下载日志
async function handleDownload() {
  if (!logContent.value) return

  try {
    const blob = new Blob([logContent.value], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ansible-log-${props.runId || Date.now()}.log`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

// 搜索相关
function handleSearch() {
  if (!searchKeyword.value.trim()) {
    clearSearch()
    return
  }

  const keyword = searchKeyword.value.toLowerCase()
  const matches = []

  logLines.value.forEach((line, index) => {
    if (line.toLowerCase().includes(keyword)) {
      matches.push(index)
    }
  })

  searchMatches.value = matches
  searchCurrentIndex.value = matches.length > 0 ? 0 : -1

  if (matches.length > 0) {
    scrollToLine(matches[0])
  }
}

function navigateSearch(direction) {
  if (searchMatches.value.length === 0) return

  let newIndex = searchCurrentIndex.value + direction
  if (newIndex < 0) newIndex = searchMatches.value.length - 1
  if (newIndex >= searchMatches.value.length) newIndex = 0

  searchCurrentIndex.value = newIndex
  scrollToLine(searchMatches.value[newIndex])
}

function clearSearch() {
  searchMatches.value = []
  searchCurrentIndex.value = -1
}

function scrollToLine(lineIndex) {
  if (!logContainerRef.value) return
  const targetTop = lineIndex * LINE_HEIGHT
  logContainerRef.value.scrollTop = targetTop - containerHeight.value / 2
}

// 高亮行内容
function highlightLine(line, lineIndex) {
  // Ansible 日志语法高亮
  let html = escapeHtml(line)

  // 高亮 TASK 行
  if (line.match(/^TASK\s*\[/)) {
    html = `<span class="hl-task">${html}</span>`
  }
  // 高亮 PLAY 行
  else if (line.match(/^PLAY\s*\[/) || line.match(/^PLAY RECAP/)) {
    html = `<span class="hl-play">${html}</span>`
  }
  // 高亮 ok: 行
  else if (line.match(/^ok:\s*\[/)) {
    html = `<span class="hl-ok">${html}</span>`
  }
  // 高亮 changed: 行
  else if (line.match(/^changed:\s*\[/)) {
    html = `<span class="hl-changed">${html}</span>`
  }
  // 高亮 failed: 行
  else if (line.match(/^fatal:\s*\[/) || line.match(/^failed:\s*\[/)) {
    html = `<span class="hl-failed">${html}</span>`
  }
  // 高亮 skipping: 行
  else if (line.match(/^skipping:\s*\[/)) {
    html = `<span class="hl-skipped">${html}</span>`
  }
  // 高亮 unreachable 行
  else if (line.match(/^unreachable:\s*\[/)) {
    html = `<span class="hl-unreachable">${html}</span>`
  }

  // 搜索关键词高亮
  if (searchKeyword.value && searchMatches.value.includes(lineIndex)) {
    const keyword = escapeHtml(searchKeyword.value)
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
    html = html.replace(regex, '<mark class="search-highlight">$1</mark>')
  }

  return html
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getLineClass(line) {
  if (line.match(/^TASK\s*\[/) || line.match(/^PLAY\s*\[/)) return 'is-header'
  if (line.match(/^ok:\s*\[/)) return 'is-ok'
  if (line.match(/^changed:\s*\[/)) return 'is-changed'
  if (line.match(/^fatal:\s*\[/) || line.match(/^failed:\s*\[/)) return 'is-failed'
  if (line.match(/^skipping:\s*\[/)) return 'is-skipped'
  return ''
}

// 初始化容器尺寸监听
function initResizeObserver() {
  if (!logContainerRef.value) return

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      containerHeight.value = entry.contentRect.height
    }
  })

  resizeObserver.observe(logContainerRef.value)

  return () => resizeObserver.disconnect()
}

// 监听 runId 变化
watch(
  () => props.runId,
  (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
      // 清空旧数据
      batchData.value = {}
      batchList.value = []
      activeBatch.value = 'default'
      closeWebsocket()
      // 只有在激活状态时才连接
      if (props.active) {
        connectWebsocket()
      }
    }
  }
)

// 监听 active 变化 - 切换到 output tab 时才建立连接
watch(
  () => props.active,
  isActive => {
    if (isActive && props.runId) {
      // 激活时，如果有 runId 且未连接，则建立连接
      if (!websocket) {
        connectWebsocket()
      }
    } else {
      // 非激活时关闭连接
      closeWebsocket()
    }
  },
  { immediate: true }
)

// 监听静态 content
watch(
  () => props.content,
  newVal => {
    if (newVal) {
      batchData.value = { default: { content: newVal } }
      batchList.value = ['default']
      activeBatch.value = 'default'
      // 自动滚动到底部
      if (autoScroll.value) {
        scrollToBottom()
      }
    }
  },
  { immediate: true }
)

let cleanupResize = null

onMounted(() => {
  if (logContainerRef.value) {
    logContainerRef.value.addEventListener('scroll', handleScroll)
    cleanupResize = initResizeObserver()
    containerHeight.value = logContainerRef.value.clientHeight
  }
})

onUnmounted(() => {
  closeWebsocket()
  if (logContainerRef.value) {
    logContainerRef.value.removeEventListener('scroll', handleScroll)
  }
  if (cleanupResize) cleanupResize()
})
</script>

<style scoped lang="scss">
.ansible-log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
}

.log-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.log-toolbar-left,
.log-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-search-input {
  width: 260px;

  :deep(.el-input__wrapper) {
    background: #3c3c3c;
    box-shadow: none;

    .el-input__inner {
      color: #f2f2f2;

      &::placeholder {
        color: #808080;
      }
    }
  }
}

.search-nav {
  display: flex;
  align-items: center;
  gap: 0;
  color: #808080;
  font-size: 12px;

  .el-button {
    padding: 0 8px !important;
    margin: 0;
    min-width: auto;
    height: 20px;
  }
}

.search-count {
  margin-right: 2px;
  white-space: nowrap;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;

  // 自定义滚动条样式 - 更容易辨认
  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
    border-left: 1px solid #3c3c3c;
  }

  &::-webkit-scrollbar-thumb {
    background: #5a5a5a;
    border-radius: 6px;
    border: 2px solid #1e1e1e;

    &:hover {
      background: #787878;
    }

    &:active {
      background: #999999;
    }
  }
}

.log-content {
  position: relative;
  min-height: 100%;
}

.log-virtual-spacer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.log-visible-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.log-line {
  display: flex;
  font-family: 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 20px;
  height: 20px;
  color: #d4d4d4;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
}

.line-number {
  flex-shrink: 0;
  width: 50px;
  padding: 0 8px;
  text-align: right;
  color: #858585;
  background: #252526;
  user-select: none;
  border-right: 1px solid #3c3c3c;
}

.line-content {
  flex: 1;
  padding: 0 12px;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Ansible 日志语法高亮
:deep(.hl-task) {
  color: #569cd6;
  font-weight: 500;
}

:deep(.hl-play) {
  color: #c586c0;
  font-weight: 600;
}

:deep(.hl-ok) {
  color: #4ec9b0;
}

:deep(.hl-changed) {
  color: #dcdcaa;
}

:deep(.hl-failed) {
  color: #f14c4c;
}

:deep(.hl-skipped) {
  color: #569cd6;
}

:deep(.hl-unreachable) {
  color: #f14c4c;
  font-weight: 500;
}

:deep(.search-highlight) {
  background: #ffcc00;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
}

.log-status {
  padding: 4px 12px;
  font-size: 12px;
  background: #252526;
  border-top: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.status-connecting {
  color: #dcdcaa;
}

.status-connected {
  color: #4ec9b0;

  .fa-circle {
    font-size: 8px;
    margin-right: 4px;
  }
}

.status-error {
  color: #f14c4c;
}
</style>
