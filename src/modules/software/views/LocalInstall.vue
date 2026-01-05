<template>
  <div class="ops-page-layout local-install-page">
    <!-- 卡片容器 -->
    <div class="install-card">
      <!-- 标题区域 -->
      <div class="card-header">
        <i class="fa fa-box" />
        <span class="title">本地安装</span>
      </div>

      <!-- 说明文字 -->
      <div class="card-description">
        <p>选择本地RPM安装包，将其安装到指定的目标主机上。支持多文件选择和批量安装。</p>
      </div>

      <!-- 选择安装包 -->
      <div class="form-section">
        <div class="form-label">选择安装包</div>
        <div class="form-control">
          <el-button plain size="small" @click="openFileSelector">
            <i class="fa fa-folder-open" /> 选择文件
          </el-button>
          <span v-if="selectedFiles.length > 0" class="selected-info">
            已选择 {{ selectedFiles.length }} 个文件
          </span>
        </div>
        <!-- 已选文件列表 -->
        <div v-if="selectedFiles.length > 0" class="selected-files">
          <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
            <i class="fa fa-file-archive" />
            <span class="file-name">{{ file.name || file }}</span>
            <el-button type="danger" link size="small" @click="removeFile(index)">
              <i class="fa fa-times" />
            </el-button>
          </div>
        </div>
      </div>

      <!-- 选择目标主机 -->
      <div class="form-section">
        <div class="form-label">安装目标主机</div>
        <div class="form-control">
          <AcmDeviceSelector
            v-model="selectedHosts"
            ci-types="[auto]"
            :options="{
              selectMode: 'host,group,tag,input,recently',
              selector: 'multiple',
              label: '选择主机'
            }"
            :disabled="installing"
          />
        </div>
      </div>

      <!-- 开始安装按钮 -->
      <div class="form-section">
        <el-button
          type="primary"
          size="small"
          :loading="installing"
          :disabled="selectedFiles.length === 0 || selectedHosts.length === 0"
          @click="handleStartInstall"
        >
          <i class="fa fa-chevron-right" /> 开始安装
        </el-button>
      </div>
    </div>

    <!-- 文件选择器弹窗 -->
    <FileSelectorDialog
      v-model="fileSelectorVisible"
      :multiple="true"
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
import FileSelectorDialog from '../components/FileSelectorDialog.vue'
import { useJobPolling } from '@/composables/useJobPolling'

// 使用作业轮询 composable
const { startPolling } = useJobPolling()

const installing = ref(false)

// 文件选择器
const fileSelectorVisible = ref(false)
const selectedFiles = ref([])

// 主机选择器
const selectedHosts = ref([])

function openFileSelector() {
  fileSelectorVisible.value = true
}

function handleFilesConfirm(files) {
  selectedFiles.value = files
}

function removeFile(index) {
  selectedFiles.value.splice(index, 1)
}

async function handleStartInstall() {
  if (selectedFiles.length === 0) {
    ElMessage.warning('请选择安装包')
    return
  }
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定将 ${selectedFiles.value.length} 个安装包安装到 ${selectedHosts.value.length} 台主机吗？`,
      '确认安装',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    installing.value = true

    // 构建参数
    const hostsMap = selectedHosts.value.map(h => ({
      host_id: h.key || h.id,
      host_key: h.value || h.ip || h.host_key
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
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 100%;
  height: 100%;
  background: #f5f7fa;
}

.install-card {
  width: 40rem;
  max-width: 100%;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: #343a40;
  border-radius: 4px;
  color: #efefef;

  i {
    font-size: 24px;
  }

  .title {
    font-size: 24px;
    font-weight: 600;
  }
}

.card-description {
  margin-bottom: 24px;

  p {
    margin: 0;
    color: #606266;
    font-size: 14px;
    line-height: 1.6;
  }
}

.form-section {
  margin-bottom: 20px;

  .form-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .form-control {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .selected-info {
    color: #606266;
    font-size: 14px;
  }
}

.selected-files {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #fff;
    border-radius: 4px;
    margin-bottom: 6px;

    &:last-child {
      margin-bottom: 0;
    }

    i.fa-file-archive {
      color: #909399;
    }

    .file-name {
      flex: 1;
      font-size: 13px;
      color: #606266;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
