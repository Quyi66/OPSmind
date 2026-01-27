<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择文件"
    width="800px"
    :close-on-click-modal="false"
    append-to-body
  >
    <div class="script-selector-content">
      <!-- 面包屑导航 -->
      <div class="breadcrumb-nav">
        <span v-for="(crumb, index) in breadcrumbs" :key="index" class="breadcrumb-item">
          <a
            v-if="index < breadcrumbs.length - 1"
            href="javascript:void(0)"
            @click="navigateTo(index)"
          >
            {{ crumb || '~' }}
          </a>
          <span v-else class="current">{{ crumb || '~' }}</span>
          <span v-if="index < breadcrumbs.length - 1" class="separator">›</span>
        </span>
      </div>

      <!-- 文件列表表格 -->
      <div class="file-table-wrapper">
        <table class="file-table" v-loading="loading">
          <thead>
            <tr>
              <th style="width: 40px"></th>
              <th class="name-col">名称</th>
              <th style="width: 100px">大小</th>
              <th style="width: 120px">修改日期</th>
              <th style="width: 80px">状态</th>
            </tr>
          </thead>
          <tbody>
            <!-- 返回上级 -->
            <tr v-if="currentPath" class="file-row parent-row" @click="goParent">
              <td></td>
              <td class="name-cell">
                <i class="fa fa-level-up-alt text-muted" />
                <span class="file-name">..</span>
              </td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <!-- 文件列表 -->
            <tr
              v-for="file in filteredFiles"
              :key="file.path"
              class="file-row"
              :class="{ 'is-selected': isSelected(file), 'is-folder': file.isDirectory }"
              @click="handleRowClick(file)"
              @dblclick="handleRowDblClick(file)"
            >
              <td class="checkbox-cell">
                <input
                  v-if="!file.isDirectory"
                  type="radio"
                  :checked="isSelected(file)"
                  :name="'file-select'"
                  @click.stop="toggleSelect(file)"
                />
              </td>
              <td class="name-cell">
                <i :class="getFileIcon(file)" class="file-icon" />
                <span class="file-name">{{ file.name }}</span>
              </td>
              <td class="size-cell">{{ file.isDirectory ? '' : formatSize(file.size) }}</td>
              <td class="date-cell">{{ formatDate(file.lastModified) }}</td>
              <td class="status-cell">
                <el-tag v-if="file.statusText" :type="file.statusType" size="small">
                  {{ file.statusText }}
                </el-tag>
              </td>
            </tr>
          </tbody>
        </table>
        <el-empty
          v-if="!loading && filteredFiles.length === 0 && !currentPath"
          description="暂无文件"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="selectedFiles.length === 0" @click="handleConfirm">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiService } from '@/core/api'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'confirm'])

const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const loading = ref(false)
const searchKeyword = ref('')
const currentPath = ref('')
const files = ref([])
const selectedFiles = ref([])

// 面包屑导航
const breadcrumbs = computed(() => {
  const parts = ['~']
  if (currentPath.value) {
    parts.push(...currentPath.value.split('/').filter(Boolean))
  }
  return parts
})

// 过滤后的文件
const filteredFiles = computed(() => {
  if (!searchKeyword.value) return files.value
  const keyword = searchKeyword.value.toLowerCase()
  return files.value.filter(f => f.name.toLowerCase().includes(keyword))
})

/**
 * 获取文件图标
 */
function getFileIcon(file) {
  if (file.isDirectory) return 'fa fa-folder text-warning'
  const name = file.name || ''
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'fa fa-file-code text-primary'
  if (name.endsWith('.sh')) return 'fa fa-file-code text-success'
  if (name.endsWith('.py')) return 'fa fa-file-code text-info'
  if (name.endsWith('.json')) return 'fa fa-file-alt text-warning'
  return 'fa fa-file text-muted'
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 检查文件是否已选
 */
function isSelected(file) {
  return selectedFiles.value.some(f => f.path === file.path)
}

/**
 * 切换选择
 */
function toggleSelect(file) {
  if (file.isDirectory) return

  const index = selectedFiles.value.findIndex(f => f.path === file.path)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    // 单选模式
    selectedFiles.value = [
      {
        ...file,
        scriptPath: file.path,
        scriptName: file.name
      }
    ]
  }
}

/**
 * 加载文件列表
 * API: /gfs/api/gfs/v2/git/r/$tnt/dir/{path}
 */
async function loadFiles() {
  loading.value = true
  try {
    // 调用 GFS 文件列表 API - 使用 v2 版本，git 类型
    const dirPath = currentPath.value ? `/${currentPath.value}` : '/'
    const response = await apiService.get(`/gfs/api/gfs/v2/git/r/$tnt/dir${dirPath}`, {
      params: {
        useStage: true
      }
    })
    const data = response?.data || response || []

    // 处理文件列表
    let filesList = Array.isArray(data) ? data : []

    // 排序：目录优先，然后按名称
    filesList = filesList.sort((a, b) => {
      const aDir = a.directory || a.isDir
      const bDir = b.directory || b.isDir
      if (aDir && !bDir) return -1
      if (!aDir && bDir) return 1
      return (a.name || '').localeCompare(b.name || '')
    })

    files.value = filesList.map(f => {
      const isDir = f.directory || f.isDir || false
      // 状态处理
      let statusText = ''
      let statusType = ''
      if (f.onlineStatus === 'PUBLISHED') {
        statusText = '已启用'
        statusType = 'success'
      } else if (f.onlineStatus === 'DISABLED') {
        statusText = '已停用'
        statusType = 'info'
      }

      return {
        name: f.name || f.fileName,
        path: f.path || `${currentPath.value}/${f.name}`.replace(/^\/+/, ''),
        isDirectory: isDir,
        size: f.size || 0,
        lastModified: f.lastModified,
        statusText,
        statusType
      }
    })
  } catch (error) {
    console.error('Failed to load files:', error)
    // 模拟数据用于开发
    files.value = [
      { name: 'oplus', path: 'oplus', isDirectory: true },
      { name: 'scripts', path: 'scripts', isDirectory: true }
    ]
  } finally {
    loading.value = false
  }
}

/**
 * 行单击 - 选择文件
 */
function handleRowClick(file) {
  if (!file.isDirectory) {
    toggleSelect(file)
  }
}

/**
 * 行双击 - 进入目录
 */
function handleRowDblClick(file) {
  if (file.isDirectory) {
    currentPath.value = file.path
    loadFiles()
  }
}

/**
 * 返回上级目录
 */
function goParent() {
  const parts = currentPath.value.split('/').filter(Boolean)
  parts.pop()
  currentPath.value = parts.join('/')
  loadFiles()
}

/**
 * 导航到指定路径
 */
function navigateTo(index) {
  if (index === 0) {
    currentPath.value = ''
  } else {
    const parts = currentPath.value.split('/').filter(Boolean)
    currentPath.value = parts.slice(0, index).join('/')
  }
  loadFiles()
}

/**
 * 确认选择
 */
function handleConfirm() {
  emit('confirm', selectedFiles.value)
  dialogVisible.value = false
}

// 监听弹窗显示
watch(
  () => props.visible,
  val => {
    if (val) {
      // 初始化已选文件
      selectedFiles.value = props.selected.map(s => ({
        name: s.scriptName || s.scriptPath?.split('/').pop() || '',
        path: s.scriptPath || s.path,
        scriptPath: s.scriptPath || s.path,
        scriptName: s.scriptName || s.scriptPath?.split('/').pop() || ''
      }))
      currentPath.value = ''
      loadFiles()
    }
  }
)
</script>

<style scoped lang="scss">
.script-selector-content {
  min-height: 400px;
}

// 面包屑导航
.breadcrumb-nav {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;

  .breadcrumb-item {
    a {
      color: #409eff;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .current {
      color: #606266;
      font-weight: 500;
    }

    .separator {
      margin: 0 8px;
      color: #909399;
    }
  }
}

// 文件表格
.file-table-wrapper {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;

  thead {
    background: #f5f7fa;

    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #606266;
      border-bottom: 1px solid #ebeef5;

      &.name-col {
        width: auto;
      }
    }
  }

  tbody {
    tr.file-row {
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f5f7fa;
      }

      &.is-selected {
        background: #ecf5ff;
      }

      &.parent-row {
        .name-cell {
          color: #909399;
        }
      }

      td {
        padding: 10px 8px;
        font-size: 13px;
        color: #606266;
        border-bottom: 1px solid #f0f0f0;
      }

      .checkbox-cell {
        text-align: center;
        width: 40px;

        input[type='radio'] {
          appearance: none;
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid #dcdfe6;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          background: #fff;

          &:hover {
            border-color: #409eff;
          }

          &:checked {
            border-color: #409eff;
            background: #fff;

            &::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 10px;
              height: 10px;
              background: #409eff;
              border-radius: 50%;
            }
          }
        }
      }

      .name-cell {
        display: flex;
        align-items: center;
        gap: 8px;

        .file-icon {
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .size-cell,
      .date-cell {
        color: #909399;
        font-size: 12px;
      }
    }
  }
}

// 图标颜色
.text-warning {
  color: #e6a23c;
}

.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-info {
  color: #909399;
}

.text-muted {
  color: #c0c4cc;
}
</style>
