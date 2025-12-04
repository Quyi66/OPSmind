<template>
  <el-dialog
    v-model="visible"
    title="选择文件"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="file-selector-dialog">
      <!-- 工具栏：面包屑导航 + 操作按钮 -->
      <div class="d-flex toolbar">
        <!-- 面包屑导航 -->
        <ol class="breadcrumb me-auto">
          <li
            v-for="(crumb, index) in breadcrumbs"
            :key="index"
            class="breadcrumb-item"
            :class="{ active: crumb.path === currentDir }"
          >
            <a v-if="crumb.path !== currentDir" href="javascript:void(0)" @click="goDir(crumb.path)">
              {{ crumb.name || '~' }}
            </a>
            <span v-else>{{ crumb.name || '~' }}</span>
          </li>
        </ol>

        <!-- 操作按钮区域 -->
        <div class="actions">
          <!-- 刷新按钮 -->
          <el-button class="btn-outline" title="刷新" @click="refresh">
            <i class="fa fa-sync-alt" />
          </el-button>
          <!-- 下载按钮 -->
          <el-button
            v-if="showDownloadButton"
            class="btn-outline"
            title="下载"
            :disabled="Object.keys(selectionMap).length === 0"
            @click="downloadFiles"
          >
            <i class="fa fa-download" /> 下载
          </el-button>
          <!-- 搜索框 -->
          <el-input
            v-model="searchText"
            class="search-input"
            placeholder="搜索..."
            clearable
            @keyup.enter="search"
          />
        </div>
      </div>

      <!-- 文件列表表格 -->
      <div class="repeater-container">
        <div class="opx-table table-hover js-file-list" :class="'gfs-repo-' + repoType">
          <!-- 表头 -->
          <div class="opx-table-thead">
            <div class="opx-table-tr">
              <div v-if="multiSelect || singleSelect" class="opx-table-th" style="width: 2rem">
                <el-checkbox
                  v-if="multiSelect"
                  v-model="allChecked"
                  @change="selectAll"
                />
              </div>
              <div class="opx-table-th sorting" style="flex: 1; width: 30rem" @click="sortBy('name')">
                名称
              </div>
              <div class="opx-table-th sorting" style="width: 6rem" @click="sortBy('size')">
                大小
              </div>
              <div class="opx-table-th sorting" style="width: 8rem" @click="sortBy('lastModified')">
                修改时间
              </div>
            </div>
          </div>
          <!-- 表体 -->
          <div v-loading="loading" class="opx-table-tbody scroll-y" style="max-height: 40rem; overflow: visible">
            <div
              v-for="(file, index) in displayFileList"
              :key="index"
              class="opx-table-tr op-hover-trigger"
              :class="{
                'text-muted': file._excluded && !file.directory,
                'table-primary': !file.directory && (selectionMap[file._key] || selectionMap._key === file._key)
              }"
            >
              <!-- 选择列 -->
              <div v-if="multiSelect || singleSelect" class="opx-table-td" style="width: 2rem">
                <template v-if="file._selectable">
                  <el-checkbox
                    v-if="multiSelect"
                    :model-value="!!selectionMap[file._key]"
                    @change="selectFile(file)"
                  />
                  <el-radio
                    v-if="singleSelect"
                    :model-value="!!selectionMap[file._key]"
                    @change="selectFile(file)"
                  />
                </template>
              </div>
              <!-- 文件名列 -->
              <div class="opx-table-td d-flex justify-content-between" style="flex: 1; width: 30rem; position: relative">
                <i v-if="file._iconCss" :class="file._iconCss" class="me-2" style="width: 1.25rem; min-width: 1.25rem; padding-top: 0.25rem; font-size: 1rem" />
                <a class="d-flex w-100">
                  <div class="flex-fill text-ellipsis" @click="goFile(file)">
                    <span class="gfs-ff-name" :title="file._statusDesc">{{ file.name }}</span>
                  </div>
                </a>
              </div>
              <!-- 大小列 -->
              <div class="opx-table-td" style="width: 6rem">
                {{ file._size }}
              </div>
              <!-- 修改时间列 -->
              <div class="opx-table-td" style="width: 8rem">
                {{ formatFromNow(file.lastModified) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空目录提示 -->
      <div v-if="emptyFolder" class="op-blank-slate">
        <div class="op-blank-slate-icon"><i class="fa fa-inbox fa-5x" /></div>
        <div>暂无文件</div>
      </div>

      <!-- 已选文件 -->
      <div v-if="Object.keys(selectionMap).length > 0" class="selected-section">
        <span class="label">已选择 {{ Object.keys(selectionMap).length }} 个文件:</span>
        <div class="selected-tags">
          <el-tag
            v-for="(file, key) in selectionMap"
            :key="key"
            closable
            size="small"
            @close="removeSelectedFile(key)"
          >
            {{ file.name }}
          </el-tag>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="Object.keys(selectionMap).length === 0" @click="handleConfirm">
        <i class="fa fa-check" /> 确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { apiService } from '@/core/api'
import { ElMessage } from 'element-plus'

const PARENT_DIR = '..'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 是否多选
  multiple: {
    type: Boolean,
    default: true
  },
  // 仓库类型: git, staticfs
  repoType: {
    type: String,
    default: 'staticfs'
  },
  // 仓库名称
  repo: {
    type: String,
    default: ''
  },
  // 基础路径限制
  base: {
    type: String,
    default: ''
  },
  // 文件过滤器，逗号分隔，支持通配符 *
  filter: {
    type: String,
    default: ''
  },
  // 预选文件
  preSelected: {
    type: [Array, String, Object],
    default: () => []
  },
  // 是否显示下载按钮
  showDownloadButton: {
    type: Boolean,
    default: false
  },
  // 是否可选择目录
  canSelectDirectory: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'select'])

const visible = ref(false)
const loading = ref(false)

// 当前目录
const currentDir = ref('')
// 文件列表
const fileList = ref([])
// 选中的文件 Map
const selectionMap = reactive({})
// 搜索关键词
const searchText = ref('')
// 全选状态
const allChecked = ref(false)
// 空文件夹标记
const emptyFolder = ref(false)
// 排序配置
const sortConfig = reactive({ attr: 'name', order: 'asc' })

// 多选/单选模式
const multiSelect = computed(() => props.multiple)
const singleSelect = computed(() => !props.multiple)

// 基础路径对象
const basePath = computed(() => props.base || '')

// 面包屑导航
const breadcrumbs = computed(() => {
  const crumbs = []
  const baseDir = basePath.value
  let dirPath = currentDir.value

  const dirs = ['']
  if (dirPath) {
    if (baseDir) {
      if (dirPath.indexOf(baseDir) === 0) {
        dirPath = dirPath.substring(baseDir.length)
      } else {
        return []
      }
    }
    const parts = dirPath.split('/')
    if (!baseDir) {
      parts.unshift('')
    }
    dirs.length = 0
    dirs.push(...parts)
  }

  let currentPath = baseDir || ''
  for (let i = 0; i < dirs.length; i++) {
    const seg = dirs[i]
    currentPath = currentPath + seg
    crumbs.push({ name: seg ? seg : '~', path: currentPath })
    if (i < dirs.length - 1 && currentPath !== '') {
      currentPath += '/'
    }
  }
  return crumbs
})

// 过滤后的显示列表
const displayFileList = computed(() => {
  if (!searchText.value) return fileList.value
  const keyword = searchText.value.toLowerCase()
  return fileList.value.filter(file => {
    for (const key in file) {
      if (file[key] !== null && file[key] !== '' && file[key].toString().toLowerCase().indexOf(keyword) > -1) {
        return true
      }
    }
    return false
  })
})

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      initComponent()
    }
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

/**
 * 初始化组件
 */
function initComponent() {
  currentDir.value = props.base || ''
  Object.keys(selectionMap).forEach(key => delete selectionMap[key])
  searchText.value = ''
  allChecked.value = false

  // 处理预选
  initPreSelected()
  // 加载文件列表
  listFiles(props.repo, currentDir.value)
}

/**
 * 初始化预选文件
 */
function initPreSelected() {
  const preSelected = unifyPreSelectedToObjectArray(props.preSelected)
  if (multiSelect.value) {
    preSelected.forEach(file => {
      selectionMap[file.path] = file
    })
  } else if (singleSelect.value && preSelected.length > 0) {
    const file = preSelected[0]
    selectionMap[file.path] = file
  }
}

/**
 * 统一预选数据格式为数组
 */
function unifyPreSelectedToObjectArray(preSelected) {
  let fileArray = []
  if (!preSelected || (Array.isArray(preSelected) && preSelected.length === 0)) {
    return fileArray
  }
  if (Array.isArray(preSelected)) {
    fileArray = [...preSelected]
  } else if (typeof preSelected === 'string') {
    fileArray = preSelected.split(/\|\s*/)
  } else if (typeof preSelected === 'object') {
    fileArray = [preSelected]
  }
  return fileArray.map(file => {
    if (typeof file === 'string') {
      return { path: file }
    }
    return file
  })
}

/**
 * 加载文件列表
 * API: /gfs/api/gfs/v2/staticfs/r/$tnt/dir/{path}
 */
async function listFiles(repo, dir) {
  loading.value = true
  emptyFolder.value = false

  try {
    // 构建 API 路径: /gfs/api/gfs/v2/staticfs/r/$tnt/dir/{path}
    const dirPath = dir ? `/${dir}` : '/'
    const cacheBuster = Date.now()
    const response = await apiService.get(`/gfs/api/gfs/v2/staticfs/r/$tnt/dir${dirPath}`, {
      params: { cacheBuster }
    })
    const data = response?.data || response || []

    let files = Array.isArray(data) ? data : []

    // 排序：目录优先，然后按名称
    files = files.sort((a, b) => {
      const aDir = a.directory || a.isDir
      const bDir = b.directory || b.isDir
      if (aDir && !bDir) return -1
      if (!aDir && bDir) return 1
      return (a.name || '').localeCompare(b.name || '')
    })

    // 添加返回上级目录
    const parent = parentDir(dir)
    if (parent !== null) {
      files.unshift({
        name: PARENT_DIR,
        directory: true,
        lastModified: '',
        dir: parent,
        path: parent,
        _isParentDir: true,
        _selectable: false
      })
    }

    // 处理文件过滤器
    let filterRegex = null
    if (props.filter) {
      const regex = props.filter.replace(/\s*,\s*/g, ')|(').replace(/^/, '(').replace(/$/, ')').replace(/\*/g, '.*')
      filterRegex = new RegExp(regex, 'i')
    }

    // 处理每个文件
    fileList.value = files.map(f => {
      const isDir = f.directory || f.isDir || false
      const file = {
        ...f,
        directory: isDir,
        path: f.path || `${dir}/${f.name}`.replace(/\/+/g, '/').replace(/^\//, ''),
        _key: f.path || `${dir}/${f.name}`.replace(/\/+/g, '/').replace(/^\//, ''),
        _excluded: false,
        _selectable: true,
        _isParentDir: f._isParentDir || false
      }

      // 应用过滤器
      if (filterRegex && !isDir && !filterRegex.test(file.name)) {
        file._excluded = true
      }

      // 设置图标
      if (file._isParentDir) {
        file._iconCss = 'fa fa-level-up fa-fw text-muted'
      } else if (isDir) {
        file._iconCss = 'fa fa-folder fa-fw text-warning'
      } else {
        file._iconCss = getFileIconCss(file.name)
      }

      // 设置是否可选
      file._selectable = !file._excluded && !file._isParentDir
      if (!props.canSelectDirectory && isDir) {
        file._selectable = false
      }

      // 格式化大小
      if (isDir) {
        file._size = ''
      } else {
        file._size = formatFileSize(f.size || 0)
      }

      return file
    })

    // 检查是否空目录
    if (fileList.value.length === 0 || (fileList.value.length === 1 && fileList.value[0]._isParentDir)) {
      emptyFolder.value = true
    }
  } catch (error) {
    console.error('Failed to load files:', error)
    fileList.value = []
    emptyFolder.value = true
  } finally {
    loading.value = false
  }
}

/**
 * 获取父目录
 */
function parentDir(path) {
  if (!path) return null
  const arr = path.split('/')
  arr.splice(-1, 1)
  const parent = arr.join('/')
  if (isInclude(parent)) {
    return parent
  }
  return null
}

/**
 * 检查路径是否在基础路径内
 */
function isInclude(dir) {
  const baseDir = basePath.value
  return !baseDir || dir.indexOf(baseDir) === 0
}

/**
 * 根据文件名获取图标样式
 */
function getFileIconCss(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap = {
    rpm: 'fa fa-cube fa-fw text-danger',
    deb: 'fa fa-cube fa-fw text-danger',
    tar: 'fa fa-file-archive fa-fw text-info',
    gz: 'fa fa-file-archive fa-fw text-info',
    zip: 'fa fa-file-archive fa-fw text-info',
    sh: 'fa fa-file-code fa-fw text-success',
    py: 'fa fa-file-code fa-fw text-success',
    js: 'fa fa-file-code fa-fw text-warning',
    yml: 'fa fa-file-alt fa-fw text-primary',
    yaml: 'fa fa-file-alt fa-fw text-primary',
    json: 'fa fa-file-alt fa-fw text-primary',
    txt: 'fa fa-file-alt fa-fw text-muted',
    log: 'fa fa-file-alt fa-fw text-muted',
    md: 'fa fa-file-alt fa-fw text-muted'
  }
  return iconMap[ext] || 'fal fa-file fa-fw text-muted'
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

/**
 * 格式化时间为相对时间
 */
function formatFromNow(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) {
    return date.toLocaleDateString('zh-CN')
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

/**
 * 进入目录
 */
function goDir(dir) {
  currentDir.value = dir
  listFiles(props.repo, dir)
}

/**
 * 点击文件/目录
 */
function goFile(file) {
  if (file.directory) {
    goDir(file.path)
  }
}

/**
 * 选择文件
 */
function selectFile(file) {
  if (multiSelect.value) {
    if (selectionMap[file._key]) {
      delete selectionMap[file._key]
    } else {
      selectionMap[file._key] = file
    }
  } else {
    Object.keys(selectionMap).forEach(key => delete selectionMap[key])
    selectionMap[file.path] = file
  }
  syncModelToCallback()
}

/**
 * 全选/取消全选
 */
function selectAll() {
  if (allChecked.value) {
    fileList.value.forEach(f => {
      if (!f.directory && !f._excluded && !f._isParentDir) {
        selectionMap[f._key] = f
      } else if (props.canSelectDirectory && f.directory && !f._isParentDir) {
        selectionMap[f._key] = f
      }
    })
  } else {
    Object.keys(selectionMap).forEach(key => delete selectionMap[key])
  }
  syncModelToCallback()
}

/**
 * 移除已选文件
 */
function removeSelectedFile(key) {
  delete selectionMap[key]
  syncModelToCallback()
}

/**
 * 同步选择到回调
 */
function syncModelToCallback() {
  const files = Object.values(selectionMap).map(file => ({
    id: file.id,
    path: file.path,
    name: file.name,
    config: file.config
  }))
  emit('select', files)
}

/**
 * 搜索
 */
function search() {
  // 由 computed 自动处理过滤
}

/**
 * 刷新
 */
function refresh() {
  listFiles(props.repo, currentDir.value)
  ElMessage.success('刷新成功')
}

/**
 * 排序
 */
function sortBy(attr) {
  const order = sortConfig.order === 'desc' ? 'asc' : 'desc'
  sortConfig.attr = attr
  sortConfig.order = order

  fileList.value.sort((a, b) => {
    // 目录始终在前
    if (a.directory && !b.directory) return -1
    if (!a.directory && b.directory) return 1
    if (a.directory && b.directory) {
      if (a.name === PARENT_DIR) return -1
      if (b.name === PARENT_DIR) return 1
    }
    const valA = a[attr]
    const valB = b[attr]
    let result = valA < valB ? -1 : (valA > valB ? 1 : 0)
    if (order === 'desc') {
      result = -result
    }
    return result
  })
}

/**
 * 下载文件
 */
function downloadFiles() {
  const paths = Object.values(selectionMap).map(file => file.path)
  if (paths.length === 0) return
  // TODO: 实现下载逻辑
  ElMessage.info('下载功能待实现')
}

/**
 * 关闭对话框
 */
function handleClose() {
  visible.value = false
  Object.keys(selectionMap).forEach(key => delete selectionMap[key])
}

/**
 * 确认选择
 */
function handleConfirm() {
  const files = Object.values(selectionMap).map(file => ({
    id: file.id,
    path: file.path,
    name: file.name,
    config: file.config
  }))
  emit('confirm', files)
  handleClose()
}
</script>

<style scoped lang="scss">
.file-selector-dialog {
  .d-flex {
    display: flex;
  }

  .me-auto {
    margin-right: auto;
  }

  .w-100 {
    width: 100%;
  }

  .justify-content-between {
    justify-content: space-between;
  }

  .flex-fill {
    flex: 1;
  }

  .text-ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .me-2 {
    margin-right: 0.5rem;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;

    .breadcrumb {
      display: flex;
      flex-wrap: wrap;
      padding: 0;
      margin: 0;
      list-style: none;
      gap: 4px;

      .breadcrumb-item {
        display: flex;
        align-items: center;

        &::before {
          content: '/';
          padding: 0 8px;
          color: #909399;
        }

        &:first-child::before {
          display: none;
        }

        a {
          color: #409eff;
          text-decoration: none;
          cursor: pointer;

          &:hover {
            text-decoration: underline;
          }
        }

        &.active span {
          color: #606266;
        }
      }
    }

    .actions {
      display: flex;
      gap: 8px;
      align-items: center;

      .btn-outline {
        border: 1px solid #dcdfe6;
        background: transparent;

        &:hover {
          border-color: #409eff;
          color: #409eff;
        }

        &:disabled {
          color: #c0c4cc;
          border-color: #ebeef5;
          cursor: not-allowed;
        }
      }

      .search-input {
        width: 180px;
      }
    }
  }

  .repeater-container {
    .opx-table {
      width: 100%;
      border: 1px solid #ebeef5;
      border-radius: 4px;

      .opx-table-thead {
        background: #f5f7fa;

        .opx-table-tr {
          display: flex;
        }

        .opx-table-th {
          padding: 10px 12px;
          font-weight: 600;
          font-size: 13px;
          color: #606266;
          border-bottom: 1px solid #ebeef5;

          &.sorting {
            cursor: pointer;
            user-select: none;

            &:hover {
              background: #ecf5ff;
            }
          }
        }
      }

      .opx-table-tbody {
        max-height: 400px;
        overflow-y: auto;

        .opx-table-tr {
          display: flex;
          border-bottom: 1px solid #ebeef5;
          transition: background 0.2s;

          &:hover {
            background: #f5f7fa;
          }

          &.table-primary {
            background: #ecf5ff;
          }

          &.text-muted {
            opacity: 0.5;
          }
        }

        .opx-table-td {
          padding: 10px 12px;
          font-size: 13px;
          color: #606266;
          display: flex;
          align-items: center;

          a {
            color: inherit;
            text-decoration: none;
            cursor: pointer;

            &:hover .gfs-ff-name {
              color: #409eff;
            }
          }
        }
      }
    }
  }

  .op-blank-slate {
    text-align: center;
    padding: 40px 20px;
    color: #909399;

    .op-blank-slate-icon {
      margin-bottom: 16px;
      color: #c0c4cc;
    }
  }

  .selected-section {
    margin-top: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;

    .label {
      font-size: 13px;
      color: #606266;
      margin-right: 8px;
    }

    .selected-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
  }

  // 文件图标颜色
  .text-warning {
    color: #e6a23c;
  }

  .text-danger {
    color: #f56c6c;
  }

  .text-info {
    color: #909399;
  }

  .text-success {
    color: #67c23a;
  }

  .text-primary {
    color: #409eff;
  }

  .text-muted {
    color: #909399;
  }
}
</style>
