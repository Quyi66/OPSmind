<template>
  <div class="script-file-list" :class="[`repo-${repoType}`, { 'is-english': currentLocale === 'en-US' }]">
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

    <section class="workspace-toolbar">
      <div class="workspace-toolbar__groups">
        <template v-if="repoType !== 'stage'">
          <div class="action-group action-group--primary">
            <el-button type="primary" @click="handleAddFolder">
              <i class="fa fa-fw fa-folder-plus" />
              {{ t('automation.library.folder') }}
            </el-button>
            <el-button v-if="repoType === 'git'" @click="scriptDialogVisible = true">
              <i class="fa fa-file-code" />
              {{ t('automation.library.script') }}
            </el-button>
            <el-button @click="uploadDialogVisible = true">
              <i class="fa fa-fw fa-file-upload" />
              {{ t('automation.library.file') }}
            </el-button>
            <el-button v-if="repoType === 'git'" @click="syncDialogVisible = true">
              <i class="fa fa-cloud" />
              {{ t('automation.library.syncFiles') }}
            </el-button>
          </div>

          <div class="action-group">
            <el-button :disabled="!hasSelection" @click="handleDelete">
              <i class="fa fa-fw fa-trash-alt" />
              {{ t('common.delete') }}
            </el-button>
            <el-button :disabled="!hasSelection" @click="handleDownload">
              <i class="fa fa-download" />
              {{ t('automation.file.download') }}
            </el-button>
          </div>

          <div v-if="repoType === 'git'" class="action-group">
            <el-button @click="goBaseRepo">
              <i class="fa fa-fw fa-scroll" />
              {{ t('automation.library.builtinAppScripts') }}
            </el-button>
            <el-button @click="handleGitPull">
              <i class="fa fa-cloud-download-alt fa-fw" />
              {{ t('automation.library.pull') }}
            </el-button>
            <el-button @click="handleGitPush">
              <i class="fa fa-cloud-upload-alt fa-fw" />
              {{ t('automation.library.push') }}
            </el-button>
          </div>

          <el-dropdown class="utility-menu" trigger="click" @command="handleUtilityCommand">
            <el-button>
              <i class="fa fa-sliders-h" />
              {{ t('automation.library.moreActions') }}
              <i class="fa fa-chevron-down action-caret" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="cut" :disabled="!hasSelection">
                  <i class="fa fa-cut fa-fw" />
                  {{ t('automation.library.cut') }}
                </el-dropdown-item>
                <el-dropdown-item command="paste" :disabled="!canPaste">
                  <i class="fa fa-paste fa-fw" />
                  {{ t('automation.library.paste') }}
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="repoType === 'git'"
                  command="changeStatus"
                  :disabled="!hasSelection"
                >
                  <i class="fa fa-stop-circle fa-fw" />
                  {{ t('automation.library.toggle') }}
                </el-dropdown-item>
                <el-dropdown-item divided command="refresh">
                  <i class="fa fa-sync-alt fa-fw" />
                  {{ t('automation.library.refreshList') }}
                </el-dropdown-item>
                <el-dropdown-item command="repair">
                  <i class="fa fa-tools fa-fw" />
                  {{ t('automation.library.repair') }}
                </el-dropdown-item>
                <el-dropdown-item v-if="repoType === 'git'" command="gitList">
                  <i class="fa fa-list-alt fa-fw" />
                  {{ t('automation.library.gitRepos') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <template v-else>
          <div class="action-group action-group--primary">
            <el-button
              type="primary"
              :disabled="!hasSelection"
              :title="t('automation.library.reviewSelectedTitle')"
              @click="fileApproveDialogVisible = true"
            >
              {{ t('automation.library.reviewSelected') }}
            </el-button>
            <el-button @click="approvalHistoryDialogVisible = true">{{ t('automation.library.approvalHistory') }}</el-button>
          </div>
        </template>
      </div>

      <div class="workspace-toolbar__search">
        <el-input
          v-model="searchText"
          clearable
          :placeholder="searchPlaceholder"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>

        <el-popover v-if="repoType === 'git'" placement="bottom-end" :width="320" trigger="click">
          <template #reference>
            <el-button class="info-btn" :title="t('automation.library.fileStatus')">
              <i class="fa fa-info" />
            </el-button>
          </template>
          <div class="file-status-help">
            <dl>
              <dt><span class="status-indicator stage-exist">filename</span></dt>
              <dd>{{ t('automation.library.newVersionPending') }}</dd>
              <dt><span class="status-indicator stage-rejected">filename</span></dt>
              <dd>{{ t('automation.library.newVersionRejected') }}</dd>
              <dt><span class="status-indicator master-disabled">filename</span></dt>
              <dd>{{ t('automation.library.fileDisabled') }}</dd>
              <dt>
                <span class="status-indicator missing-file">
                  filename
                  <i class="fa fa-exclamation-triangle" />
                </span>
              </dt>
              <dd>{{ t('automation.library.fileMissing') }}</dd>
              <dt>
                <span class="status-indicator missing-rec">
                  filename
                  <i class="fa fa-exclamation-triangle" />
                </span>
              </dt>
              <dd>{{ t('automation.library.recordMissing') }}</dd>
            </dl>
          </div>
        </el-popover>
      </div>
    </section>

    <div v-if="showSelectionBanner" class="selection-banner">
      <div class="selection-banner__content">
        <strong>{{ selectionBannerTitle }}</strong>
        <span>{{ selectionBannerDescription }}</span>
      </div>
      <div class="selection-banner__chips">
        <span class="selection-banner__chip">{{ t('automation.library.selectedCount', { count: selectedFiles.length }) }}</span>
        <span v-if="clipboard.length" class="selection-banner__chip">
          {{ t('automation.library.clipboardCount', { count: clipboard.length }) }}
        </span>
      </div>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadFiles">{{ t('common.retry') }}</el-button>
    </el-alert>

    <div
      class="file-table-container"
      :class="{ 'is-empty': !loading && filteredFiles.length === 0 }"
    >
      <template v-if="!loading && filteredFiles.length === 0">
        <div class="empty-state">
          <i :class="repoMeta.emptyIcon" />
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateDescription }}</p>
          <div v-if="!loadError && repoType !== 'stage'" class="empty-state__actions">
            <el-button type="primary" @click="handleAddFolder">{{ t('automation.library.newFolder') }}</el-button>
            <el-button @click="uploadDialogVisible = true">{{ t('automation.library.uploadFiles') }}</el-button>
          </div>
        </div>
      </template>

      <el-table
        v-else
        v-loading="loading"
        :data="paginatedFiles"
        ref="fileTableRef"
        height="100%"
        row-key="_key"
        :default-sort="sortState"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column
          type="selection"
          width="40"
          :selectable="isSelectable"
          :reserve-selection="true"
        />

        <el-table-column :label="t('common.name')" min-width="300" sortable="custom" prop="name">
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
                      {{ t('automation.library.downloadFile') }}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!row.directory" command="edit">
                      <i class="fa fa-pencil fa-fw" />
                      {{ t('automation.library.editInfo') }}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.canDelete" command="delete">
                      <i class="fa fa-trash-alt fa-fw" />
                      {{ t('automation.library.deleteFile') }}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.directory && repoType === 'git'" command="editDir">
                      <i class="fa fa-pencil fa-fw" />
                      {{ t('automation.library.editInfo') }}
                    </el-dropdown-item>
                    <!-- <el-dropdown-item v-if="!row.directory && repoType === 'git'" command="testRun">
                      <i class="fa fa-chevron-right fa-fw" />
                      测试运行
                    </el-dropdown-item> -->
                    <el-dropdown-item v-if="!row.directory && repoType === 'git'" command="history">
                      <i class="fa fa-comment-alt-dots fa-fw" />
                      {{ t('automation.library.approvalHistory') }}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.directory" command="downloadDir">
                      <i class="fa fa-file-download fa-fw" />
                      {{ t('automation.library.downloadFolder') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          v-if="repoType === 'git' || repoType === 'stage'"
          :label="t('automation.library.description')"
          prop="description"
          min-width="200"
        >
          <template #default="{ row }">
            <div class="description-cell" :title="row.description">
              {{ row.description || '-' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.library.size')" prop="size" width="100" sortable="custom">
          <template #default="{ row }">
            {{ formatFileSize(row) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('automation.library.modifiedDate')" prop="lastModified" :width="currentLocale === 'en-US' ? 160 : 120" sortable="custom">
          <template #default="{ row }">
            <a
              v-if="row.lastModified && !row.directory && !row._isParentDir && repoType === 'git'"
              class="date-link"
              :title="t('automation.library.revisions')"
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
          :label="t('automation.workbench.status')"
          width="110"
          align="left"
        >
          <template #default="{ row }">
            <div v-if="row._statusCss && !row.directory && !row._isParentDir" class="status-cell">
              <span class="status-dot" :class="row._statusCss" />
              <span>{{ getFileStatusText(row) || t('automation.command.unknown') }}</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页组件 -->
    <div class="pagination-container" v-if="filteredFiles.length > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="filteredFiles.length"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

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
      :open-mode="contentDialogMode"
      :repo-type="contentRepoType"
      :repo="contentRepo || currentRepo"
      :file="currentFile"
      @updated="handleContentUpdated"
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
      @open-file="handleRevisionFileOpen"
    />
  </div>
</template>

<script setup>
import { t, currentLocale } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'
import { getFileStatusText } from '@/modules/automation/utils/filePresentation'

import { ref, computed, onMounted, onBeforeUnmount, onDeactivated, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'
import { sortScriptFiles } from '@/modules/automation/utils/scriptFileSort'
import { toKnownNumber } from '@/utils/workspacePresentation'
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
} from '../../components/script/dialogs'

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
const loadError = messageRef('')
let fileRequest = 0
let repoRequest = 0
let mounted = false
const currentDir = ref('')
const fileList = ref([])
const selectedFiles = ref([])
const searchText = ref('')
const fileTableRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(20)
const sortState = ref({ prop: '', order: null })
const clipboard = ref([])
const clipboardDir = ref('')
const hideOplus = ref(true) // 是否隐藏内置应用脚本目录(oplus)
const contentRepo = ref('') // 用于文件内容弹窗的 repo（审批历史可返回真实 repo）
const contentRepoType = ref(props.repoType) // 用于文件内容弹窗的仓库类型（审批历史需要强制用 git）
const contentDialogMode = ref('view') // 文件内容弹窗打开模式：预览或直接进入修改信息

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

const repoMeta = computed(() => {
  const iconMap = {
    git: 'fa fa-folder-open',
    staticfs: 'fa fa-box-open',
    stage: 'fa fa-clipboard-check'
  }

  return {
    emptyIcon: iconMap[props.repoType] || iconMap.git
  }
})

const searchPlaceholder = computed(() => {
  if (props.repoType === 'stage') return t('automation.library.reviewSearch')
  return t('automation.library.search')
})

const showSelectionBanner = computed(
  () => selectedFiles.value.length > 0 || clipboard.value.length > 0
)

const selectionBannerTitle = computed(() => {
  if (props.repoType === 'stage') {
    return selectedFiles.value.length > 0 ? t('automation.library.reviewSelection') : t('automation.library.pendingItems')
  }
  return selectedFiles.value.length > 0 ? t('automation.library.selectedItems') : t('automation.library.pastePending')
})

const selectionBannerDescription = computed(() => {
  if (props.repoType === 'stage') {
    return selectedFiles.value.length > 0
      ? t('automation.library.reviewSelectionHint', { count: selectedFiles.value.length })
      : t('automation.library.noSelectedReview')
  }

  if (selectedFiles.value.length > 0 && clipboard.value.length > 0) {
    return t('automation.library.selectionClipboardHint', { selected: selectedFiles.value.length, clipboard: clipboard.value.length })
  }

  if (selectedFiles.value.length > 0) {
    return t('automation.library.selectionActionsHint', { count: selectedFiles.value.length })
  }

  return t('automation.library.clipboardHint', { count: clipboard.value.length })
})

const emptyStateTitle = computed(() => {
  if (loadError.value) return t('automation.library.readFailedTitle')
  if (searchText.value) return t('automation.library.noMatch')
  if (props.repoType === 'stage') return t('automation.library.noPendingReview')
  return currentDir.value ? t('automation.library.emptyDirectory') : t('automation.library.emptyRepo')
})

const emptyStateDescription = computed(() => {
  if (loadError.value) return t('automation.library.retryDirectory')
  if (searchText.value) return t('automation.library.searchHint')
  if (props.repoType === 'stage') return t('automation.library.reviewEmptyHint')
  return t('automation.library.emptyHint')
})

async function resolveRepoId() {
  const request = ++repoRequest
  const repo = props.repo
  if (repo !== '$tnt') {
    currentRepo.value = repo
    return
  }

  // Try to load current repo info
  try {
    const res = await gfsApi.loadCurrentRepo('git', '$tnt')
    if (request !== repoRequest || props.repo !== repo) return
    const repoInfo = res?.data || res
    if (repoInfo?.id) {
      currentRepo.value = repoInfo.id
      return
    }
  } catch (e) {
    if (request !== repoRequest || props.repo !== repo) return
    // If failed, just use $tnt as default
    console.warn('Failed to resolve repo id, using $tnt as default', e)
  }
}

watch(
  () => [props.repo, props.repoType],
  () => {
    currentRepo.value = props.repo
    currentPage.value = 1
    resolveRepoId()
    if (mounted) loadFiles()
  },
  { immediate: true }
)

const breadcrumbs = computed(() => {
  const crumbs = [{ name: '~', path: '' }]

  if (!currentDir.value) return crumbs

  const dirs = currentDir.value.split('/')
  let path = ''

  dirs.forEach(dir => {
    path = path ? `${path}/${dir}` : dir
    crumbs.push({ name: dir, path })
  })

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
  const search = searchText.value.trim().toLowerCase()
  if (search) {
    list = list.filter(
      f =>
        f.name.toLowerCase().includes(search) ||
        (f.description && f.description.toLowerCase().includes(search))
    )
  }

  return sortScriptFiles(list, sortState.value)
})

// 分页过滤后的文件列表
const paginatedFiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredFiles.value.slice(start, end)
})

watch(searchText, () => {
  currentPage.value = 1
})

function handleSizeChange() {
  currentPage.value = 1
}

function handleSortChange({ prop, order }) {
  sortState.value = { prop, order }
  currentPage.value = 1
}

function handleCurrentChange() {
  const tableBody = fileTableRef.value?.$el?.querySelector('.el-table__body-wrapper')
  if (tableBody) {
    tableBody.scrollTop = 0
  }
}

// 是否有选中
const hasSelection = computed(() => selectedFiles.value.length > 0)

// 是否可以粘贴
const canPaste = computed(() => {
  if (!clipboard.value.length) return false
  const isPasteInCut = clipboard.value.some(f => {
    const path = typeof f.path === 'string' ? f.path.replace(/\/+$/, '') : ''
    return !path || currentDir.value === path || currentDir.value.startsWith(`${path}/`)
  })
  return !isPasteInCut && clipboardDir.value !== currentDir.value
})

// 初始化
onMounted(() => {
  mounted = true
  currentDir.value = props.initialDir
  loadFiles()
})

// 监听目录变化
watch(currentDir, newDir => {
  emit('dir-change', newDir)
})

// 加载文件列表
async function loadFiles() {
  const request = ++fileRequest
  const dir = currentDir.value
  const repo = props.repo
  const repoType = props.repoType
  const isCurrent = () =>
    request === fileRequest &&
    dir === currentDir.value &&
    repo === props.repo &&
    repoType === props.repoType
  loading.value = true
  loadError.value = ''
  fileList.value = []
  selectedFiles.value = []
  fileTableRef.value?.clearSelection()
  try {
    const files = await gfsApi.listFiles(currentRepo.value, dir, repoType)
    if (!isCurrent()) return false

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

    if (dir) {
      const parentDir = dir.split('/').slice(0, -1).join('/')
      processed.unshift({
        name: '..',
        directory: true,
        path: parentDir,
        _isParentDir: true,
        _selectable: false
      })
    }

    fileList.value = processed
    currentPage.value = Math.min(
      currentPage.value,
      Math.max(1, Math.ceil(filteredFiles.value.length / pageSize.value))
    )
    if (fileTableRef.value) {
      fileTableRef.value.clearSelection()
    }
    return true
  } catch (error) {
    if (!isCurrent()) return false
    loadError.value = message('automation.library.readFailedRetry')
    ElMessage.error(error?.message || t('automation.library.readFailed'))
    return false
  } finally {
    if (isCurrent()) loading.value = false
  }
}

function invalidateFileRead() {
  fileRequest += 1
  repoRequest += 1
  if (loading.value) loadError.value = message('automation.library.readInterrupted')
  loading.value = false
}
onBeforeUnmount(invalidateFileRead)
onDeactivated(invalidateFileRead)

// 刷新
async function refresh() {
  if (await loadFiles()) ElMessage.success(t('automation.library.refreshed'))
}

function handleUtilityCommand(command) {
  switch (command) {
    case 'cut':
      handleCut()
      break
    case 'paste':
      handlePaste()
      break
    case 'changeStatus':
      handleChangeStatus()
      break
    case 'refresh':
      refresh()
      break
    case 'repair':
      handleRepair()
      break
    case 'goBaseRepo':
      goBaseRepo()
      break
    case 'gitPull':
      handleGitPull()
      break
    case 'gitPush':
      handleGitPush()
      break
    case 'gitList':
      handleGitList()
      break
  }
}

// 进入目录
function goDir(dir) {
  currentDir.value = dir
  currentPage.value = 1
  loadFiles()
}

// 审批历史中点击文件路径，直接打开文件内容弹窗
function handleHistoryFileOpen(payload) {
  const path = typeof payload === 'string' ? payload : payload?.path
  if (!path) return

  const repoFromPayload = typeof payload === 'object' ? payload.repo : ''
  openFileContent(
    {
      path,
      name: path.split('/').pop()
    },
    {
      repoType: 'git',
      repo: repoFromPayload || currentRepo.value,
      mode: 'view'
    }
  )
}

function handleRevisionFileOpen(payload) {
  const path = typeof payload === 'string' ? payload : payload?.path
  if (!path) return

  const repoFromPayload = typeof payload === 'object' ? payload.repo : ''
  openFileContent(
    {
      path,
      name: path.split('/').pop()
    },
    {
      repoType: 'git',
      repo: repoFromPayload || currentRepo.value,
      mode: 'view'
    }
  )
}

// 进入内置应用脚本目录
function goBaseRepo() {
  hideOplus.value = false // 显示 oplus 目录
  goDir('oplus')
}

// 文件点击
function handleFileClick(file) {
  if (file.directory) {
    goDir(file.path)
  } else if (file.conflict !== 'FileNotFound') {
    openFileContent(file)
  }
}

function openFileContent(file, options = {}) {
  contentDialogMode.value = options.mode || 'view'
  contentRepoType.value = options.repoType || props.repoType
  contentRepo.value = options.repo || currentRepo.value
  currentFile.value = file
  contentDialogVisible.value = true
}

function handleContentUpdated() {
  loadFiles()
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
      if (file.conflict === 'FileNotFound') {
        ElMessage.error(t('automation.library.missingForEdit'))
        break
      }
      openFileContent(file, { mode: 'edit' })
      break
    case 'delete':
      handleDeleteSingle(file)
      break
    case 'editDir':
      editFolderData.value = file
      folderDialogVisible.value = true
      break
    case 'testRun':
      ElMessage.info(t('automation.library.testRunPending'))
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
  ElMessage.success(t('automation.library.cutCount', { count: clipboard.value.length }))
}

// 粘贴
async function handlePaste() {
  if (!canPaste.value) return
  try {
    const paths = clipboard.value.map(f => f.path)
    await gfsApi.moveFiles(props.repoType, currentRepo.value, currentDir.value, paths)
    clipboard.value = []
    clipboardDir.value = ''
    ElMessage.success(t('automation.list.moved'))
    loadFiles()
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.moveFailed'))
  }
}

// 删除
async function handleDelete() {
  if (!hasSelection.value) return
  try {
    await ElMessageBox.confirm(t('automation.library.deleteSelectionConfirm'), t('automation.library.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
    const paths = selectedFiles.value.map(f => f.path)
    await gfsApi.deleteFiles(props.repoType, currentRepo.value, paths)
    ElMessage.success(t('automation.workbench.deleted'))
    selectedFiles.value = []
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.workbench.deleteFailed'))
    }
  }
}

// 删除单个
async function handleDeleteSingle(file) {
  try {
    await ElMessageBox.confirm(t('automation.library.deleteFileConfirm', { name: file.name }), t('automation.library.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
    await gfsApi.deleteFiles(props.repoType, currentRepo.value, [file.path])
    ElMessage.success(t('automation.workbench.deleted'))
    loadFiles()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || t('automation.workbench.deleteFailed'))
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
    ElMessage.error(t('automation.library.invalidRepo'))
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
    ElMessage.success(t('automation.library.pulled'))
    loadFiles()
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.pullFailed'))
  }
}

// Git推送
async function handleGitPush() {
  try {
    await gfsApi.gitPush(currentRepo.value)
    ElMessage.success(t('automation.library.pushed'))
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.pushFailed'))
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
  const size = toKnownNumber(file.size)
  if (size === null) return '-'
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

  if (diff < 60000) return t('automation.file.justNow')
  if (diff < 3600000) return t('automation.file.minutesAgo', { count: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('automation.file.hoursAgo', { count: Math.floor(diff / 3600000) })
  if (diff < 2592000000) return t('automation.file.daysAgo', { count: Math.floor(diff / 86400000) })
  if (diff < 31536000000) return t('automation.library.monthsAgo', { count: Math.floor(diff / 2592000000) })

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
  --script-list-secondary-text: var(--el-text-color-secondary);
  --script-list-muted-text: var(--el-text-color-placeholder);
  --script-list-selection-bg: color-mix(in srgb, var(--el-color-primary-light-9) 82%, white);
  --script-list-selection-chip-bg: rgba(255, 255, 255, 0.92);
  --script-list-selection-chip-border: var(--el-color-primary-light-7);
  --script-list-empty-text: #94a3b8;
  --script-list-action-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  gap: 12px;
  background: var(--el-bg-color);

  .pagination-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
    padding: 0 4px;
    flex-shrink: 0;
  }
}

.breadcrumb {
  display: flex;
  flex-wrap: nowrap;
  padding: 10px 12px;
  margin: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: var(--el-bg-color);
  font-size: 13px;
  white-space: nowrap;
  overflow-x: auto;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.breadcrumb-item + .breadcrumb-item::before {
  content: '/';
  padding: 0 6px;
  color: var(--el-text-color-secondary);
}

.breadcrumb-item.active {
  color: var(--el-text-color-secondary);
}

.workspace-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
}

.workspace-toolbar__groups {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.workspace-toolbar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: min(320px, 100%);
}

.workspace-toolbar__search :deep(.el-input) {
  min-width: 240px;
}

.script-file-list.is-english.repo-stage .workspace-toolbar__search {
  min-width: min(420px, 100%);
}

.script-file-list.is-english.repo-stage .workspace-toolbar__search :deep(.el-input) {
  min-width: 360px;
}

@media (max-width: 1200px) {
  .script-file-list.is-english.repo-stage .workspace-toolbar__search :deep(.el-input) {
    min-width: 0;
  }
}

/* 按钮组样式 */
.action-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-group :deep(.el-button) {
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

.action-group--primary :deep(.el-button) {
  box-shadow: var(--script-list-action-shadow);
}

.utility-menu :deep(.el-button) {
  min-height: 34px;
}

.action-caret {
  margin-left: 8px;
  font-size: 10px;
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

.info-btn {
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
  color: var(--script-list-secondary-text);
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
  color: var(--script-list-muted-text);
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
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
}

.file-table-container.is-empty {
  display: flex;
  align-items: center;
  justify-content: center;
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
  gap: 10px;
  min-height: 360px;
  padding: 40px 24px;
  color: var(--script-list-empty-text);
  text-align: center;
}

.empty-state i {
  font-size: 38px;
  margin-bottom: 4px;
}

.empty-state h3 {
  margin: 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.empty-state p {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.6;
}

.empty-state__actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
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

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.selection-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 14px;
  background: var(--script-list-selection-bg);
}

.selection-banner__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selection-banner__content strong {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.selection-banner__content span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.selection-banner__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selection-banner__chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--script-list-selection-chip-bg);
  border: 1px solid var(--script-list-selection-chip-border);
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
}

@media (max-width: 1200px) {
  .workspace-toolbar,
  .selection-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .workspace-toolbar__search {
    min-width: 0;
    width: 100%;
  }

  .workspace-toolbar__search :deep(.el-input) {
    min-width: 0;
    flex: 1;
  }

  .selection-banner__chips {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .script-file-list {
    padding: 10px;
  }

  .breadcrumb,
  .workspace-toolbar,
  .selection-banner {
    padding: 12px;
  }

  .empty-state__actions {
    flex-direction: column;
  }
}
</style>

<style lang="scss">
html.dark .script-file-list {
  --script-list-selection-bg: color-mix(
    in srgb,
    var(--el-color-primary) 14%,
    rgba(15, 23, 42, 0.92)
  );
  --script-list-selection-chip-bg: rgba(15, 23, 42, 0.88);
  --script-list-selection-chip-border: rgba(96, 165, 250, 0.3);
  --script-list-empty-text: #94a3b8;
  --script-list-muted-text: #94a3b8;
  --script-list-action-shadow: 0 10px 20px rgba(0, 0, 0, 0.18);
}
</style>
