<template>
  <div class="gfs-file-selector">
    <!-- 单选模式 -->
    <div v-if="!multipleSelect" class="single-file-display">
      <el-input
        v-model="displayFilePath"
        placeholder="请选择脚本文件"
        size="small"
        :disabled="disabled"
        readonly
      >
        <template #append>
          <el-button :disabled="disabled" @click="handleOpenSelector">
            <i class="fa fa-folder-open" />
          </el-button>
        </template>
      </el-input>
      <el-row v-if="fileList.length > 0" :gutter="12" style="margin-top: 8px;">
        <el-col :span="12" v-if="showConfig">
          <el-input
            v-model="fileList[0].config"
            placeholder="ansible-playbook或脚本执行参数"
            size="small"
            :disabled="disabled"
          />
        </el-col>
        <el-col :span="12" v-if="showTag">
          <el-input
            v-model="fileList[0].tag"
            placeholder="ansible-playbook tag参数"
            size="small"
            :disabled="disabled"
          />
        </el-col>
      </el-row>
    </div>

    <!-- 多选模式 - 有文件时的显示 -->
    <div v-else-if="multipleSelect && fileList.length" class="file-list">
      <div class="file-list-header">
        <el-button size="small" :disabled="disabled" @click="handleOpenSelector">
          共 <strong>{{ fileList.length }}</strong> 个文件
        </el-button>
      </div>
      <table class="file-table">
        <tbody>
          <tr v-for="(file, index) in fileList" :key="index">
            <td class="file-path-cell">
              <div v-if="fileStatusMap[file.path]" class="gfs-missing-file">
                <span class="gfs-ff-name">{{ file.path }}</span>
                <el-tooltip content="文件不存在" placement="top">
                  <i class="fa fa-exclamation-triangle gfs-ff-warn" />
                </el-tooltip>
              </div>
              <el-input
                v-else
                v-model="file.path"
                placeholder="请输入脚本路径"
                size="small"
                :disabled="disabled"
              />
            </td>
            <td v-if="showConfig" class="file-config-cell">
              <el-input
                v-model="file.config"
                placeholder="Ansible playbook 参数"
                size="small"
                :disabled="disabled"
              />
            </td>
            <td v-if="showTag" class="file-tag-cell">
              <el-input
                v-model="file.tag"
                placeholder="Tag"
                size="small"
                :disabled="disabled"
              />
            </td>
            <td class="file-action-cell">
              <el-button
                size="small"
                title="移除文件"
                :disabled="disabled"
                @click="handleRemove(index)"
              >
                <i class="fa fa-minus" />
              </el-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 无文件时的空状态 -->
    <div v-else>
      <el-button size="small" :disabled="disabled" @click="handleOpenSelector">
        选择文件
      </el-button>
    </div>

    <!-- GFS 文件选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="multipleSelect ? '选择脚本文件' : '选择脚本文件（单选）'"
      width="800px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="gfs-browser">
        <div class="gfs-browser-header">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索文件名..."
            prefix-icon="Search"
            clearable
            style="width: 300px;"
          />
        </div>
        <div class="gfs-browser-body">
          <div class="gfs-path-bar">
            <span class="path-label">当前路径：</span>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item
                v-for="(segment, idx) in pathSegments"
                :key="idx"
                class="breadcrumb-clickable"
                @click="navigateToPath(idx)"
              >
                {{ segment || '根目录' }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div v-loading="loading" class="gfs-file-list">
            <div
              v-for="item in filteredFiles"
              :key="item.path"
              class="gfs-file-item"
              :class="{ selected: isFileSelected(item.path), folder: item.directory }"
              @click="handleFileClick(item)"
              @dblclick="handleFileDblClick(item)"
            >
              <i :class="item.directory ? 'fa fa-folder' : 'fa fa-file-code'" />
              <span class="file-name">{{ item.name }}</span>
              <span v-if="item.description" class="file-desc">{{ item.description }}</span>
            </div>
            <el-empty v-if="!loading && !filteredFiles.length" description="暂无文件" :image-size="60" />
          </div>
        </div>
        <div class="gfs-browser-footer">
          <div class="selected-count">
            已选择 {{ selectedFiles.length }} 个文件
            <span v-if="!multipleSelect" class="text-muted">（单选模式）</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmSelect">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  showConfig: { type: Boolean, default: true },
  showTag: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  multipleSelect: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const fileList = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 单选模式下显示的文件路径
const displayFilePath = computed(() => {
  if (fileList.value.length > 0 && fileList.value[0].path) {
    return fileList.value[0].path
  }
  return ''
})

// 文件状态映射（标记不存在的文件）
const fileStatusMap = ref({})

// 对话框状态
const dialogVisible = ref(false)
const searchKeyword = ref('')
const currentPath = ref('')
const selectedFiles = ref([])
const loading = ref(false)

// GFS 文件列表
const gfsFiles = ref([])

const pathSegments = computed(() => {
  if (!currentPath.value) return ['']
  return ['', ...currentPath.value.split('/').filter(Boolean)]
})

const filteredFiles = computed(() => {
  if (!searchKeyword.value) return gfsFiles.value
  const keyword = searchKeyword.value.toLowerCase()
  return gfsFiles.value.filter(f => f.name.toLowerCase().includes(keyword))
})

// 判断文件是否被选中
function isFileSelected(filePath) {
  return selectedFiles.value.some(f => f === filePath || (typeof f === 'object' && f.path === filePath))
}

// 加载 GFS 文件列表
async function loadGfsFiles(path = '') {
  loading.value = true
  try {
    // 使用系统统一的 GFS API
    const files = await gfsApi.listFiles(null, path, 'git', { includeStage: true })

    // 转换数据格式
    gfsFiles.value = files.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      directory: file.directory || false,
      description: file.description || '',
      size: file.size,
      lastModified: file.lastModified,
      onlineStatus: file.onlineStatus
    }))
  } catch (error) {
    console.error('加载文件列表失败:', error)
    ElMessage.error('加载文件列表失败: ' + (error.message || '未知错误'))
    gfsFiles.value = []
  } finally {
    loading.value = false
  }
}

function handleOpenSelector() {
  if (props.disabled) return
  dialogVisible.value = true
  // 清空之前的选择
  selectedFiles.value = []
  currentPath.value = ''
  searchKeyword.value = ''
  // 加载根目录文件
  loadGfsFiles()
}

function handleRemove(index) {
  if (props.disabled) return
  const newList = [...fileList.value]
  newList.splice(index, 1)
  fileList.value = newList
}

function handleFileClick(item) {
  if (item.directory) return // 文件夹不能选择

  if (props.multipleSelect) {
    // 多选模式
    const idx = selectedFiles.value.indexOf(item.path)
    if (idx >= 0) {
      selectedFiles.value.splice(idx, 1)
    } else {
      selectedFiles.value.push(item.path)
    }
  } else {
    // 单选模式 - 只保留一个
    selectedFiles.value = [item.path]
  }
}

function handleFileDblClick(item) {
  if (item.directory) {
    // 双击文件夹进入子目录
    currentPath.value = item.path
    loadGfsFiles(item.path)
  } else if (!props.multipleSelect) {
    // 单选模式下双击文件直接确认
    selectedFiles.value = [item.path]
    handleConfirmSelect()
  }
}

function navigateToPath(idx) {
  const segments = pathSegments.value.slice(0, idx + 1).filter(Boolean)
  currentPath.value = segments.join('/')
  loadGfsFiles(currentPath.value)
}

function handleConfirmSelect() {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请至少选择一个文件')
    return
  }

  if (props.multipleSelect) {
    // 多选模式 - 添加到现有列表
    const newFiles = selectedFiles.value.map(path => ({
      path,
      config: '',
      tag: ''
    }))
    fileList.value = [...fileList.value, ...newFiles]
  } else {
    // 单选模式 - 替换整个列表（保留原有的 config）
    const existingConfig = fileList.value.length > 0 ? fileList.value[0].config : ''
    fileList.value = [{
      path: selectedFiles.value[0],
      config: existingConfig || '',
      tag: ''
    }]
  }

  selectedFiles.value = []
  dialogVisible.value = false
}

// 检查文件是否存在（模拟）
watch(fileList, (list) => {
  // TODO: 实际应该调用 GFS API 检查文件状态
  const statusMap = {}
  list.forEach(file => {
    // 暂时不标记任何文件为不存在
    statusMap[file.path] = false
  })
  fileStatusMap.value = statusMap
}, { deep: true, immediate: true })

// 监听对话框打开，确保初始化文件列表为空
watch(dialogVisible, (visible) => {
  if (visible && !props.multipleSelect) {
    // 单选模式下，如果已经有选中的文件，预选中
    if (fileList.value.length > 0 && fileList.value[0].path) {
      selectedFiles.value = [fileList.value[0].path]
    }
  }
})
</script>

<style scoped>
.gfs-file-selector {
  width: 100%;
}

/* 单选模式显示 */
.single-file-display {
  width: 100%;
}

.file-list-header {
  margin-bottom: 8px;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}

.file-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.file-table tr:last-child td {
  border-bottom: none;
}

.file-path-cell {
  width: 40%;
}

.file-config-cell {
  width: 30%;
}

.file-tag-cell {
  width: 20%;
}

.file-action-cell {
  width: 50px;
  text-align: right;
}

.gfs-missing-file {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
}

.gfs-ff-name {
  word-break: break-all;
}

.gfs-ff-warn {
  color: #f59e0b;
}

/* GFS 浏览器样式 */
.gfs-browser {
  min-height: 400px;
}

.gfs-browser-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.gfs-browser-body {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  min-height: 300px;
}

.gfs-path-bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.path-label {
  color: #64748b;
  margin-right: 8px;
}

.breadcrumb-clickable {
  cursor: pointer;
}

.breadcrumb-clickable:hover {
  color: var(--el-color-primary);
}

.gfs-file-list {
  padding: 12px;
  max-height: 350px;
  overflow-y: auto;
}

.gfs-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.gfs-file-item:hover {
  background: #f1f5f9;
}

.gfs-file-item.selected {
  background: #dbeafe;
  color: #1d4ed8;
}

.gfs-file-item.folder {
  color: #f59e0b;
}

.gfs-file-item.folder:hover {
  background: #fef3c7;
}

.gfs-file-item i {
  width: 20px;
  text-align: center;
}

.file-name {
  flex: 1;
  font-weight: 500;
}

.file-desc {
  color: #94a3b8;
  font-size: 12px;
  margin-left: auto;
}

.gfs-browser-footer {
  padding: 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-count {
  color: #64748b;
  font-size: 13px;
}

.text-muted {
  color: #94a3b8;
  font-size: 12px;
}
</style>
