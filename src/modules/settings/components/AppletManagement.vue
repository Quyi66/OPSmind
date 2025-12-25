<template>
  <div class="ops-page-layout">
    <!-- Tab 页 -->
    <el-tabs v-model="activeTab" class="applet-tabs">
      <!-- 应用管理 Tab -->
      <el-tab-pane label="应用" name="app">
        <div class="toolbar">
          <el-button
            type="primary"
            :disabled="selectedApplets.length === 0"
            @click="handleExport"
          >
            <i class="fa fa-caret-square-right"></i> 导出
          </el-button>
          <el-button @click="handleImport">
            <i class="fa fa-caret-square-right"></i> 导入
          </el-button>
          <el-button :icon="Refresh" @click="loadApplets" :loading="loading" title="刷新" />
        </div>

        <el-table
          v-loading="loading"
          :data="applets"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="Code" width="120" />
          <el-table-column prop="title" label="标题" min-width="150">
            <template #default="{ row }">
              {{ formatTitle(row.title) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" align="left">
            <template #default="{ row }">
              <el-tag :type="row.status === 'P' ? 'success' : 'danger'" size="small">
                {{ row.status === 'P' ? '已启用' : '已禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="modifiedAt" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.modifiedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="left">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="handleView(row)">
                查看
              </el-button>
              <el-button link type="warning" size="small" @click="handleCopy(row)">
                复制
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                @click="handleDelete(row)"
                :loading="deletingId === row.id"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 回收站 Tab -->
      <el-tab-pane label="回收站" name="can">
        <div class="toolbar">
          <el-button type="danger" @click="handleClearRecycle" :loading="clearingRecycle">
            <i class="fa fa-trash-alt"></i> 清空回收站
          </el-button>
          <el-button
            type="danger"
            :disabled="selectedRecycled.length === 0"
            @click="handleDeleteSelectedRecycle"
          >
            <i class="fa fa-trash-alt"></i> 删除选中
          </el-button>
          <el-button
            type="warning"
            :disabled="selectedRecycled.length === 0"
            @click="handleRecoverSelectedRecycle"
          >
            <i class="fa fa-redo"></i> 恢复选中
          </el-button>
          <el-button :icon="Refresh" @click="loadRecycledApplets" :loading="recycleLoading">
            刷新
          </el-button>
        </div>

        <el-table
          v-loading="recycleLoading"
          :data="recycledApplets"
          border
          stripe
          style="width: 100%"
          @selection-change="handleRecycleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="appletCode" label="Code" width="120" />
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="createBy" label="创建人" width="100" />
          <el-table-column prop="createTime" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createTime) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right" align="left">
            <template #default="{ row }">
              <el-button link type="warning" size="small" @click="handleRecoverRecycle(row)">
                恢复
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                @click="handleDeleteRecycle(row)"
                :loading="deletingRecycleId === row.appletCode"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 详情对话框 -->
    <AppletDetailDialog
      v-model="detailDialogVisible"
      :applet="currentApplet"
      @saved="handleSaved"
    />

    <!-- 复制对话框 -->
    <AppletCopyDialog
      v-model="copyDialogVisible"
      :applet="currentApplet"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import * as appletApi from '@/modules/settings/api/applet'
import AppletDetailDialog from './AppletDetailDialog.vue'
import AppletCopyDialog from './AppletCopyDialog.vue'

const activeTab = ref('app')
const loading = ref(false)
const recycleLoading = ref(false)
const applets = ref([])
const recycledApplets = ref([])
const selectedApplets = ref([])
const selectedRecycled = ref([])
const deletingId = ref(null)
const deletingRecycleId = ref(null)
const clearingRecycle = ref(false)

const detailDialogVisible = ref(false)
const copyDialogVisible = ref(false)
const currentApplet = ref(null)

onMounted(() => {
  loadApplets()
})

watch(activeTab, (val) => {
  if (val === 'can' && recycledApplets.value.length === 0) {
    loadRecycledApplets()
  }
})

async function loadApplets() {
  loading.value = true
  try {
    const response = await appletApi.getApplets()
    applets.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load applets:', error)
    ElMessage.error('加载应用列表失败')
  } finally {
    loading.value = false
  }
}

async function loadRecycledApplets() {
  recycleLoading.value = true
  try {
    const response = await appletApi.getRecycledApplets()
    recycledApplets.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load recycled applets:', error)
    ElMessage.error('加载回收站失败')
  } finally {
    recycleLoading.value = false
  }
}

function formatTitle(title) {
  if (!title) return ''
  if (title.startsWith('#{') && title.endsWith('}')) {
    const key = title.slice(2, -1)
    const parts = key.split('.')
    return parts[parts.length - 1] || title
  }
  return title
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function handleSelectionChange(selection) {
  selectedApplets.value = selection.map(item => item.id)
}

function handleRecycleSelectionChange(selection) {
  selectedRecycled.value = selection.map(item => item.appletCode)
}

function handleView(row) {
  currentApplet.value = row
  detailDialogVisible.value = true
}

function handleCopy(row) {
  currentApplet.value = row
  copyDialogVisible.value = true
}

function handleExport() {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中')
}

function handleImport() {
  // TODO: 实现导入功能
  ElMessage.info('导入功能开发中')
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用 "${formatTitle(row.title)}" 吗？删除后将移至回收站。`,
      '确认删除',
      { type: 'warning' }
    )

    deletingId.value = row.id
    await appletApi.deleteApplet(row.id)
    ElMessage.success('删除成功')
    loadApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete applet:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deletingId.value = null
  }
}

async function handleDeleteRecycle(row) {
  try {
    await ElMessageBox.confirm(
      `确定要永久删除应用 "${row.title}" 吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )

    deletingRecycleId.value = row.appletCode
    await appletApi.deleteRecycledApplet(row.appletCode)
    ElMessage.success('删除成功')
    loadRecycledApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete recycled applet:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    deletingRecycleId.value = null
  }
}

async function handleRecoverRecycle(row) {
  try {
    await ElMessageBox.confirm(
      `确定要恢复应用 "${row.title}" 吗？`,
      '确认恢复',
      { type: 'info' }
    )

    await appletApi.recoverRecycledApplet([row.appletCode])
    ElMessage.success('恢复成功')
    loadRecycledApplets()
    loadApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to recover applet:', error)
      ElMessage.error('恢复失败')
    }
  }
}

async function handleDeleteSelectedRecycle() {
  if (selectedRecycled.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要永久删除选中的 ${selectedRecycled.value.length} 个应用吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )

    await appletApi.deleteRecycledApplets(selectedRecycled.value)
    ElMessage.success('删除成功')
    loadRecycledApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete recycled applets:', error)
      ElMessage.error('删除失败')
    }
  }
}

async function handleRecoverSelectedRecycle() {
  if (selectedRecycled.value.length === 0) return

  try {
    await ElMessageBox.confirm(
      `确定要恢复选中的 ${selectedRecycled.value.length} 个应用吗？`,
      '确认恢复',
      { type: 'info' }
    )

    await appletApi.recoverRecycledApplet(selectedRecycled.value)
    ElMessage.success('恢复成功')
    loadRecycledApplets()
    loadApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to recover applets:', error)
      ElMessage.error('恢复失败')
    }
  }
}

async function handleClearRecycle() {
  try {
    await ElMessageBox.confirm(
      '确定要清空回收站吗？此操作将永久删除所有回收站中的应用，不可恢复。',
      '确认清空',
      { type: 'warning' }
    )

    clearingRecycle.value = true
    await appletApi.clearRecycledApplets()
    ElMessage.success('清空成功')
    loadRecycledApplets()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to clear recycle:', error)
      ElMessage.error('清空失败')
    }
  } finally {
    clearingRecycle.value = false
  }
}

function handleSaved() {
  loadApplets()
}
</script>

<style scoped lang="scss">
.applet-management {
  padding: 16px;
}

.page-header {
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
}

.applet-tabs {
  :deep(.el-tabs__content) {
    padding: 0;
  }
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 12px;

  i {
    margin-right: 4px;
  }
}
</style>
