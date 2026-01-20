<template>
  <el-dialog
    v-model="visible"
    title="选择脚本文件"
    width="900px"
    destroy-on-close
    :close-on-click-modal="false"
    class="file-selector-dialog"
  >
    <!-- 面包屑导航 -->
    <div class="file-breadcrumb">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item
          v-for="(crumb, index) in breadcrumbs"
          :key="index"
          @click="navigateTo(crumb.path)"
        >
          <span :class="{ 'breadcrumb-link': index < breadcrumbs.length - 1 }">
            {{ crumb.name || '~' }}
          </span>
        </el-breadcrumb-item>
      </el-breadcrumb>
      <div class="breadcrumb-actions">
        <el-button class="toolbar-icon-btn" circle :loading="loading" @click="refresh" title="刷新">
          <el-icon v-show="!loading"><Refresh /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container" v-loading="loading">
      <el-table
        ref="tableRef"
        :data="fileList"
        :height="400"
        @row-click="handleRowClick"
        @selection-change="handleSelectionChange"
        row-class-name="file-row"
        :row-key="(row) => row.path"
      >
        <el-table-column
          v-if="multipleSelect"
          type="selection"
          width="50"
          :selectable="(row) => !row.directory && !row._excluded"
        />
        <el-table-column
          v-else
          width="50"
        >
          <template #default="{ row }">
            <el-radio
              v-if="!row.directory && !row._excluded"
              v-model="selectedFile"
              :value="row.path"
              @click.stop
            />
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="280">
          <template #default="{ row }">
            <div class="file-name" :class="{ 'is-excluded': row._excluded }">
              <i :class="getFileIcon(row)" class="file-icon"></i>
              <span class="file-name-text">{{ row.name }}</span>
              <i v-if="row._stageExists && !row._stageIsThis" class="fa fa-circle text-primary stage-indicator" title="有新版本，等待审核"></i>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="180">
          <template #default="{ row }">
            <span class="file-desc" :title="row.description">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="90">
          <template #default="{ row }">
            {{ row.directory ? '-' : formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改日期" width="160">
          <template #default="{ row }">
            {{ formatDate(row.lastModified || row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <template v-if="!row.directory && !row._isParentDir">
              <span v-if="row._stageExists" :class="'text-' + (row._stageStatusColor || 'primary')" class="status-dot" :title="row._stageStatusText || '待审核'"></span>
              <span v-else-if="row._statusText" :class="'text-' + (row._statusCss || 'success')" class="status-dot" :title="row._statusText"></span>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && fileList.length === 0" description="没有文件" />
    </div>

    <!-- 已选文件 -->
    <div v-if="selectedFiles.length > 0" class="selected-files">
      <div class="selected-header">
        <span>已选择 {{ selectedFiles.length }} 个文件</span>
        <el-button type="primary" link size="small" @click="clearSelection">清空</el-button>
      </div>
      <div class="selected-list">
        <el-tag
          v-for="file in selectedFiles"
          :key="file.path"
          closable
          @close="removeSelected(file)"
          class="selected-tag"
        >
          {{ file.path }}
        </el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        @click="handleConfirm"
        :disabled="selectedFiles.length === 0 && !selectedFile"
      >
        确定
      </el-button>
    </template>
  </el-dialog>

  <!-- 文件内容预览弹窗 -->
  <el-dialog
    v-model="previewVisible"
    :title="previewFile?.path || '文件预览'"
    width="900px"
    destroy-on-close
    :close-on-click-modal="false"
    class="file-preview-dialog"
    append-to-body
  >
    <FileContentViewer
      v-if="previewVisible && previewFile"
      :path="previewFile.path"
      :repo-type="previewFile.repoType || 'git'"
      :repo="previewFile.repo"
      :show-extra-info="true"
      height="450px"
    />
    <template #footer>
      <el-button @click="closeFilePreview">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as gfsApi from '@/modules/automation/api/gfs'
import FileContentViewer from './FileContentViewer.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  multipleSelect: {
    type: Boolean,
    default: true
  },
  preSelected: {
    type: Array,
    default: () => []
  },
  fileFilter: {
    type: String,
    default: ''
  },
  initDir: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const currentDir = ref('')
const fileList = ref([])
const selectedFiles = ref([])
const selectedFile = ref('')
const tableRef = ref(null)

// 文件预览相关
const previewVisible = ref(false)
const previewFile = ref(null)

// 面包屑
const breadcrumbs = computed(() => {
  const crumbs = [{ name: '~', path: '' }]
  if (currentDir.value) {
    const parts = currentDir.value.split('/').filter(Boolean)
    let path = ''
    parts.forEach((part) => {
      path += (path ? '/' : '') + part
      crumbs.push({ name: part, path })
    })
  }
  return crumbs
})

/**
 * 加载文件列表
 */
async function loadFiles() {
  loading.value = true
  try {
    const files = await gfsApi.listFiles(null, currentDir.value, 'git', { includeStage: true })

    // 排序：目录在前，文件在后，按名称排序
    files.sort((a, b) => {
      if (a.directory && !b.directory) return -1
      if (!a.directory && b.directory) return 1
      return (a.name || '').localeCompare(b.name || '')
    })

    // 添加返回上级目录
    if (currentDir.value) {
      const parentDir = currentDir.value.split('/').slice(0, -1).join('/')
      files.unshift({
        name: '..',
        path: parentDir,
        directory: true,
        _isParentDir: true
      })
    }

    // 文件过滤
    if (props.fileFilter) {
      const regex = new RegExp(props.fileFilter.replace(/\s*,\s*/g, ')|(').replace(/^/, '(').replace(/$/, ')').replace(/\*/g, '.*'))
      files.forEach((f) => {
        if (!f.directory && !regex.test(f.name)) {
          f._excluded = true
        }
      })
    }

    fileList.value = files

    // 恢复之前的选中状态
    await nextTick()
    restoreSelection()
  } catch (error) {
    ElMessage.error('加载文件列表失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

/**
 * 恢复选中状态
 */
function restoreSelection() {
  if (!tableRef.value || !props.multipleSelect) return

  // 清除当前选中
  tableRef.value.clearSelection()

  // 根据selectedFiles恢复选中状态
  nextTick(() => {
    selectedFiles.value.forEach(selectedFile => {
      const row = fileList.value.find(f => f.path === selectedFile.path)
      if (row && !row.directory && !row._excluded) {
        tableRef.value.toggleRowSelection(row, true)
      }
    })
  })
}

/**
 * 获取文件图标
 */
function getFileIcon(file) {
  if (file._isParentDir) return 'fa fa-level-up-alt text-muted'
  if (file.directory) return 'fa fa-folder text-warning'

  const ext = file.name?.split('.').pop()?.toLowerCase()
  const iconMap = {
    yml: 'fa fa-file-code text-info',
    yaml: 'fa fa-file-code text-info',
    sh: 'fa fa-terminal text-success',
    py: 'fa fa-file-code text-primary',
    js: 'fa fa-file-code text-warning',
    json: 'fa fa-file-code text-info',
    txt: 'fa fa-file-alt text-muted',
    md: 'fa fa-file-alt text-muted',
    conf: 'fa fa-cog text-muted',
    ini: 'fa fa-cog text-muted',
    xml: 'fa fa-file-code text-info',
    sql: 'fa fa-database text-primary',
    php: 'fa fa-file-code text-purple',
    java: 'fa fa-file-code text-danger',
    go: 'fa fa-file-code text-info',
    rb: 'fa fa-file-code text-danger',
    ts: 'fa fa-file-code text-primary',
    css: 'fa fa-file-code text-info',
    html: 'fa fa-file-code text-warning',
    vue: 'fa fa-file-code text-success'
  }

  return iconMap[ext] || 'fal fa-file text-muted'
}

/**
 * 格式化文件大小
 */
function formatFileSize(size) {
  if (!size || size < 0) return '-'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 格式化日期
 */
function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 导航到指定目录
 */
function navigateTo(path) {
  currentDir.value = path
  loadFiles()
}

/**
 * 行点击处理 - 目录进入，文件打开内容预览
 * 文件选择通过 checkbox/radio 完成
 */
function handleRowClick(row) {
  if (row.directory) {
    // 目录：进入该目录
    currentDir.value = row.path
    loadFiles()
  } else if (!row._excluded && row.conflict !== 'FileNotFound') {
    // 文件：打开内容预览（与源系统行为一致）
    openFilePreview(row)
  }
}

/**
 * 多选变化处理
 */
function handleSelectionChange(selection) {
  if (props.multipleSelect) {
    selectedFiles.value = selection.filter((f) => !f.directory && !f._excluded)
  }
}

/**
 * 清空选择
 */
function clearSelection() {
  selectedFiles.value = []
  selectedFile.value = ''
}

/**
 * 移除已选文件
 */
function removeSelected(file) {
  const index = selectedFiles.value.findIndex((f) => f.path === file.path)
  if (index !== -1) {
    selectedFiles.value.splice(index, 1)
  }
}

/**
 * 刷新
 */
function refresh() {
  loadFiles()
}

/**
 * 打开文件内容预览
 * FileContentViewer 组件会自动加载文件内容
 */
function openFilePreview(file) {
  previewFile.value = file
  previewVisible.value = true
}

/**
 * 关闭文件预览
 */
function closeFilePreview() {
  previewVisible.value = false
  previewFile.value = null
}

/**
 * 确认选择
 */
function handleConfirm() {
  let result = []
  if (props.multipleSelect) {
    result = selectedFiles.value.map((f) => ({
      path: f.path,
      name: f.name,
      config: f.config || '',
      tag: ''
    }))
  } else if (selectedFile.value) {
    const file = fileList.value.find((f) => f.path === selectedFile.value)
    result = [{
      path: selectedFile.value,
      name: file?.name || '',
      config: file?.config || '',
      tag: ''
    }]
  }

  emit('confirm', result)
  visible.value = false
}

// 初始化
watch(visible, (newVal) => {
  if (newVal) {
    currentDir.value = props.initDir || ''
    selectedFiles.value = [...props.preSelected]
    selectedFile.value = props.preSelected[0]?.path || ''
    loadFiles()
  }
})
</script>

<style scoped lang="scss">
.file-selector-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 20px;
  }
}

.file-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 12px;

  .breadcrumb-link {
    cursor: pointer;
    color: var(--el-color-primary);

    &:hover {
      text-decoration: underline;
    }
  }
}

.file-list-container {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.file-row {
  cursor: pointer;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  &:hover {
    .file-name-text {
      color: var(--el-color-primary);
      text-decoration: underline;
    }
  }

  &.is-excluded {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      .file-name-text {
        color: inherit;
        text-decoration: none;
      }
    }
  }

  .file-icon {
    width: 16px;
    min-width: 16px;
    text-align: center;
    font-size: 14px;
  }

  .file-name-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stage-tag {
    margin-left: 4px;
    flex-shrink: 0;
  }
}

.file-desc {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.selected-files {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;

  .selected-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .selected-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .selected-tag {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 状态点样式
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: currentColor;
}

// 名称中的状态指示器
.stage-indicator {
  font-size: 8px;
  margin-left: 6px;
}

// 状态颜色
.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-secondary {
  color: #909399;
}

// 文件预览弹窗样式
.file-preview-dialog {
  :deep(.el-dialog__body) {
    padding: 0;
  }
}
</style>
