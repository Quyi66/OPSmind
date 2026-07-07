<template>
  <div class="ops-page-layout">
    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="ops-tabs">
      <!-- 应用管理 Tab -->
      <el-tab-pane label="应用" name="app">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-input
            v-model="appSearchKeyword"
            placeholder="搜索Code/标题"
            clearable
            style="width: 220px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="selectedApplets.length === 0"
            @click="handleExport"
          >
            <i class="fa fa-download"></i>
            导出
          </el-button>
          <el-button size="small" @click="handleImport">
            <i class="fa fa-upload"></i>
            导入
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="loading"
            @click="loadApplets"
            title="刷新"
          >
            <el-icon v-show="!loading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="loading"
            :data="paginatedApplets"
            style="width: 100%"
            max-height="calc(100vh - 364px)"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="Code" width="120" />
            <el-table-column prop="title" label="标题" min-width="150">
              <template #default="{ row }">
                {{ translateText(row.title) }}
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
            <el-table-column label="操作" width="150" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleView(row)">
                  查看
                </el-button>
                <el-button text type="primary" size="small" @click="handleCopy(row)">
                  复制
                </el-button>
                <el-button
                  text
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
        </div>

        <!-- 分页器 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="appPagination.page"
            v-model:page-size="appPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredApplets.length"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </el-tab-pane>

      <!-- 回收站 Tab -->
      <el-tab-pane label="回收站" name="can">
        <!-- 筛选区 -->
        <div class="ops-filter-bar">
          <el-input
            v-model="recycleSearchKeyword"
            placeholder="搜索Code/标题"
            clearable
            style="width: 220px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 操作栏 -->
        <div class="ops-action-bar">
          <el-button
            type="danger"
            size="small"
            @click="handleClearRecycle"
            :loading="clearingRecycle"
          >
            <i class="fa fa-trash-alt"></i>
            清空回收站
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="selectedRecycled.length === 0"
            @click="handleDeleteSelectedRecycle"
          >
            <i class="fa fa-trash-alt"></i>
            删除选中
          </el-button>
          <el-button
            size="small"
            :disabled="selectedRecycled.length === 0"
            @click="handleRecoverSelectedRecycle"
          >
            <i class="fa fa-redo"></i>
            恢复选中
          </el-button>
          <span style="flex: 1"></span>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="recycleLoading"
            @click="loadRecycledApplets"
            title="刷新"
          >
            <el-icon v-show="!recycleLoading"><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 表格 -->
        <div class="ops-table-wrapper">
          <el-table
            v-loading="recycleLoading"
            :data="paginatedRecycledApplets"
            style="width: 100%"
            max-height="calc(100vh - 364px)"
            @selection-change="handleRecycleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="appletCode" label="Code" width="120" />
            <el-table-column prop="title" label="标题" min-width="150">
              <template #default="{ row }">
                {{ translateText(row.title) }}
              </template>
            </el-table-column>
            <el-table-column prop="createBy" label="创建人" width="100" />
            <el-table-column prop="createTime" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right" align="left">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="handleRecoverRecycle(row)">
                  恢复
                </el-button>
                <el-button
                  text
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
        </div>

        <!-- 分页器 -->
        <div class="ops-pagination-wrapper">
          <el-pagination
            v-model:current-page="recyclePagination.page"
            v-model:page-size="recyclePagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredRecycledApplets.length"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 详情对话框 -->
    <AppletDetailDialog
      v-model="detailDialogVisible"
      :applet="currentApplet"
      @saved="handleSaved"
    />

    <!-- 复制对话框 -->
    <AppletCopyDialog v-model="copyDialogVisible" :applet="currentApplet" @saved="handleSaved" />

    <!-- 导出对话框 -->
    <AppletExportDialog v-model="exportDialogVisible" :applet-ids="selectedAppletNames" />

    <!-- 导入对话框 -->
    <AppletImportDialog v-model="importDialogVisible" @success="handleImportSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import * as appletApi from '@/modules/settings/api/applet'
import AppletDetailDialog from '../components/applet/AppletDetailDialog.vue'
import AppletCopyDialog from '../components/applet/AppletCopyDialog.vue'
import AppletExportDialog from '../components/applet/AppletExportDialog.vue'
import AppletImportDialog from '../components/applet/AppletImportDialog.vue'
import { translateText } from '@/utils/i18n'

const activeTab = ref('app')
const loading = ref(false)
const recycleLoading = ref(false)
const applets = ref([])
const recycledApplets = ref([])
const appSearchKeyword = ref('')
const recycleSearchKeyword = ref('')
const selectedApplets = ref([])
const selectedRecycled = ref([])
const deletingId = ref(null)
const deletingRecycleId = ref(null)
const clearingRecycle = ref(false)

const detailDialogVisible = ref(false)
const copyDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const importDialogVisible = ref(false)
const currentApplet = ref(null)

// 分页状态
const appPagination = ref({
  page: 1,
  pageSize: 20
})

const recyclePagination = ref({
  page: 1,
  pageSize: 20
})

// 过滤后的应用数据
const filteredApplets = computed(() => {
  if (!appSearchKeyword.value) return applets.value
  const keyword = appSearchKeyword.value.toLowerCase()
  return applets.value.filter(
    item =>
      (item.name && item.name.toLowerCase().includes(keyword)) ||
      (item.title && translateText(item.title).toLowerCase().includes(keyword))
  )
})

// 过滤后的回收站数据
const filteredRecycledApplets = computed(() => {
  if (!recycleSearchKeyword.value) return recycledApplets.value
  const keyword = recycleSearchKeyword.value.toLowerCase()
  return recycledApplets.value.filter(
    item =>
      (item.appletCode && item.appletCode.toLowerCase().includes(keyword)) ||
      (item.title && translateText(item.title).toLowerCase().includes(keyword))
  )
})

// 分页后的数据
const paginatedApplets = computed(() => {
  const start = (appPagination.value.page - 1) * appPagination.value.pageSize
  const end = start + appPagination.value.pageSize
  return filteredApplets.value.slice(start, end)
})

const paginatedRecycledApplets = computed(() => {
  const start = (recyclePagination.value.page - 1) * recyclePagination.value.pageSize
  const end = start + recyclePagination.value.pageSize
  return filteredRecycledApplets.value.slice(start, end)
})

onMounted(() => {
  loadApplets()
})

watch(activeTab, val => {
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
  // 保存 name 用于导出
  selectedAppletNames.value = selection.map(item => item.name)
}

// 选中的应用 name 列表（用于导出）
const selectedAppletNames = ref([])

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
  if (selectedApplets.value.length === 0) {
    ElMessage.warning('请先选择要导出的应用')
    return
  }
  exportDialogVisible.value = true
}

function handleImport() {
  importDialogVisible.value = true
}

function handleImportSuccess() {
  loadApplets()
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用 "${translateText(row.title)}" 吗？删除后将移至回收站。`,
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
    await ElMessageBox.confirm(`确定要恢复应用 "${row.title}" 吗？`, '确认恢复', { type: 'info' })

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
.ops-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  :deep(.el-tabs__header) {
    flex-shrink: 0;
    margin-bottom: 0;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    padding: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tab-pane) {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
}

.ops-filter-bar {
  margin: 12px 0;
}
</style>
