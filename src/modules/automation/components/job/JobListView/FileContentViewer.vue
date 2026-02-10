<template>
  <div class="file-content-viewer">
    <!-- 工具栏 -->
    <div class="content-toolbar" v-if="showExtraInfo">
      <!-- 视图切换按钮 -->
      <el-button
        v-if="hasRenderView"
        class="toolbar-icon-btn"
        circle
        @click="toggleViewMode"
        :title="viewMode === 'raw' ? '切换到渲染视图' : '切换到代码视图'"
      >
        <i :class="viewMode === 'raw' ? 'fa fa-file-alt' : 'fa fa-code'"></i>
      </el-button>

      <div class="toolbar-spacer"></div>

      <!-- 文件信息 -->
      <span class="file-info">
        <span class="info-item" v-if="fileInfo?.lastModified">{{ formatRelativeTime(fileInfo.lastModified) }}</span>
        <span class="info-item" v-if="fileInfo?.size">{{ formatFileSize(fileInfo.size) }}</span>
      </span>

      <!-- 操作按钮（平铺） -->
      <el-button class="toolbar-icon-btn" circle @click="downloadFile" title="下载">
        <i class="fa fa-download"></i>
      </el-button>
      <el-button class="toolbar-icon-btn" circle @click="editFileInfo" title="修改信息">
        <i class="fa fa-edit"></i>
      </el-button>
      <el-button class="toolbar-icon-btn" circle @click="copyLink" title="复制链接">
        <i class="fa fa-copy"></i>
      </el-button>
    </div>

    <!-- 内容区域 -->
    <div class="content-area" v-loading="loading">
      <!-- 渲染视图 -->
      <template v-if="viewMode === 'render'">
        <!-- 图片 -->
        <div v-if="renderType === 'image'" class="render-image">
          <el-image
            :src="fileUrl"
            :alt="fileName"
            :preview-src-list="[fileUrl]"
            fit="contain"
            :z-index="9999"
          >
            <template #error>
              <div class="image-error">
                <i class="fa fa-image fa-3x"></i>
                <p>图片加载失败</p>
                <el-button type="primary" size="small" @click="downloadFile">下载查看</el-button>
              </div>
            </template>
            <template #placeholder>
              <div class="image-loading">
                <i class="el-icon-loading"></i>
                <span>加载中...</span>
              </div>
            </template>
          </el-image>
        </div>

        <!-- Markdown -->
        <div v-else-if="renderType === 'markdown'" class="render-markdown" v-html="renderedMarkdown"></div>

        <!-- HTML -->
        <div v-else-if="renderType === 'html'" class="render-html">
          <iframe ref="htmlFrame" class="html-frame"></iframe>
        </div>

        <!-- Excel/CSV 表格 -->
        <div v-else-if="renderType === 'excel'" class="render-excel">
          <div v-if="excelSheets.length > 1" class="excel-sheet-tabs">
            <el-tabs v-model="activeSheet" type="card" @tab-change="onSheetChange">
              <el-tab-pane
                v-for="sheet in excelSheets"
                :key="sheet.name"
                :label="sheet.name"
                :name="sheet.name"
              />
            </el-tabs>
          </div>
          <div class="excel-table-container">
            <table class="excel-table" v-if="excelData.length">
              <thead>
                <tr>
                  <th v-for="(col, colIndex) in excelData[0]" :key="colIndex">
                    {{ getColumnLabel(colIndex) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in excelData" :key="rowIndex">
                  <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                    {{ cell ?? '' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="excel-empty">
              <i class="fa fa-table fa-2x"></i>
              <p>表格为空</p>
            </div>
          </div>
        </div>

        <!-- PDF -->
        <div v-else-if="renderType === 'pdf'" class="render-pdf">
          <iframe :src="fileUrl" class="pdf-frame" type="application/pdf"></iframe>
        </div>

        <!-- 视频 -->
        <div v-else-if="renderType === 'video'" class="render-video">
          <video controls :src="fileUrl" class="video-player">
            您的浏览器不支持视频播放
          </video>
        </div>

        <!-- 音频 -->
        <div v-else-if="renderType === 'audio'" class="render-audio">
          <audio controls :src="fileUrl" class="audio-player">
            您的浏览器不支持音频播放
          </audio>
        </div>

        <!-- Word 文档 -->
        <div v-else-if="renderType === 'word'" class="render-word">
          <div class="word-content" v-html="wordContent"></div>
        </div>
      </template>

      <!-- 代码视图 -->
      <div v-show="viewMode === 'raw' && canShowCode" class="code-viewer">
        <codemirror
          v-model="content"
          :style="{ height: contentHeight }"
          :autofocus="false"
          :indent-with-tab="true"
          :tab-size="2"
          :extensions="cmExtensions"
          :disabled="true"
        />
      </div>

      <!-- 无法预览 -->
      <div v-if="!canPreview && !loading" class="no-preview">
        <i class="fa fa-file fa-3x"></i>
        <p>该文件类型不支持预览</p>
        <p class="hint">文件类型：{{ fileInfo?.mime || fileExtension || '未知' }}</p>
        <el-button type="primary" @click="downloadFile">下载文件</el-button>
      </div>
    </div>

    <!-- 修改信息弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改文件"
      width="800px"
      destroy-on-close
      :close-on-click-modal="false"
      append-to-body
      class="file-edit-dialog"
    >
      <el-tabs v-model="editActiveTab">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="editForm" label-width="100px" label-position="top">
            <!-- 文件路径 -->
            <el-form-item label="文件路径">
              <div class="file-path-display">
                <span class="file-dir">{{ fileDir || '~' }}</span>
                <span class="file-separator">&nbsp;&nbsp;/&nbsp;&nbsp;</span>
                <strong class="file-name">{{ fileName }}</strong>
              </div>
            </el-form-item>

            <!-- 参数配置 -->
            <el-form-item>
              <template #label>
                <span>参数配置</span>
                <el-tooltip content="如果文件支持配置（例如命令行执行参数），可以在这里填写" placement="top">
                  <i class="fa fa-question-circle text-muted" style="margin-left: 4px;"></i>
                </el-tooltip>
              </template>
              <el-input
                v-model="editForm.config"
                class="config-input"
                placeholder="例如: --help 或 -v"
              />
            </el-form-item>

            <!-- 说明 -->
            <el-form-item>
              <template #label>
                <span>说明</span>
                <el-tooltip content="可以在这里填写文件的用途、目的、使用方法等描述信息，便于使用者理解这个文件" placement="top">
                  <i class="fa fa-question-circle text-muted" style="margin-left: 4px;"></i>
                </el-tooltip>
              </template>
              <el-input
                v-model="editForm.description"
                type="textarea"
                :rows="4"
                placeholder="请输入文件说明..."
                resize="none"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 脚本内容标签页 -->
        <el-tab-pane label="脚本内容" name="content">
          <div v-if="!isFileContentEditable" class="content-warning">
            <el-alert type="warning" :closable="false" show-icon>
              该文件不支持编辑。
            </el-alert>
          </div>
          <div class="content-editor" v-if="editActiveTab === 'content' && isFileContentEditable">
            <codemirror
              v-model="editForm.scriptContent"
              :style="{ height: '350px' }"
              :autofocus="false"
              :indent-with-tab="true"
              :tab-size="2"
              :extensions="editCmExtensions"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveFileInfo" :loading="saving">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, shallowRef, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

// 动态导入 Codemirror 组件 - 真正按需加载
const Codemirror = defineAsyncComponent(() =>
  import('vue-codemirror').then(m => m.Codemirror)
)

// CodeMirror 相关模块 - 延迟加载
let codemirrorModules = null
async function loadCodemirrorModules() {
  if (codemirrorModules) return codemirrorModules
  const [
    { javascript },
    { python },
    { json },
    { xml },
    { yaml },
    { markdown },
    { html },
    { css },
    { sql },
    { oneDark },
    { EditorView }
  ] = await Promise.all([
    import('@codemirror/lang-javascript'),
    import('@codemirror/lang-python'),
    import('@codemirror/lang-json'),
    import('@codemirror/lang-xml'),
    import('@codemirror/lang-yaml'),
    import('@codemirror/lang-markdown'),
    import('@codemirror/lang-html'),
    import('@codemirror/lang-css'),
    import('@codemirror/lang-sql'),
    import('@codemirror/theme-one-dark'),
    import('@codemirror/view')
  ])
  codemirrorModules = { javascript, python, json, xml, yaml, markdown, html, css, sql, oneDark, EditorView }
  return codemirrorModules
}

// xlsx 和 mammoth - 延迟加载
let XLSX = null
let mammoth = null
async function loadXLSX() {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}
async function loadMammoth() {
  if (!mammoth) {
    const m = await import('mammoth')
    mammoth = m.default || m
  }
  return mammoth
}

const props = defineProps({
  path: {
    type: String,
    required: true
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: null
  },
  showExtraInfo: {
    type: Boolean,
    default: true
  },
  height: {
    type: String,
    default: '400px'
  }
})

const emit = defineEmits(['loaded', 'error'])

const loading = ref(true)
const content = ref('')
const fileInfo = ref(null)
const viewMode = ref('raw')  // 'raw' | 'render'

// Excel 相关
const excelSheets = ref([])
const excelData = ref([])
const activeSheet = ref('')
const excelWorkbook = ref(null)

// Word 相关
const wordContent = ref('')

const renderType = ref('')    // 'image' | 'markdown' | 'html' | 'excel' | 'pdf' | 'video' | 'audio' | 'word' | ''
const htmlFrame = ref(null)

// 编辑相关
const editDialogVisible = ref(false)
const editActiveTab = ref('basic')
const saving = ref(false)
const isEditingContent = ref(false)
const editForm = ref({
  description: '',
  config: '',
  scriptContent: ''
})

// 文件信息
const fileName = computed(() => props.path?.split('/').pop() || '')
const fileDir = computed(() => {
  const parts = props.path?.split('/') || []
  parts.pop() // 移除文件名
  return parts.join('/') || ''
})
const fileExtension = computed(() => fileName.value.split('.').pop()?.toLowerCase() || '')
// 优先使用 API 返回的 downloadUri，确保路径正确
const fileUrl = computed(() => {
  const downloadUri = fileInfo.value?.fileContent?.downloadUri
  if (downloadUri) {
    // 源系统 URL 格式：/gfs/api/gfs/v2/...
    // API 返回的 downloadUri 格式：/api/gfs/v2/...
    // 需要将 /api 替换为 /gfs/api
    if (downloadUri.startsWith('/api/')) {
      return `/oplus-portal/gfs${downloadUri}`
    }
    return downloadUri
  }
  // 降级使用生成的URL
  return gfsApi.getFileDownloadUrl(props.repoType, fileInfo.value?.repo || props.repo, props.path)
})
const contentHeight = computed(() => props.height)

// 是否有渲染视图
const hasRenderView = computed(() => !!renderType.value)

// 是否可以预览
const canPreview = computed(() => {
  if (!fileInfo.value) return true // 加载中
  const mime = fileInfo.value.fileContent?.mime || fileInfo.value.mime || ''
  const ext = fileExtension.value

  // 支持文本类型
  if (mime.startsWith('text/') ||
      mime.includes('json') ||
      mime.includes('xml') ||
      mime.includes('yaml') ||
      mime.includes('javascript') ||
      mime.includes('x-sh') ||
      mime.includes('markdown')) {
    return true
  }

  // 支持图片
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    return true
  }

  // 支持 Excel/CSV
  if (mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('csv') ||
      ['xlsx', 'xls', 'csv'].includes(ext)) {
    return true
  }

  // 支持 PDF
  if (mime === 'application/pdf' || ext === 'pdf') {
    return true
  }

  // 支持视频
  if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) {
    return true
  }

  // 支持音频
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) {
    return true
  }

  // 支持 Word 文档
  if (mime.includes('wordprocessingml') ||
      mime.includes('msword') ||
      ['doc', 'docx'].includes(ext)) {
    return true
  }

  return false
})

// 是否可以显示代码视图（某些二进制文件无法显示源码）
const canShowCode = computed(() => {
  const binaryTypes = ['image', 'pdf', 'excel', 'video', 'audio', 'word']
  return !binaryTypes.includes(renderType.value)
})

// 是否可编辑文件内容
const isFileContentEditable = computed(() => {
  const mime = fileInfo.value?.fileContent?.mime || fileInfo.value?.mime || ''
  const supportMimes = [/^text\/.*/, /^application\/x-sh$/, /^application\/json$/, /^application\/octet-stream$/]
  return supportMimes.some(pattern => mime.match(pattern))
})

// CodeMirror 扩展 - 使用响应式引用存储动态加载的扩展
const cmExtensions = shallowRef([])
const editCmExtensions = shallowRef([])
const cmModulesLoaded = ref(false)

// 加载 CodeMirror 扩展
async function loadCmExtensions() {
  if (cmModulesLoaded.value) return

  try {
    const modules = await loadCodemirrorModules()
    const { javascript, python, json, xml, yaml, markdown, html, css, sql, oneDark, EditorView } = modules

    // 构建只读扩展
    const baseExtensions = [
      oneDark,
      EditorView.lineWrapping,
      EditorView.editable.of(false)
    ]

    // 构建可编辑扩展
    const editBaseExtensions = [
      oneDark,
      EditorView.lineWrapping
    ]

    // 根据文件扩展名添加语言支持
    const langMap = {
      js: javascript(),
      jsx: javascript({ jsx: true }),
      ts: javascript({ typescript: true }),
      tsx: javascript({ jsx: true, typescript: true }),
      py: python(),
      json: json(),
      xml: xml(),
      yml: yaml(),
      yaml: yaml(),
      md: markdown(),
      html: html(),
      htm: html(),
      vue: html(),
      css: css(),
      scss: css(),
      less: css(),
      sql: sql(),
      sh: javascript() // shell 使用简单高亮
    }

    const lang = langMap[fileExtension.value]
    if (lang) {
      baseExtensions.push(lang)
      editBaseExtensions.push(lang)
    }

    cmExtensions.value = baseExtensions
    editCmExtensions.value = editBaseExtensions
    cmModulesLoaded.value = true
  } catch (error) {
    console.error('Failed to load CodeMirror modules:', error)
  }
}

// 渲染后的 Markdown
const renderedMarkdown = computed(() => {
  if (renderType.value !== 'markdown') return ''
  // 简单的 Markdown 渲染（可以后续集成更完整的库）
  return content.value
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/```[\s\S]*?```/gim, (match) => {
      const code = match.replace(/```\w*\n?/g, '').replace(/```$/g, '')
      return `<pre><code>${code}</code></pre>`
    })
    .replace(/\n/gim, '<br>')
})

/**
 * 加载文件内容
 */
async function loadContent() {
  loading.value = true
  try {
    const response = await gfsApi.getFileInfo(props.repoType, props.repo, props.path, true)
    const data = response?.data || response

    // 保存完整的 fileInfo（包含嵌套的 fileContent）
    fileInfo.value = data

    // 提取文件内容用于显示
    if (data.fileContent) {
      if (typeof data.fileContent === 'object') {
        content.value = data.fileContent.content || JSON.stringify(data.fileContent, null, 2)
      } else {
        content.value = data.fileContent
      }
    } else if (data.content) {
      content.value = data.content
    } else {
      content.value = '(无法加载文件内容)'
    }

    // 检测渲染类型
    detectRenderType()

    // 延迟加载 CodeMirror 模块（仅在需要代码视图时）
    if (canShowCode.value) {
      loadCmExtensions()
    }

    emit('loaded', fileInfo.value)
  } catch (error) {
    console.error('Failed to load file content:', error)
    content.value = '加载文件内容失败: ' + (error.message || '未知错误')
    emit('error', error)
  } finally {
    loading.value = false
  }
}

/**
 * 检测渲染类型
 */
function detectRenderType() {
  const mime = fileInfo.value?.fileContent?.mime || fileInfo.value?.mime || ''
  const ext = fileExtension.value

  // 图片
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext)) {
    renderType.value = 'image'
    viewMode.value = 'render'
  }
  // Excel/CSV
  else if (mime.includes('spreadsheet') ||
           mime.includes('excel') ||
           mime.includes('csv') ||
           ['xlsx', 'xls', 'csv'].includes(ext)) {
    renderType.value = 'excel'
    viewMode.value = 'render'
    loadExcelFile()
  }
  // PDF
  else if (mime === 'application/pdf' || ext === 'pdf') {
    renderType.value = 'pdf'
    viewMode.value = 'render'
  }
  // 视频
  else if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) {
    renderType.value = 'video'
    viewMode.value = 'render'
  }
  // 音频
  else if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(ext)) {
    renderType.value = 'audio'
    viewMode.value = 'render'
  }
  // Word 文档
  else if (mime.includes('wordprocessingml') ||
           mime.includes('msword') ||
           ['doc', 'docx'].includes(ext)) {
    renderType.value = 'word'
    viewMode.value = 'render'
    loadWordFile()
  }
  // Markdown
  else if (mime.includes('markdown') || ext === 'md') {
    renderType.value = 'markdown'
    viewMode.value = 'raw' // 默认显示代码
  }
  // HTML
  else if (mime.includes('html') || ext === 'html' || ext === 'htm') {
    renderType.value = 'html'
    viewMode.value = 'raw' // 默认显示代码
    nextTick(() => {
      if (htmlFrame.value) {
        const doc = htmlFrame.value.contentWindow?.document
        if (doc) {
          doc.open()
          doc.write(content.value)
          doc.close()
        }
      }
    })
  }
  // 其他
  else {
    renderType.value = ''
    viewMode.value = 'raw'
  }
}

/**
 * 加载 Excel 文件
 */
async function loadExcelFile() {
  try {
    const ext = fileExtension.value

    // CSV 文件直接解析文本内容
    if (ext === 'csv') {
      parseCSV(content.value)
      return
    }

    // 动态加载 xlsx 库
    const xlsxModule = await loadXLSX()

    // Excel 文件需要下载二进制数据
    const response = await fetch(fileUrl.value)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = xlsxModule.read(arrayBuffer, { type: 'array' })

    excelWorkbook.value = workbook
    excelSheets.value = workbook.SheetNames.map(name => ({ name }))

    if (excelSheets.value.length > 0) {
      activeSheet.value = excelSheets.value[0].name
      loadSheetData(activeSheet.value)
    }
  } catch (error) {
    console.error('Failed to load Excel file:', error)
    ElMessage.error('Excel 文件加载失败')
  }
}

/**
 * 解析 CSV 内容
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const data = lines.map(line => {
    // 处理 CSV 中的引号和逗号
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })

  excelData.value = data
  excelSheets.value = [{ name: 'Sheet1' }]
  activeSheet.value = 'Sheet1'
}

/**
 * 加载 Sheet 数据
 */
async function loadSheetData(sheetName) {
  if (!excelWorkbook.value) return

  const worksheet = excelWorkbook.value.Sheets[sheetName]
  if (!worksheet) return

  // 动态加载 xlsx 库
  const xlsxModule = await loadXLSX()
  const data = xlsxModule.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  // 限制显示的数据量（最多 1000 行）
  excelData.value = data.slice(0, 1000)
}

/**
 * Sheet 切换事件
 */
function onSheetChange(sheetName) {
  loadSheetData(sheetName)
}

/**
 * 获取列标签（A, B, C...）
 */
function getColumnLabel(index) {
  let label = ''
  let num = index
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label
    num = Math.floor(num / 26) - 1
  }
  return label
}

/**
 * 加载 Word 文件
 */
async function loadWordFile() {
  try {
    const ext = fileExtension.value

    // 仅支持 docx 格式，doc 格式需要服务端转换
    if (ext === 'doc') {
      wordContent.value = '<div class="word-notice"><p>暂不支持 .doc 格式预览，请下载后查看或转换为 .docx 格式</p></div>'
      return
    }

    // 下载 docx 文件
    const response = await fetch(fileUrl.value)
    const arrayBuffer = await response.arrayBuffer()

    // 动态加载 mammoth 并转换为 HTML
    const mammothModule = await loadMammoth()
    const result = await mammothModule.convertToHtml({ arrayBuffer })
    wordContent.value = result.value

    // 如果有警告信息，在控制台输出
    if (result.messages.length > 0) {
      console.warn('Word 文档转换警告:', result.messages)
    }
  } catch (error) {
    console.error('Failed to load Word file:', error)
    ElMessage.error('Word 文档加载失败')
    wordContent.value = '<div class="word-error"><p>Word 文档加载失败，请尝试下载后查看</p></div>'
  }
}

/**
 * 切换视图模式
 */
function toggleViewMode() {
  viewMode.value = viewMode.value === 'raw' ? 'render' : 'raw'
}

/**
 * 下载文件
 */
function downloadFile() {
  const repo = fileInfo.value?.repo || props.repo
  if (props.repoType === 'staticfs') {
    gfsApi.downloadFiles(props.repoType, repo, [props.path], fileName.value)
    return
  }
  gfsApi.downloadFile(props.repoType, repo, props.path, fileName.value)
}

/**
 * 复制链接
 */
async function copyLink() {
  try {
    await navigator.clipboard.writeText(fileUrl.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

/**
 * 打开修改信息弹窗
 */
function editFileInfo() {
  editActiveTab.value = 'basic'
  // 直接进入编辑模式
  isEditingContent.value = true
  editForm.value = {
    description: fileInfo.value?.description || '',
    config: fileInfo.value?.config || '',
    scriptContent: content.value || ''
  }
  editDialogVisible.value = true
}

/**
 * 保存文件信息
 * 参照源系统 gfile-edit.controller.js saveClose 函数
 * 传递完整的 fileInfo 对象
 */
async function saveFileInfo() {
  saving.value = true
  try {
    // 复制完整的 fileInfo 对象
    const updateData = { ...fileInfo.value }

    // 更新用户编辑的字段
    updateData.description = editForm.value.description
    updateData.config = editForm.value.config

    // 设置是否编辑了内容
    updateData.isContent = isEditingContent.value

    // 如果编辑了内容，设置 scriptContent
    if (isEditingContent.value) {
      updateData.scriptContent = editForm.value.scriptContent
    }

    await gfsApi.updateFileInfo(props.repoType, fileInfo.value?.repo, props.path, updateData)
    ElMessage.success('保存成功')
    editDialogVisible.value = false
    // 重新加载文件信息
    loadContent()
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(size) {
  if (!size || size < 0) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return date.toLocaleDateString('zh-CN')
  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
}

// 监听 path 变化重新加载
watch(() => props.path, () => {
  if (props.path) {
    loadContent()
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
.file-content-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.content-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  gap: 8px;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-icon-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  padding: 0 !important;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .info-item {
    white-space: nowrap;
  }
}

.content-area {
  flex: 1;
  overflow: auto;
  min-height: 200px;
}

.code-viewer {
  height: 100%;

  :deep(.cm-editor) {
    height: 100%;
  }

  :deep(.cm-scroller) {
    overflow: auto;
  }
}

// 图片预览
.render-image {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 200px;

  :deep(.el-image) {
    max-width: 100%;
    max-height: 500px;
  }

  :deep(.el-image__inner) {
    max-width: 100%;
    max-height: 500px;
    object-fit: contain;
  }

  .image-error,
  .image-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: var(--el-text-color-secondary);

    i {
      margin-bottom: 12px;
      color: var(--el-text-color-placeholder);
    }

    p {
      margin-bottom: 12px;
    }
  }
}

// Markdown 预览
.render-markdown {
  padding: 20px;
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  code {
    background-color: var(--el-fill-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
  }

  pre {
    background-color: #1e1e1e;
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
      color: #d4d4d4;
    }
  }
}

// HTML 预览
.render-html {
  height: 100%;

  .html-frame {
    width: 100%;
    height: 400px;
    border: none;
  }
}

// Excel/CSV 表格预览
.render-excel {
  display: flex;
  flex-direction: column;
  height: 100%;

  .excel-sheet-tabs {
    flex-shrink: 0;
    padding: 8px 12px 0;
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-light);

    :deep(.el-tabs__header) {
      margin: 0;
    }
  }

  .excel-table-container {
    flex: 1;
    overflow: auto;
    padding: 12px;
  }

  .excel-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th, td {
      border: 1px solid var(--el-border-color-light);
      padding: 8px 12px;
      text-align: left;
      white-space: nowrap;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    th {
      background-color: var(--el-fill-color-light);
      font-weight: 600;
      color: var(--el-text-color-secondary);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    tr:nth-child(even) {
      background-color: var(--el-fill-color-lighter);
    }

    tr:hover {
      background-color: var(--el-color-primary-light-9);
    }
  }

  .excel-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--el-text-color-secondary);

    i {
      margin-bottom: 12px;
    }
  }
}

// PDF 预览
.render-pdf {
  height: 100%;
  min-height: 500px;

  .pdf-frame {
    width: 100%;
    height: 100%;
    min-height: 500px;
    border: none;
  }
}

// 视频预览
.render-video {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: #000;

  .video-player {
    max-width: 100%;
    max-height: 500px;
  }
}

// 音频预览
.render-audio {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  background: var(--el-fill-color-light);

  .audio-player {
    width: 100%;
    max-width: 500px;
  }
}

// Word 文档预览
.render-word {
  padding: 20px;
  background: #fff;
  overflow: auto;
  height: 100%;

  .word-content {
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.8;
    color: var(--el-text-color-primary);

    // 基本排版
    h1, h2, h3, h4, h5, h6 {
      margin: 1em 0 0.5em;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }

    p {
      margin: 0.8em 0;
      text-align: justify;
    }

    // 表格样式
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;

      th, td {
        border: 1px solid var(--el-border-color);
        padding: 8px 12px;
        text-align: left;
      }

      th {
        background-color: var(--el-fill-color-light);
        font-weight: 600;
      }
    }

    // 列表样式
    ul, ol {
      margin: 0.8em 0;
      padding-left: 2em;
    }

    li {
      margin: 0.4em 0;
    }

    // 图片
    img {
      max-width: 100%;
      height: auto;
    }

    // 强调
    strong, b {
      font-weight: 600;
    }

    em, i {
      font-style: italic;
    }

    // 链接
    a {
      color: var(--el-color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  // 提示和错误
  .word-notice,
  .word-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }

  .word-error {
    color: var(--el-color-danger);
  }
}

// 无法预览
.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--el-text-color-secondary);

  i {
    margin-bottom: 16px;
    color: var(--el-text-color-placeholder);
  }

  p {
    margin-bottom: 8px;

    &.hint {
      font-size: 12px;
      color: var(--el-text-color-placeholder);
      margin-bottom: 16px;
    }
  }
}

// 文件编辑弹窗
.file-path-display {
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;

  .file-dir {
    color: var(--el-text-color-secondary);
  }

  .file-separator {
    margin: 0 4px;
    color: var(--el-text-color-secondary);
  }

  .file-name {
    color: var(--el-text-color-primary);
  }
}

.config-input {
  font-family: 'Consolas', 'Monaco', monospace;
}

// 脚本内容编辑
.content-warning {
  margin-bottom: 16px;
}

.content-actions {
  margin-bottom: 12px;
}

.content-editor {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
  }
}
</style>
