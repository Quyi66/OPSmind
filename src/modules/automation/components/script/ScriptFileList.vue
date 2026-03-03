<template>
  <div class="script-file-list" :class="{ 'repo-stage': repoType === 'stage' }">
    <!-- 面包屑导航和工具栏 -->
    <div class="toolbar">
      <!-- 面包屑导航 -->
      <ol class="breadcrumb">
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="index"
          class="breadcrumb-item"
          :class="{ active: crumb.path === currentDir }"
        >
          <a v-if="crumb.path !== currentDir" class="dir-link" @click="goDir(crumb.path)">
            {{ crumb.name || '~' }}
          </a>
          <span v-else>{{ crumb.name || '~' }}</span>
        </li>
      </ol>

      <div class="toolbar-actions">
        <!-- ========== 以下是 git/staticfs 类型的工具栏 ========== -->
        <template v-if="repoType !== 'stage'">
          <!-- 批量操作按钮组 (git 和 staticfs 都有) -->
          <div class="btn-group">
            <el-button :disabled="!hasSelection" title="剪切已选择文件夹和文件" @click="handleCut">
              <i class="fa fa-fw fa-cut" />
              <span v-if="clipboard.length" class="badge bg-primary">{{ clipboard.length }}</span>
            </el-button>
            <el-button
              :disabled="!canPaste"
              title="粘贴已剪切文件夹和文件到当前目录下"
              @click="handlePaste"
            >
              <i class="fa fa-fw fa-paste" />
            </el-button>
            <el-button
              :disabled="!hasSelection"
              title="删除已选择文件夹和文件"
              @click="handleDelete"
            >
              <i class="fa fa-fw fa-trash-alt" />
            </el-button>
            <el-button
              :disabled="!hasSelection"
              title="下载已选择文件和文件夹"
              @click="handleDownload"
            >
              <i class="fa fa-download" />
            </el-button>
          </div>

          <!-- 停用/启用按钮（仅git） -->
          <div v-if="repoType === 'git'" class="btn-group">
            <el-button
              :disabled="!hasSelection"
              title="停用或启用已选择文件夹和文件"
              @click="handleChangeStatus"
            >
              <i class="fa fa-fw fa-stop-circle" />
            </el-button>
          </div>

          <!-- 修复工具按钮 -->
          <div class="btn-group">
            <el-button title="修复" @click="handleRepair">
              <i class="fa fa-tools" />
            </el-button>
          </div>

          <!-- 刷新按钮 -->
          <div class="btn-group">
            <el-button title="刷新当前列表" @click="refresh">
              <i class="fa fa-sync-alt" />
            </el-button>
          </div>

          <!-- 内置应用脚本（仅git） -->
          <div v-if="repoType === 'git'" class="btn-group">
            <el-button title="内置应用脚本" @click="goBaseRepo">
              <i class="fa fa-scroll" />
            </el-button>
          </div>

          <!-- 新增操作按钮组 -->
          <div class="btn-group">
            <el-button title="在当前文件夹下新建子文件夹" @click="handleAddFolder">
              <i class="fa fa-fw fa-folder-plus" />
              文件夹
            </el-button>
            <el-button
              v-if="repoType === 'git'"
              title="在当前文件夹下新建子文件"
              @click="scriptDialogVisible = true"
            >
              <i class="fa fa-file-code" />
              脚本
            </el-button>
            <el-button title="上传文件到当前文件夹" @click="uploadDialogVisible = true">
              <i class="fa fa-fw fa-file-upload" />
              文件
            </el-button>
            <el-button
              v-if="repoType === 'git'"
              title="从远程服务器同步文件"
              @click="syncDialogVisible = true"
            >
              <i class="fa fa-cloud" />
              同步文件
            </el-button>
          </div>

          <!-- Git操作按钮组（仅git） -->
          <div v-if="repoType === 'git'" class="btn-group git-actions">
            <el-button title="从远程Git服务器拉取文件到本地目录" @click="handleGitPull">
              <i class="fa fa-cloud-download-alt" />
              拉取
            </el-button>
            <el-button title="将本地目录文件同步到远程Git服务器" @click="handleGitPush">
              <i class="fa fa-cloud-upload-alt" />
              推送
            </el-button>
            <el-button title="Git库列表" @click="handleGitList">
              <i class="fa fa-list-alt" />
              Git库
            </el-button>
          </div>

          <!-- 搜索框 -->
          <div class="search-box">
            <input
              v-model="searchText"
              type="search"
              class="form-control"
              placeholder="请输入搜索内容"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- 文件状态帮助图标（仅git） -->
          <el-popover v-if="repoType === 'git'" placement="bottom-end" :width="320" trigger="click">
            <template #reference>
              <el-button class="info-btn" title="文件状态">
                <i class="fa fa-info" />
              </el-button>
            </template>
            <div class="file-status-help">
              <dl>
                <dt><span class="status-indicator stage-exist">filename</span></dt>
                <dd>有新版本，等待审核</dd>
                <dt><span class="status-indicator stage-rejected">filename</span></dt>
                <dd>新版本被拒绝</dd>
                <dt><span class="status-indicator master-disabled">filename</span></dt>
                <dd>文件被停用</dd>
                <dt>
                  <span class="status-indicator missing-file">
                    filename
                    <i class="fa fa-exclamation-triangle" />
                  </span>
                </dt>
                <dd>找不到文件</dd>
                <dt>
                  <span class="status-indicator missing-rec">
                    filename
                    <i class="fa fa-exclamation-triangle" />
                  </span>
                </dt>
                <dd>找不到记录</dd>
              </dl>
            </div>
          </el-popover>
        </template>

        <!-- ========== 以下是 stage 类型（审核页面）的工具栏 ========== -->
        <template v-else>
          <!-- 审核按钮 -->
          <el-button
            type="primary"
            :disabled="!hasSelection"
            title="审核已选择的文件"
            @click="fileApproveDialogVisible = true"
            size="small"
          >
            <!-- <i class="fa fa-fw fa-comment-alt-edit" />  -->
            审核
          </el-button>

          <!-- 审批历史按钮 -->
          <el-button title="查看审批历史" @click="approvalHistoryDialogVisible = true" size="small">
            <!-- <i class="fa fa-history" />  -->
            审批历史
          </el-button>
        </template>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-table-container">
      <el-table
        v-loading="loading"
        :data="filteredFiles"
        height="100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="40" :selectable="isSelectable" />

        <el-table-column label="名称" min-width="300" sortable prop="name">
          <template #default="{ row }">
            <div class="file-name-cell">
              <i :class="getFileIcon(row)" class="file-icon" />
              <a class="file-name" @click="handleFileClick(row)">
                <span>{{ row.name }}</span>
                <i
                  v-if="row._warnText"
                  class="fa fa-exclamation-triangle text-warning ms-2"
                  :title="row._warnText"
                />
                <el-tag v-if="row._stageIndicator" size="small" type="primary" class="ms-2">
                  {{ row._stageIndicator.text }}
                </el-tag>
              </a>

              <!-- 操作下拉菜单 -->
              <el-dropdown
                v-if="!row._isParentDir && showActions(row)"
                class="file-actions"
                trigger="click"
                @command="cmd => handleFileAction(cmd, row)"
              >
                <el-button type="primary" text size="small">
                  <i class="fa fa-ellipsis-v" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="!row.directory" command="download">
                      <i class="fa fa-file-download fa-fw" />
                      下载文件
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!row.directory" command="edit">
                      <i class="fa fa-pencil fa-fw" />
                      修改信息
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.canDelete" command="delete">
                      <i class="fa fa-trash-alt fa-fw" />
                      删除文件
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.directory && repoType === 'git'" command="editDir">
                      <i class="fa fa-pencil fa-fw" />
                      修改信息
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!row.directory && repoType === 'git'" command="testRun">
                      <i class="fa fa-chevron-right fa-fw" />
                      测试运行
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!row.directory && repoType === 'git'" command="history">
                      <i class="fa fa-comment-alt-dots fa-fw" />
                      审批历史
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.directory" command="downloadDir">
                      <i class="fa fa-file-download fa-fw" />
                      下载文件夹
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          v-if="repoType === 'git' || repoType === 'stage'"
          label="说明"
          prop="description"
          min-width="200"
        >
          <template #default="{ row }">
            <div class="description-cell" :title="row.description">
              {{ row.description || '-' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="大小" prop="size" width="100" sortable>
          <template #default="{ row }">
            {{ formatFileSize(row) }}
          </template>
        </el-table-column>

        <el-table-column label="修改日期" prop="lastModified" width="120" sortable>
          <template #default="{ row }">
            <a
              v-if="row.lastModified && !row.directory && !row._isParentDir && repoType === 'git'"
              class="date-link"
              title="历史版本"
              @click="handleShowRevList(row)"
            >
              {{ formatDate(row.lastModified) }}
            </a>
            <span v-else-if="row.lastModified">{{ formatDate(row.lastModified) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column
          v-if="repoType === 'git' || repoType === 'stage'"
          label="状态"
          width="80"
          align="left"
        >
          <template #default="{ row }">
            <span
              v-if="row._statusCss && !row.directory && !row._isParentDir"
              class="status-dot"
              :class="row._statusCss"
              :title="row._statusText"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 空状态 -->
    <!-- <div v-if="!loading && filteredFiles.length === 0" class="empty-state">
      <i class="fa fa-inbox fa-5x" />
      <p>没有文件</p>
    </div> -->

    <!-- 弹窗组件 -->
    <AddScriptDialog
      v-model="scriptDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :dir="currentDir"
      @success="loadFiles"
    />

    <AddFolderDialog
      v-model="folderDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :dir="currentDir"
      :edit-data="editFolderData"
      @success="loadFiles"
      @closed="editFolderData = null"
    />

    <UploadFileDialog
      v-model="uploadDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :dir="currentDir"
      @success="loadFiles"
    />

    <SyncFileDialog
      v-model="syncDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :dir="currentDir"
      @success="loadFiles"
    />

    <FileContentDialog
      v-model="contentDialogVisible"
      :repo-type="contentRepoType"
      :repo="contentRepo || currentRepo"
      :file="currentFile"
    />

    <GitRepoListDialog
      v-model="gitRepoListDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      @success="loadFiles"
    />

    <JgitManageDialog
      v-model="jgitManageDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      @success="loadFiles"
    />

    <!-- 审核相关弹窗（stage 类型） -->
    <FileApproveDialog
      v-model="fileApproveDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :files="selectedFiles"
      @success="loadFiles"
    />

    <ApprovalHistoryDialog
      v-model="approvalHistoryDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :mode="historyFile ? 'singleFile' : 'all'"
      :file="historyFile"
      @open-file="handleHistoryFileOpen"
      @closed="historyFile = null"
    />

    <FileChangeStatusDialog
      v-model="fileChangeStatusDialogVisible"
      :repo-type="repoType"
      :repo="currentRepo"
      :files="selectedFiles"
      @success="loadFiles"
    />

    <FileRevisionDialog
      v-model="fileRevisionDialogVisible"
      :repo="currentRepo"
      :path="revisionFile?.path || ''"
      @rollback="loadFiles"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'
import {
  AddScriptDialog,
  AddFolderDialog,
  UploadFileDialog,
  SyncFileDialog,
  FileContentDialog,
  GitRepoListDialog,
  JgitManageDialog,
  FileApproveDialog,
  ApprovalHistoryDialog,
  FileChangeStatusDialog,
  FileRevisionDialog
} from './dialogs'

const props = defineProps({
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  initialDir: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['dir-change', 'navigate-to-script-library'])

// 状态
const loading = ref(false)
const currentDir = ref('')
const fileList = ref([])
const selectedFiles = ref([])
const searchText = ref('')
const clipboard = ref([])
const clipboardDir = ref('')
const hideOplus = ref(true) // 是否隐藏内置应用脚本目录(oplus)
const contentRepo = ref('') // 用于文件内容弹窗的 repo（审批历史可返回真实 repo）
const contentRepoType = ref(props.repoType) // 用于文件内容弹窗的仓库类型（审批历史需要强制用 git）

// 弹窗状态
const scriptDialogVisible = ref(false)
const folderDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const syncDialogVisible = ref(false)
const contentDialogVisible = ref(false)
const gitRepoListDialogVisible = ref(false)
const jgitManageDialogVisible = ref(false)
const fileApproveDialogVisible = ref(false)
const approvalHistoryDialogVisible = ref(false)
const fileChangeStatusDialogVisible = ref(false)
const fileRevisionDialogVisible = ref(false)
const revisionFile = ref(null)
const currentFile = ref(null)
const editFolderData = ref(null)
const historyFile = ref(null)

const currentRepo = ref(props.repo)

async function resolveRepoId() {
  if (props.repo !== '$tnt') {
    currentRepo.value = props.repo
    return
  }

  // Try to load current repo info
  try {
    const res = await gfsApi.loadCurrentRepo('git', '$tnt')
    const repoInfo = res?.data || res
    if (repoInfo?.id) {
      currentRepo.value = repoInfo.id
      return
    }
  } catch (e) {
    // If failed, just use $tnt as default
    console.warn('Failed to resolve repo id, using $tnt as default', e)
  }
}

watch(() => props.repo, resolveRepoId, { immediate: true })

// 面包屑
const breadcrumbs = computed(() => {
  const crumbs = [{ name: '~', path: '' }]
  if (currentDir.value) {
    const dirs = currentDir.value.split('/')
    let path = ''
    dirs.forEach(dir => {
      path = path ? `${path}/${dir}` : dir
      crumbs.push({ name: dir, path })
    })
  }
  return crumbs
})

// 过滤后的文件列表
const filteredFiles = computed(() => {
  let list = fileList.value

  // 在根目录且 hideOplus 为 true 时，隐藏 oplus 文件夹（内置应用脚本目录）
  if (!currentDir.value && hideOplus.value) {
    list = list.filter(f => f.path !== 'oplus')
  }

  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    list = list.filter(
      f =>
        f.name.toLowerCase().includes(search) ||
        (f.description && f.description.toLowerCase().includes(search))
    )
  }

  return list
})

// 是否有选中
const hasSelection = computed(() => selectedFiles.value.length > 0)

// 是否可以粘贴
const canPaste = computed(() => {
  if (!clipboard.value.length) return false
  const isPasteInCut = clipboard.value.some(f => currentDir.value.startsWith(f.path))
  return !isPasteInCut && clipboardDir.value !== currentDir.value
})

// 初始化
onMounted(() => {
  currentDir.value = props.initialDir
  loadFiles()
})

// 监听目录变化
watch(currentDir, newDir => {
  emit('dir-change', newDir)
})

// 加载文件列表
async function loadFiles() {
  loading.value = true
  try {
    const files = await gfsApi.listFiles(currentRepo.value, currentDir.value, props.repoType)

    // Attempt to extract real repo ID from the file list if we are using $tnt
    if (
      files.length > 0 &&
      files[0].repo &&
      files[0].repo !== '$tnt' &&
      currentRepo.value === '$tnt'
    ) {
      currentRepo.value = files[0].repo
    }

    const processed = files.map(f => ({
      ...f,
      _key: f.path,
      canUpdate: true,
      canDelete: true
    }))

    processed.sort((a, b) => {
      if (a.directory && !b.directory) return -1
      if (!a.directory && b.directory) return 1
      return a.name.localeCompare(b.name)
    })

    if (currentDir.value) {
      const parentDir = currentDir.value.split('/').slice(0, -1).join('/')
      processed.unshift({
        name: '..',
        directory: true,
        path: parentDir,
        _isParentDir: true,
        _selectable: false
      })
    }

    fileList.value = processed
  } catch (error) {
    ElMessage.error(error?.message || '获取文件列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新
function refresh() {
  loadFiles()
  ElMessage.success('刷新成功')
}

// 进入目录
function goDir(dir) {
  currentDir.value = dir
  loadFiles()
}

// 审批历史中点击文件路径，直接打开文件内容弹窗
function handleHistoryFileOpen(payload) {
  const path = typeof payload === 'string' ? payload : payload?.path
  if (!path) return

  const repoFromPayload = typeof payload === 'object' ? payload.repo : ''
  contentRepoType.value = 'git'
  contentRepo.value = repoFromPayload || currentRepo.value
  currentFile.value = {
    path,
    name: path.split('/').pop()
  }
  contentDialogVisible.value = true
}

// 进入内置应用脚本目录
function goBaseRepo() {
  hideOplus.value = false // 显示 oplus 目录
  currentDir.value = 'oplus'
  loadFiles()
}

// 文件点击
function handleFileClick(file) {
  if (file.directory) {
    goDir(file.path)
  } else if (file.conflict !== 'FileNotFound') {
    contentRepoType.value = props.repoType
    contentRepo.value = currentRepo.value
    currentFile.value = file
    contentDialogVisible.value = true
  }
}

// 选择变化
function handleSelectionChange(selection) {
  selectedFiles.value = selection.filter(f => !f._isParentDir)
}

// 是否可选
function isSelectable(row) {
  return !row._isParentDir
}

// 显示操作菜单
function showActions(row) {
  return !row._isParentDir && (row.canUpdate || row.canDelete)
}

// 新建文件夹
function handleAddFolder() {
  editFolderData.value = null
  folderDialogVisible.value = true
}

// 文件操作
function handleFileAction(command, file) {
  switch (command) {
    case 'download':
      gfsApi.downloadFile(props.repoType, currentRepo.value, file.path, file.name)
      break
    case 'edit':
      ElMessage.info('编辑文件信息功能开发中')
      break
    case 'delete':
      handleDeleteSingle(file)
      break
    case 'editDir':
      editFolderData.value = file
      folderDialogVisible.value = true
      break
    case 'testRun':
      ElMessage.info('测试运行功能开发中')
      break
    case 'history':
      historyFile.value = file
      approvalHistoryDialogVisible.value = true
      break
    case 'downloadDir':
      gfsApi.downloadFiles(props.repoType, currentRepo.value, [file.path], file.name)
      break
  }
}

// 剪切
function handleCut() {
  clipboard.value = [...selectedFiles.value]
  clipboardDir.value = currentDir.value
  selectedFiles.value = []
  ElMessage.success(`已剪切 ${clipboard.value.length} 个文件`)
}

// 粘贴
async function handlePaste() {
  if (!canPaste.value) return
  try {
    const paths = clipboard.value.map(f => f.path)
    await gfsApi.moveFiles(props.repoType, currentRepo.value, currentDir.value, paths)
    clipboard.value = []
    clipboardDir.value = ''
    ElMessage.success('移动成功')
    loadFiles()
  } catch (error) {
    ElMessage.error(error?.message || '移动失败')
  }
}

// 删除
async function handleDelete() {
  if (!hasSelection.value) return
  try {
    await ElMessageBox.confirm('确定删除选中的文件吗？', '删除确认', { type: 'warning' })
    const paths = selectedFiles.value.map(f => f.path)
    await gfsApi.deleteFiles(props.repoType, currentRepo.value, paths)
    ElMessage.success('删除成功')
    selectedFiles.value = []
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// 删除单个
async function handleDeleteSingle(file) {
  try {
    await ElMessageBox.confirm(`确定删除 "${file.name}" 吗？`, '删除确认', { type: 'warning' })
    await gfsApi.deleteFiles(props.repoType, currentRepo.value, [file.path])
    ElMessage.success('删除成功')
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// 下载
function handleDownload() {
  if (!hasSelection.value) return
  const paths = selectedFiles.value.map(f => f.path)
  gfsApi.downloadFiles(props.repoType, currentRepo.value, paths)
}

// 更改文件状态
async function handleChangeStatus() {
  if (!hasSelection.value) return

  if (currentRepo.value === '$tnt') {
    await resolveRepoId()
  }

  if (currentRepo.value === '$tnt') {
    ElMessage.error('无法获取有效仓库信息')
    return
  }

  fileChangeStatusDialogVisible.value = true
}

// 修复工具
function handleRepair() {
  jgitManageDialogVisible.value = true
}

// Git拉取
async function handleGitPull() {
  try {
    await gfsApi.gitPull(currentRepo.value)
    ElMessage.success('拉取最新Git库数据成功')
    loadFiles()
  } catch (error) {
    ElMessage.error(error?.message || '拉取最新Git库数据失败')
  }
}

// Git推送
async function handleGitPush() {
  try {
    await gfsApi.gitPush(currentRepo.value)
    ElMessage.success('推送最新本地数据到远程Git库成功')
  } catch (error) {
    ElMessage.error(error?.message || '推送最新本地数据到远程Git库失败')
  }
}

// Git库列表
function handleGitList() {
  gitRepoListDialogVisible.value = true
}

// 显示历史版本
function handleShowRevList(file) {
  revisionFile.value = file
  fileRevisionDialogVisible.value = true
}

// 搜索
function handleSearch() {
  // 搜索由 computed 自动处理
}

// 工具函数
function getFileIcon(file) {
  if (file._isParentDir) return 'fa fa-level-up fa-fw text-muted'
  if (file.directory) return 'fa fa-folder fa-fw folder-icon'

  const ext = file.name.split('.').pop()?.toLowerCase()
  const iconMap = {
    sh: 'fa fa-terminal fa-fw text-success',
    py: 'fa fa-python fa-fw text-info',
    js: 'fa fa-js fa-fw text-warning',
    json: 'fa fa-code fa-fw text-primary',
    yml: 'fa fa-file-code fa-fw text-info',
    yaml: 'fa fa-file-code fa-fw text-info',
    md: 'fa fa-file-alt fa-fw text-secondary',
    txt: 'fa fa-file-alt fa-fw text-muted',
    zip: 'fa fa-file-archive fa-fw text-warning',
    tar: 'fa fa-file-archive fa-fw text-warning'
  }
  return iconMap[ext] || 'fa fa-file-code fa-fw text-muted'
}

function formatFileSize(file) {
  if (file.directory || file._isParentDir) return '-'
  const size = file.size || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr

  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`
  if (diff < 31536000000) return `${Math.floor(diff / 2592000000)} 个月前`

  const pad = n => (n < 10 ? `0${n}` : String(n))
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 暴露方法给父组件
defineExpose({
  goDir,
  loadFiles,
  refresh
})
</script>

<style scoped lang="scss">
.script-file-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  background: var(--el-bg-color);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  min-height: 32px;
  flex-wrap: nowrap;
  overflow-x: auto;
}

/* 面包屑样式 */
.breadcrumb {
  display: flex;
  flex-wrap: nowrap;
  padding: 0;
  margin: 0;
  list-style: none;
  background: transparent;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.breadcrumb-item + .breadcrumb-item::before {
  content: '/';
  padding: 0 4px;
  color: #6c757d;
}

.breadcrumb-item.active {
  color: #6c757d;
}

.toolbar-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

/* 按钮组样式 */
.btn-group {
  display: inline-flex;
}

.btn-group :deep(.el-button) {
  border-radius: 0;
  margin-left: -1px;
  padding: 6px 8px;
  font-size: 12px;
}

.btn-group :deep(.el-button:first-child) {
  border-radius: 3px 0 0 3px;
  margin-left: 0;
}

.btn-group :deep(.el-button:last-child) {
  border-radius: 0 3px 3px 0;
}

.btn-group :deep(.el-button:only-child) {
  border-radius: 3px;
}

.git-actions :deep(.el-button) {
  font-weight: 500;
  font-size: 12px;
}

.dir-link,
.date-link {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: none;
}

.dir-link:hover,
.date-link:hover {
  text-decoration: underline;
}

.search-box .form-control {
  padding: 4px 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 3px;
  outline: none;
  font-size: 12px;
  width: 200px;
  height: 28px;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.search-box .form-control:focus {
  border-color: var(--el-color-primary);
}

.info-btn {
  padding: 6px 8px;
  padding: 8px 12px;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  border-radius: 10px;
  margin-left: 4px;
}

.bg-primary {
  background-color: var(--el-color-primary);
  color: #fff;
}

/* 文件状态帮助 */
.file-status-help dl {
  margin: 0;
}

.file-status-help dt {
  margin-top: 12px;
}

.file-status-help dt:first-child {
  margin-top: 0;
}

.file-status-help dd {
  margin: 4px 0 0 0;
  color: #6c757d;
  font-size: 13px;
}

.status-indicator {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 13px;
}

.status-indicator.stage-exist {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary-light-7);
}

.status-indicator.stage-rejected {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border: 1px solid var(--el-color-danger-light-7);
}

.status-indicator.master-disabled {
  background: var(--el-bg-color-page);
  color: #999;
  text-decoration: line-through;
}

.status-indicator.missing-file,
.status-indicator.missing-rec {
  color: #faad14;
}

.file-table-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

/* 文件夹图标特殊颜色 */
.folder-icon {
  color: #f59e0b !important; /* 黄色，与GfsFileSelector一致 */
}

.file-name {
  flex: 1;
  cursor: pointer;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-name:hover {
  color: var(--el-color-primary);
}

.file-actions {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 12px;
}

.el-table__row:hover .file-actions {
  opacity: 1;
}

.description-cell {
  color: var(--el-text-color-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #94a3b8;
}

.empty-state i {
  margin-bottom: 16px;
}

.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.success {
  background-color: #67c23a;
}

.status-dot.warning {
  background-color: #e6a23c;
}

.status-dot.danger {
  background-color: #f56c6c;
}

.status-dot.info {
  background-color: #909399;
}

/* Stage 类型（审核页面）特殊样式 */
.repo-stage {
  :deep(.el-table__header-wrapper) {
    th {
      background-color: var(--el-fill-color-light) !important;
      color: var(--el-text-color-regular) !important;
    }
  }

  :deep(.el-table__header) {
    th.el-table__cell {
      background-color: var(--el-fill-color-light) !important;
      color: var(--el-text-color-regular) !important;
    }
  }

  .toolbar-actions {
    justify-content: flex-end;
  }
}
</style>
