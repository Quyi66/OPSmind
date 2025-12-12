<template>
  <el-dialog
    v-model="visible"
    title="选择脚本文件"
    width="800px"
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
        <el-button size="small" @click="refresh" :loading="loading" title="刷新">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container" v-loading="loading">
      <el-table
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
          :selectable="(row) => !row.directory"
        />
        <el-table-column
          v-else
          width="50"
        >
          <template #default="{ row }">
            <el-radio
              v-if="!row.directory"
              v-model="selectedFile"
              :value="row.path"
              @click.stop
            />
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="300">
          <template #default="{ row }">
            <div class="file-name">
              <i :class="getFileIcon(row)" class="file-icon"></i>
              <span>{{ row.name }}</span>
              <el-tag
                v-if="row._stageExists"
                size="small"
                type="warning"
                class="stage-tag"
              >
                待审批
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100">
          <template #default="{ row }">
            {{ row.directory ? '-' : formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastModified) }}
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && fileList.length === 0" description="此目录为空" />
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
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import * as gfsApi from '@/modules/automation/api/gfs'

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
    const response = await gfsApi.listFiles(currentDir.value, 'git', true)
    let files = response.data || []

    // 解析暂存区文件
    files = parseStageFiles(files)

    // 排序：目录在前，文件在后
    files.sort((a, b) => {
      if (a.directory && !b.directory) return -1
      if (!a.directory && b.directory) return 1
      return a.name.localeCompare(b.name)
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
      const regex = new RegExp(props.fileFilter)
      files = files.filter((f) => f.directory || regex.test(f.name))
    }

    fileList.value = files
  } catch (error) {
    ElMessage.error('加载文件列表失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

/**
 * 解析暂存区文件
 */
function parseStageFiles(files) {
  const stageFiles = files.filter((f) => f.repoType === 'STAGE')
  const mainFiles = files.filter((f) => f.repoType !== 'STAGE')

  stageFiles.forEach((sfile) => {
    const main = mainFiles.find((f) => f.path === sfile.path)
    if (main) {
      main._stageExists = true
      main._stageStatus = sfile.onlineStatus
      if (sfile.onlineStatus !== 'REJECTED') {
        main._stageNeedApprove = true
      }
    } else {
      sfile._stageIsThis = true
      sfile._stageExists = true
      mainFiles.push(sfile)
    }
  })

  return mainFiles
}

/**
 * 获取文件图标
 */
function getFileIcon(file) {
  if (file._isParentDir) return 'fa fa-level-up-alt'
  if (file.directory) return 'fa fa-folder text-warning'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const iconMap = {
    yml: 'fa fa-file-code text-info',
    yaml: 'fa fa-file-code text-info',
    sh: 'fa fa-terminal text-success',
    py: 'fa fa-file-code text-primary',
    js: 'fa fa-file-code text-warning',
    json: 'fa fa-file-code text-info',
    txt: 'fa fa-file-alt',
    md: 'fa fa-file-alt',
    conf: 'fa fa-cog',
    ini: 'fa fa-cog'
  }

  return iconMap[ext] || 'fa fa-file'
}

/**
 * 格式化文件大小
 */
function formatFileSize(size) {
  if (!size) return '-'
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
  return date.toLocaleString('zh-CN')
}

/**
 * 导航到指定目录
 */
function navigateTo(path) {
  currentDir.value = path
  loadFiles()
}

/**
 * 行点击处理
 */
function handleRowClick(row) {
  if (row.directory) {
    if (row._isParentDir) {
      currentDir.value = row.path
    } else {
      currentDir.value = row.path
    }
    loadFiles()
  } else {
    if (props.multipleSelect) {
      // 多选模式：切换选中状态
      const index = selectedFiles.value.findIndex((f) => f.path === row.path)
      if (index === -1) {
        selectedFiles.value.push(row)
      } else {
        selectedFiles.value.splice(index, 1)
      }
    } else {
      // 单选模式
      selectedFile.value = row.path
    }
  }
}

/**
 * 多选变化处理
 */
function handleSelectionChange(selection) {
  if (props.multipleSelect) {
    selectedFiles.value = selection.filter((f) => !f.directory)
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
 * 确认选择
 */
function handleConfirm() {
  let result = []
  if (props.multipleSelect) {
    result = selectedFiles.value.map((f) => ({
      path: f.path,
      name: f.name,
      config: '',
      tag: ''
    }))
  } else if (selectedFile.value) {
    const file = fileList.value.find((f) => f.path === selectedFile.value)
    result = [{
      path: selectedFile.value,
      name: file?.name || '',
      config: '',
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

  .file-icon {
    width: 16px;
    text-align: center;
  }

  .stage-tag {
    margin-left: 8px;
  }
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
</style>
