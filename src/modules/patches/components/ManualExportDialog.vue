<template>
  <el-dialog v-model="visible" title="导出" width="900px" append-to-body destroy-on-close @open="onOpen">
    <el-tabs v-model="activeTab" class="export-tabs">
      <el-tab-pane label="批量输入" name="batch">
        <div class="batch-input-container" style="height: calc(100vh - 320px);">
          <div class="batch-tips mb-2 text-muted" style="font-size: 13px; margin-bottom: 12px; color: var(--el-text-color-secondary);">
            支持使用英文逗号、中文逗号、空格或换行分隔多个 CVE 编号
          </div>
          <el-input
            v-model="batchInputText"
            type="textarea"
            :rows="18"
            placeholder="请输入完整的CVE编号，例如：&#10;CVE-2023-1234&#10;CVE-2023-1235, CVE-2023-1236"
            style="font-family: var(--el-font-family-monospace)"
          ></el-input>
        </div>
      </el-tab-pane>
      <el-tab-pane label="列表选择" name="list">
        <div class="manual-export-container">
          <!-- 左侧 -->
          <div class="export-left">
            <div class="export-header">搜索 CVE</div>
            <el-input v-model="exportSearchKeyword" placeholder="输入 CVE 编号或关键字" clearable @keyup.enter="doExportSearch" @clear="doExportSearch">
              <template #append>
                <el-button :icon="Search" @click="doExportSearch" />
              </template>
            </el-input>
            <div class="export-list" v-loading="exportSearchLoading">
              <el-empty v-if="exportOptions.length === 0" description="暂无数据" :image-size="60"></el-empty>
              <div v-else class="export-list-content">
                <div
                  v-for="cve in exportOptions"
                  :key="cve.cveId"
                  class="export-list-item draggable-item"
                  draggable="true"
                  @dragstart="onDragStartLeft($event, cve)"
                >
                  <div class="drag-handle">
                    <el-icon class="mr-1 grab-cursor"><Rank /></el-icon>
                    <span class="cve-text">{{ cve.cveId }}</span>
                  </div>
                  <el-button type="primary" link @click="addToExport(cve)" :disabled="isCveSelected(cve.cveId)">
                    {{ isCveSelected(cve.cveId) ? '已选' : '添加' }}
                  </el-button>
                </div>
                <div v-if="exportHasMore" class="load-more-btn" @click="exportSearchLoadMore">加载更多...</div>
              </div>
            </div>
          </div>

          <!-- 右侧 -->
          <div class="export-right">
            <div class="export-header">
              已选择 ({{ exportSelectedList.length }})
              <el-button type="danger" link @click="clearExportSelected" v-if="exportSelectedList.length > 0">清空</el-button>
            </div>
            <div class="export-list" @drop="onDropRightContainer($event)" @dragover.prevent>
              <el-empty v-if="exportSelectedList.length === 0" description="暂未选择" :image-size="60"></el-empty>
              <div v-else class="export-list-content">
                <div
                  v-for="(cve, index) in exportSelectedList"
                  :key="cve.cveId || index"
                  class="export-list-item draggable-item"
                  draggable="true"
                  @dragstart="onDragStart($event, index)"
                  @dragover.prevent="onDragOver($event, index)"
                  @drop="onDrop($event, index)"
                  @dragend="onDragEnd"
                  :class="{ 'drop-target': dropTargetIndex === index, 'drag-active': draggingIndex === index }"
                >
                  <div class="drag-handle">
                    <el-icon class="mr-1 grab-cursor"><Rank /></el-icon>
                    <span class="cve-text">{{ cve.cveId }}</span>
                  </div>
                  <el-icon class="cursor-pointer text-danger hover-danger" @click="removeFromExport(cve.cveId)"><Delete /></el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="manualExporting" @click="handleManualExportConfirm">
          {{ activeTab === 'list' ? '导出已选' : '导出输入内容' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, Delete, Rank } from '@element-plus/icons-vue'
import { cveApi } from '../api/index.js'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialSelected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const exportSearchKeyword = ref('')
const exportOptions = ref([])
const exportSelectedList = ref([])
const activeTab = ref('batch')
const batchInputText = ref('')
const exportSearchLoading = ref(false)
const exportHasMore = ref(false)
const exportCurrentPage = ref(0)
const manualExporting = ref(false)

// 拖拽相关状态
const draggingIndex = ref(-1)
const dropTargetIndex = ref(-1)
let draggingCveFromLeft = null

function onOpen() {
  exportSearchKeyword.value = ''
  exportSelectedList.value = [...props.initialSelected]
  activeTab.value = 'batch'
  batchInputText.value = ''
  doExportSearch()
}

async function doExportSearch() {
  exportCurrentPage.value = 0
  exportOptions.value = []
  exportHasMore.value = false
  await loadExportOptions()
}

async function loadExportOptions() {
  exportSearchLoading.value = true
  try {
    const data = await cveApi.getCveList({ keyword: exportSearchKeyword.value, page: exportCurrentPage.value, size: 50 })
    const result = data?.data || data
    if (exportCurrentPage.value === 0) {
      exportOptions.value = result.content || []
    } else {
      exportOptions.value.push(...(result.content || []))
    }
    const totalPages = result.totalPages || 0
    exportHasMore.value = exportCurrentPage.value < totalPages - 1
  } catch(error) {
    console.error('获取CVE列表失败:', error)
  } finally {
    exportSearchLoading.value = false
  }
}

function exportSearchLoadMore() {
  exportCurrentPage.value += 1
  loadExportOptions()
}

function addToExport(cve) {
  if (!exportSelectedList.value.find(item => item.cveId === cve.cveId)) {
    exportSelectedList.value.push(cve)
  }
}

function removeFromExport(cveId) {
  exportSelectedList.value = exportSelectedList.value.filter(item => item.cveId !== cveId)
}

function isCveSelected(cveId) {
  return exportSelectedList.value.some(item => item.cveId === cveId)
}

function clearExportSelected() {
  exportSelectedList.value = []
}
// 左侧拖拽开始
function onDragStartLeft(event, cve) {
  if (isCveSelected(cve.cveId)) {
    event.preventDefault()
    return
  }
  draggingCveFromLeft = cve
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', 'left-to-right')
}

// 右侧容器总体放置
function onDropRightContainer(event) {
  const type = event.dataTransfer.getData('text/plain')
  if (type === 'left-to-right' && draggingCveFromLeft) {
    addToExport(draggingCveFromLeft)
    draggingCveFromLeft = null
  }
}

// 右侧单项拖拽事件处理
function onDragStart(event, index) {
  draggingIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
}

function onDragOver(event, index) {
  if (draggingIndex.value === -1) return
  if (draggingIndex.value === index) return
  dropTargetIndex.value = index
}

function onDrop(event, index) {
  event.stopPropagation()
  const type = event.dataTransfer.getData('text/plain')

  if (type === 'left-to-right' && draggingCveFromLeft) {
    if (!isCveSelected(draggingCveFromLeft.cveId)) {
      exportSelectedList.value.splice(index, 0, draggingCveFromLeft)
    }
    draggingCveFromLeft = null
    return
  }

  if (draggingIndex.value === -1 || draggingIndex.value === index) return

  const newList = [...exportSelectedList.value]
  const [removed] = newList.splice(draggingIndex.value, 1)
  newList.splice(index, 0, removed)

  exportSelectedList.value = newList
  draggingIndex.value = -1
  dropTargetIndex.value = -1
}

function onDragEnd() {
  draggingIndex.value = -1
  dropTargetIndex.value = -1
  draggingCveFromLeft = null
}

async function handleManualExportConfirm() {
  let cveIds = []

  if (activeTab.value === 'list') {
    if (exportSelectedList.value.length === 0) {
      ElMessage.warning('请选择要导出的 CVE 项目')
      return
    }
    cveIds = exportSelectedList.value.map(item => item.cveId)
  } else {
    if (!batchInputText.value.trim()) {
      ElMessage.warning('请输入要导出的 CVE 编号')
      return
    }
    const parts = batchInputText.value.split(/[\s,，、；;]+/)
    cveIds = parts.map(id => id.trim()).filter(id => id.length > 0)

    if (cveIds.length === 0) {
      ElMessage.warning('未解析到有效的 CVE 编号')
      return
    }
    cveIds = [...new Set(cveIds)] // 去重
  }

  manualExporting.value = true
  try {
    const blob = await cveApi.exportReport(cveIds)
    const url = URL.createObjectURL(blob.data || blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CVE漏洞报告.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('批量导出成功')
    visible.value = false
  } catch (error) {
    console.error('手动导出失败:', error)
    ElMessage.error('导出失败，请重试')
  } finally {
    manualExporting.value = false
  }
}
</script>

<style scoped lang="scss">
.manual-export-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 320px);
}
.export-left, .export-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  padding: 12px;
}
.export-right {
  background-color: var(--el-fill-color-light);
}
.export-header {
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.export-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 4px;
}
.export-list-content {
  padding-bottom: 10px;
}
.export-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 4px;
  transition: background-color 0.2s, border 0.2s;
  &:hover {
    background-color: var(--el-fill-color);
  }
}

.export-right .export-list-item:hover {
  background-color: var(--el-fill-color-darker);
}

.draggable-item {
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
}

.drag-active {
  opacity: 0.5;
}

.drag-handle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
}

.grab-cursor {
  cursor: grab;
}

.drop-target {
  border-top: 2px dashed var(--el-color-primary);
}

.cve-text {
  font-family: var(--el-font-family-monospace);
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.load-more-btn {
  text-align: center;
  color: var(--el-color-primary);
  cursor: pointer;
  padding: 10px 0;
  font-size: 13px;
  &:hover {
    opacity: 0.8;
  }
}
.hover-danger {
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
}
.hover-danger:hover {
  color: var(--el-color-danger);
}
</style>
