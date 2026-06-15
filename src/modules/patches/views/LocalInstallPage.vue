<template>
  <div class="ops-page-layout local-install-page">
    <div class="install-container">
      <!-- 左侧：安装包选择区 -->
      <div class="panel left-panel">
        <div class="panel-header">
          <i class="fa fa-box-open" />
          <span class="title">1. 选择软件包</span>
          <el-button type="primary" size="small" link @click="openFileSelector">
            <i class="fa fa-plus" />
            添加文件
          </el-button>
        </div>

        <div class="panel-body">
          <div v-if="selectedFiles.length === 0" class="empty-files" @click="openFileSelector">
            <i class="fa fa-folder-open" />
            <p>点击此处或上方按钮选择软件包</p>
          </div>
          <div v-else class="selected-files-list scroll-y">
            <div v-for="(file, index) in selectedFiles" :key="index" class="install-file-item">
              <div class="file-info">
                <i class="fa fa-cube" />
                <span class="file-name" :title="file.path">{{ file.name || file }}</span>
              </div>
              <el-button
                type="danger"
                link
                size="small"
                class="remove-btn"
                @click="removeFile(index)"
              >
                <i class="fa fa-trash-alt" />
              </el-button>
            </div>
          </div>
        </div>

        <div class="panel-footer">
          <span>共选择 {{ selectedFiles.length }} 个文件</span>
        </div>
      </div>

      <!-- 右侧：主机与操作区 -->
      <div class="panel right-panel">
        <div class="panel-header">
          <i class="fa fa-server" />
          <span class="title">2. 设置目标主机</span>
        </div>

        <div class="panel-body panel-body--hosts">
          <div class="host-selector-container">
            <AcmDeviceSelector
              v-model="selectedHosts"
              ci-types="[auto]"
              :options="{
                selectMode: 'host,group,tag,input,recently',
                selector: 'multiple',
                label: '选择目标主机'
              }"
              :disabled="installing"
            />
          </div>

          <div class="install-desc">
            <h4>软件包安装说明</h4>
            <ul>
              <li>仅支持 .rpm 格式的安装包</li>
              <li>勾选多个文件将进行批量并行安装</li>
              <li>安装过程中请勿刷新页面</li>
            </ul>
          </div>
        </div>

        <div class="panel-footer actions-footer">
          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="installing"
            :disabled="selectedFiles.length === 0 || selectedHosts.length === 0"
            @click="handleStartInstall"
          >
            <i class="fa fa-play-circle" />
            立即开始安装
          </el-button>
        </div>
      </div>
    </div>

    <!-- 文件选择器弹窗 -->
    <FileSelectorDialog
      v-model="fileSelectorVisible"
      title="选择软件包"
      :multiple="true"
      :pre-selected="selectedFiles"
      filter="*.rpm"
      repo-type="staticfs"
      @confirm="handleFilesConfirm"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { localInstallApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceSelection } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'
import FileSelectorDialog from '../components/local-install/FileSelectorDialog.vue'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling } = useJobPolling()

const installing = ref(false)
const RPM_FILE_PATTERN = /\.rpm$/i

// 文件选择器
const fileSelectorVisible = ref(false)
const selectedFiles = ref([])

// 主机选择器
const selectedHosts = ref([])

function openFileSelector() {
  fileSelectorVisible.value = true
}

function handleFilesConfirm(files) {
  const validFiles = (files || []).filter(file => {
    const fileName = file?.name || file?.path || ''
    return RPM_FILE_PATTERN.test(fileName)
  })

  if (validFiles.length !== (files || []).length) {
    ElMessage.warning('仅支持选择 .rpm 格式文件')
  }

  selectedFiles.value = validFiles
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

async function handleStartInstall() {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请选择软件包')
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定将 ${selectedFiles.value.length} 个软件包安装到 ${selectedHosts.value.length} 台主机吗？`,
      '确认安装',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    installing.value = true

    // 构建参数
    const hostsMap = normalizeAcmDeviceSelection(selectedHosts.value, 'linux').map(h => ({
      host_id: h.key,
      host_key: h.value
    }))

    const fileList = selectedFiles.value.map(f => f.path || f.name || f)
    const fileListParam = fileList.length === 1 ? fileList[0] : JSON.stringify(fileList)

    const response = await localInstallApi.startInstall({
      hosts: JSON.stringify(hostsMap),
      file_list: fileListParam
    })

    if (response && response[0] && response[0].runId) {
      const runId = response[0].runId
      // 使用 composable 开始轮询
      startPolling(runId, {
        interval: 5000,
        successMessage: '安装任务执行成功',
        errorMessage: '安装任务执行失败',
        onComplete: () => {
          installing.value = false
        }
      })
    } else {
      ElMessage.success('安装任务已提交')
      installing.value = false
    }

    // 清空选择
    selectedFiles.value = []
    selectedHosts.value = []
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to start install:', error)
      ElMessage.error('安装任务提交失败')
    }
    installing.value = false
  }
}
</script>

<style scoped lang="scss">
/* 此组件使用全局的 ops-page-layout 样式 */

.local-install-page {
  // background: var(--el-bg-color-page);
  padding: 20px;
  height: 100%;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.install-container {
  display: flex;
  gap: 20px;
  flex: 1;
  width: 100%;
  height: calc(100vh - 120px);
  min-width: 0;
  min-height: 0;
}

.panel {
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  &.left-panel {
    flex: 3;
    min-width: 0;
  }

  &.right-panel {
    flex: 2;
    min-width: 350px;
  }
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--el-fill-color-light);

  i {
    font-size: 18px;
    color: var(--el-color-primary);
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    flex: 1;
  }
}

.panel-body {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-body--hosts {
  gap: 16px;
}

.panel-footer {
  padding: 12px 20px;
  background: var(--el-bg-color-page);
  border-top: 1px solid var(--el-border-color-light);
  color: var(--el-text-color-secondary);
  font-size: 13px;

  &.actions-footer {
    display: flex;
    justify-content: flex-end;
    padding: 20px;
    background: var(--el-bg-color);
  }
}

// 左侧文件列表
.selected-files-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  .install-file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 15px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    margin-bottom: 10px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      .remove-btn {
        opacity: 1;
      }
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;

      i {
        color: #909399;
        font-size: 16px;
      }

      .file-name {
        font-size: 14px;
        color: var(--el-text-color-regular);
        word-break: break-all;
        line-height: 1.4;
      }
    }

    .remove-btn {
      opacity: 0.5;
      padding: 5px;
      &:hover {
        opacity: 1;
      }
    }
  }
}

.empty-files {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--el-border-color-light);
  border-radius: 8px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  i {
    font-size: 48px;
    margin-bottom: 15px;
  }
  p {
    font-size: 15px;
    margin: 0;
  }
}

// 右侧表单
.host-selector-container {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.host-selector-container :deep(.acm-device-selector) {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.host-selector-container :deep(.device-list-container) {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.host-selector-container :deep(.device-header) {
  flex-shrink: 0;
}

.host-selector-container :deep(.device-chip-list) {
  flex: 1;
  min-height: 12rem;
  max-height: none;
  align-content: flex-start;
}

.host-selector-container :deep(.empty-state) {
  display: flex;
  flex: 1;
  min-height: 12rem;
  align-items: center;
  justify-content: center;
}

.install-desc {
  flex-shrink: 0;
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
  padding: 15px 20px;
  border-left: 4px solid var(--el-color-warning);

  h4 {
    margin: 0 0 10px 0;
    color: var(--el-color-warning);
    font-size: 15px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    line-height: 1.8;
  }
}

.submit-btn {
  width: 100%;
  font-weight: 600;
  letter-spacing: 1px;
}

.scroll-y {
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-lighter);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>
