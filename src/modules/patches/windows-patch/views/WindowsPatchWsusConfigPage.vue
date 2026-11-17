<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="openCreateDialog">{{ t('patches.windows.createConfiguration') }}</el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadConfigs()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" :closable="false" show-icon>
      <el-button link type="primary" @click="loadConfigs()">{{ t('common.retry') }}</el-button>
    </el-alert>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="configList" max-height="calc(100vh - 254px)">
        <el-table-column :label="t('patches.windows.wsusAddress')" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['wsusUrl', 'wsus_url'], '-') }}
          </template>
        </el-table-column>
        <el-table-column :label="t('patches.windows.port')" width="90" align="center">
          <template #default="{ row }">
            {{ pickValue(row, ['wsusPort', 'wsus_port'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="HTTPS" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="
                normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false)) ? 'success' : 'info'
              "
              size="small"
            >
              {{ normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false)) ? t('automation.workbench.enable') : t('common.close') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.job.description')" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['description'], '-') }}
          </template>
        </el-table-column>
        <el-table-column :label="t('automation.command.updatedAt')" width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{
              formatDateTime(
                pickValue(row, ['updatedDate', 'updated_date', 'createdDate', 'created_date'], '')
              )
            }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" :width="currentLocale === 'en-US' ? 120 : 150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEditDialog(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
          </template>
        </el-table-column>
        <template #empty>
          {{ loading ? t('patches.windows.loadingWsus') : loadError || t('patches.windows.noWsus') }}
        </template>
      </el-table>
    </div>

    <WinPatchWsusConfigDialog
      v-model="dialogVisible"
      :config-data="editingConfig"
      @saved="loadConfigs"
    />
  </div>
</template>

<script setup>
import { createPatchTaskError } from '@/modules/patches/utils/patchTaskFeedback'
import { message as localMessage, messageRef } from '@/core/i18n/feedback'

import { t, currentLocale } from '@/core/i18n'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchWsusConfigDialog from '../components/wsus/WinPatchWsusConfigDialog.vue'
import { winPatchApi } from '../api'
import { formatDateTime, normalizeBoolean, pickValue } from '../utils'

const loading = ref(false)
const loadError = messageRef('')
let loadRequestId = 0
const configList = ref([])
const dialogVisible = ref(false)
const editingConfig = ref(null)

async function loadConfigs() {
  const requestId = ++loadRequestId
  loading.value = true
  loadError.value = ''
  configList.value = []
  try {
    const response = await winPatchApi.getWsusConfigs()
    if (requestId !== loadRequestId) return
    if (!Array.isArray(response?.data)) throw createPatchTaskError('patches.windows.invalidWsusResponse')
    configList.value = response.data
  } catch (error) {
    if (requestId !== loadRequestId) return
    loadError.value = localMessage('patches.windows.wsusLoadRetry')
    console.error('加载 WSUS 配置失败:', error)
    ElMessage.error(t('patches.windows.wsusLoadFailed'))
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

function openCreateDialog() {
  editingConfig.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingConfig.value = row
  dialogVisible.value = true
}

async function handleDelete(row) {
  const id = pickValue(row, ['id'], '')
  if (!id) return

  try {
    await ElMessageBox.confirm(t('patches.windows.deleteWsusConfirm'), t('automation.library.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
    await winPatchApi.deleteWsusConfig(id)
    ElMessage.success(t('patches.windows.wsusDeleted'))
    loadConfigs()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 WSUS 配置失败:', error)
      ElMessage.error(t('patches.windows.wsusDeleteFailed'))
    }
  }
}

onMounted(() => {
  loadConfigs()
})
onBeforeUnmount(() => {
  loadRequestId += 1
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
