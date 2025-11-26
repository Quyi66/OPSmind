<template>
  <div class="gfs-file-selector">
    <!-- 有文件时的显示 -->
    <div v-if="fileList.length" class="file-list">
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
    <div v-else class="empty-state">
      <div class="empty-state-icon">
        <i class="fal fa-file-alt" />
      </div>
      <el-button size="small" :disabled="disabled" @click="handleOpenSelector">
        选择文件
      </el-button>
    </div>

    <!-- GFS 文件选择对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="选择脚本文件"
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
          <el-select v-model="currentRepoType" placeholder="仓库类型" style="width: 150px; margin-left: 12px;">
            <el-option value="gfs" label="GFS 仓库" />
            <el-option value="local" label="本地路径" />
          </el-select>
        </div>
        <div class="gfs-browser-body">
          <div class="gfs-path-bar">
            <span class="path-label">当前路径：</span>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item
                v-for="(segment, idx) in pathSegments"
                :key="idx"
                @click="navigateToPath(idx)"
              >
                {{ segment || '根目录' }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="gfs-file-list">
            <div
              v-for="item in filteredFiles"
              :key="item.path"
              class="gfs-file-item"
              :class="{ selected: selectedFiles.includes(item.path), folder: item.isDir }"
              @click="handleFileClick(item)"
              @dblclick="handleFileDblClick(item)"
            >
              <i :class="item.isDir ? 'fa fa-folder' : 'fa fa-file-code'" />
              <span class="file-name">{{ item.name }}</span>
            </div>
            <el-empty v-if="!filteredFiles.length" description="暂无文件" :image-size="60" />
          </div>
        </div>
        <div class="gfs-browser-footer">
          <div class="selected-count">已选择 {{ selectedFiles.length }} 个文件</div>
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

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  showConfig: { type: Boolean, default: true },
  showTag: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const fileList = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 文件状态映射（标记不存在的文件）
const fileStatusMap = ref({})

// 对话框状态
const dialogVisible = ref(false)
const searchKeyword = ref('')
const currentRepoType = ref('gfs')
const currentPath = ref('')
const selectedFiles = ref([])

// 模拟文件列表数据（后续需要对接 GFS API）
const mockFiles = ref([
  { name: 'playbooks', path: '/playbooks', isDir: true },
  { name: 'scripts', path: '/scripts', isDir: true },
  { name: 'deploy.yml', path: '/deploy.yml', isDir: false },
  { name: 'install.yml', path: '/install.yml', isDir: false },
  { name: 'config.yml', path: '/config.yml', isDir: false }
])

const pathSegments = computed(() => {
  if (!currentPath.value) return ['']
  return ['', ...currentPath.value.split('/').filter(Boolean)]
})

const filteredFiles = computed(() => {
  if (!searchKeyword.value) return mockFiles.value
  const keyword = searchKeyword.value.toLowerCase()
  return mockFiles.value.filter(f => f.name.toLowerCase().includes(keyword))
})

function handleOpenSelector() {
  if (props.disabled) return
  // 暂时直接添加一个空行，后续可以打开文件选择对话框
  // dialogVisible.value = true
  const newList = [...fileList.value]
  newList.push({ path: '', config: '', tag: '' })
  fileList.value = newList
}

function handleRemove(index) {
  if (props.disabled) return
  const newList = [...fileList.value]
  newList.splice(index, 1)
  fileList.value = newList
}

function handleFileClick(item) {
  if (item.isDir) return
  const idx = selectedFiles.value.indexOf(item.path)
  if (idx >= 0) {
    selectedFiles.value.splice(idx, 1)
  } else {
    selectedFiles.value.push(item.path)
  }
}

function handleFileDblClick(item) {
  if (item.isDir) {
    currentPath.value = item.path
    // TODO: 加载子目录文件
  }
}

function navigateToPath(idx) {
  const segments = pathSegments.value.slice(0, idx + 1)
  currentPath.value = segments.join('/') || ''
  // TODO: 加载对应目录文件
}

function handleConfirmSelect() {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请至少选择一个文件')
    return
  }
  const newFiles = selectedFiles.value.map(path => ({
    path,
    config: '',
    tag: ''
  }))
  fileList.value = [...fileList.value, ...newFiles]
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
</script>

<style scoped>
.gfs-file-selector {
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.empty-state-icon {
  font-size: 48px;
  color: #cbd5e1;
  margin-bottom: 12px;
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

.gfs-file-list {
  padding: 12px;
  max-height: 280px;
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

.gfs-file-item i {
  width: 20px;
  text-align: center;
}

.file-name {
  flex: 1;
}

.gfs-browser-footer {
  padding: 12px 0 0;
}

.selected-count {
  color: #64748b;
  font-size: 13px;
}
</style>
