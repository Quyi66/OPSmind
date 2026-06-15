<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="900px"
    append-to-body
    destroy-on-close
    @open="onOpen"
  >
    <el-tabs v-model="activeTab" class="export-tabs">
      <el-tab-pane label="批量输入" name="batch">
        <div class="batch-input-container" style="height: calc(100vh - 320px)">
          <div
            class="batch-tips mb-2 text-muted"
            style="font-size: 13px; margin-bottom: 12px; color: var(--el-text-color-secondary)"
          >
            {{ batchTip }}
          </div>
          <el-input
            v-model="batchInputText"
            type="textarea"
            :rows="18"
            :placeholder="batchPlaceholder"
            style="font-family: var(--el-font-family-monospace)"
          ></el-input>
        </div>
      </el-tab-pane>
      <el-tab-pane label="列表选择" name="list">
        <div class="manual-export-container">
          <div class="export-left">
            <div class="export-header">{{ searchTitle }}</div>
            <el-input
              v-model="exportSearchKeyword"
              :placeholder="searchPlaceholder"
              clearable
              @keyup.enter="doExportSearch"
              @clear="doExportSearch"
            >
              <template #append>
                <el-button :icon="Search" @click="doExportSearch" />
              </template>
            </el-input>
            <div class="export-list" v-loading="exportSearchLoading">
              <el-empty
                v-if="exportOptions.length === 0"
                :description="emptyDescription"
                :image-size="60"
              ></el-empty>
              <div v-else class="export-list-content">
                <div
                  v-for="item in exportOptions"
                  :key="getItemKey(item)"
                  class="export-list-item draggable-item"
                  draggable="true"
                  @dragstart="onDragStartLeft($event, item)"
                >
                  <div class="drag-handle">
                    <el-icon class="mr-1 grab-cursor"><Rank /></el-icon>
                    <span class="export-item-text" :title="getItemLabel(item)">
                      {{ getItemLabel(item) }}
                    </span>
                  </div>
                  <el-button
                    type="primary"
                    link
                    @click="addToExport(item)"
                    :disabled="isItemSelected(getItemKey(item))"
                  >
                    {{ isItemSelected(getItemKey(item)) ? '已选' : '添加' }}
                  </el-button>
                </div>
                <div v-if="exportHasMore" class="load-more-btn" @click="exportSearchLoadMore">
                  加载更多...
                </div>
              </div>
            </div>
          </div>

          <div class="export-right">
            <div class="export-header">
              {{ selectedTitle }} ({{ exportSelectedList.length }})
              <el-button
                type="danger"
                link
                @click="clearExportSelected"
                v-if="exportSelectedList.length > 0"
              >
                清空
              </el-button>
            </div>
            <div class="export-list" @drop="onDropRightContainer($event)" @dragover.prevent>
              <el-empty
                v-if="exportSelectedList.length === 0"
                :description="selectedEmptyDescription"
                :image-size="60"
              ></el-empty>
              <div v-else class="export-list-content">
                <div
                  v-for="(item, index) in exportSelectedList"
                  :key="getItemKey(item) || index"
                  class="export-list-item draggable-item"
                  draggable="true"
                  @dragstart="onDragStart($event, index)"
                  @dragover.prevent="onDragOver($event, index)"
                  @drop="onDrop($event, index)"
                  @dragend="onDragEnd"
                  :class="{
                    'drop-target': dropTargetIndex === index,
                    'drag-active': draggingIndex === index
                  }"
                >
                  <div class="drag-handle">
                    <el-icon class="mr-1 grab-cursor"><Rank /></el-icon>
                    <span class="export-item-text" :title="getItemLabel(item)">
                      {{ getItemLabel(item) }}
                    </span>
                  </div>
                  <el-icon
                    class="cursor-pointer text-danger hover-danger"
                    @click="removeFromExport(getItemKey(item))"
                  >
                    <Delete />
                  </el-icon>
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
import { cveApi } from '../../../api/index.js'
import { ElMessage } from 'element-plus'

async function defaultFetchOptions({ keyword, page, size }) {
  return cveApi.getCveList({ keyword, page, size })
}

async function defaultExportHandler(ids) {
  return cveApi.exportReport(ids)
}

function defaultParseBatchInput(text) {
  return String(text || '')
    .split(/[\s,，、；;]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialSelected: {
    type: Array,
    default: () => []
  },
  dialogTitle: {
    type: String,
    default: '导出'
  },
  itemName: {
    type: String,
    default: 'CVE'
  },
  itemIdentifierLabel: {
    type: String,
    default: 'CVE 编号'
  },
  itemKeyField: {
    type: [String, Function],
    default: 'cveId'
  },
  itemLabelField: {
    type: [String, Function],
    default: 'cveId'
  },
  searchTitle: {
    type: String,
    default: '搜索 CVE'
  },
  searchPlaceholder: {
    type: String,
    default: '输入 CVE 编号或关键字'
  },
  selectedTitle: {
    type: String,
    default: '已选择'
  },
  batchTip: {
    type: String,
    default: '支持使用英文逗号、中文逗号、空格或换行分隔多个 CVE 编号'
  },
  batchPlaceholder: {
    type: String,
    default: '请输入完整的CVE编号，例如：\nCVE-2023-1234\nCVE-2023-1235, CVE-2023-1236'
  },
  exportFilename: {
    type: String,
    default: 'CVE漏洞报告.xlsx'
  },
  successMessage: {
    type: String,
    default: '批量导出成功'
  },
  emptyDescription: {
    type: String,
    default: '暂无数据'
  },
  selectedEmptyDescription: {
    type: String,
    default: '暂未选择'
  },
  listPageSize: {
    type: Number,
    default: 50
  },
  fetchOptions: {
    type: Function,
    default: null
  },
  exportHandler: {
    type: Function,
    default: null
  },
  parseBatchInput: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])
const fetchOptions = props.fetchOptions || defaultFetchOptions
const exportHandler = props.exportHandler || defaultExportHandler
const parseBatchInput = props.parseBatchInput || defaultParseBatchInput

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
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

const draggingIndex = ref(-1)
const dropTargetIndex = ref(-1)
let draggingItemFromLeft = null

function resolveItemField(item, fieldOrGetter) {
  if (typeof fieldOrGetter === 'function') {
    return fieldOrGetter(item)
  }
  return item?.[fieldOrGetter]
}

function getItemKey(item) {
  return String(resolveItemField(item, props.itemKeyField) || '').trim()
}

function getItemLabel(item) {
  const label = resolveItemField(item, props.itemLabelField)
  if (label !== undefined && label !== null && label !== '') {
    return String(label)
  }
  return getItemKey(item)
}

function normalizeSelectedItems(items = []) {
  const uniqueItems = []
  const seen = new Set()

  items.forEach(item => {
    const key = getItemKey(item)
    if (!key || seen.has(key)) return
    seen.add(key)
    uniqueItems.push(item)
  })

  return uniqueItems
}

function mergeOptions(existing = [], incoming = []) {
  return normalizeSelectedItems([...existing, ...incoming])
}

function normalizePageResult(response) {
  const result = response?.data || response || {}
  const content = Array.isArray(result?.content)
    ? result.content
    : Array.isArray(result?.records)
      ? result.records
      : Array.isArray(result)
        ? result
        : []

  return {
    content,
    totalPages: Number(result?.totalPages ?? result?.pages ?? 0),
    totalElements: Number(result?.totalElements ?? result?.total ?? content.length ?? 0)
  }
}

function downloadBlob(response, fallbackFilename) {
  const blob = response?.data instanceof Blob ? response.data : response
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fallbackFilename
  link.click()
  URL.revokeObjectURL(url)
}

function onOpen() {
  exportSearchKeyword.value = ''
  exportSelectedList.value = normalizeSelectedItems(props.initialSelected)
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
    const data = await fetchOptions({
      keyword: exportSearchKeyword.value.trim(),
      page: exportCurrentPage.value,
      size: props.listPageSize
    })
    const result = normalizePageResult(data)
    const nextItems = result.content.filter(item => getItemKey(item))

    if (exportCurrentPage.value === 0) {
      exportOptions.value = nextItems
    } else {
      exportOptions.value = mergeOptions(exportOptions.value, nextItems)
    }

    const totalPages =
      result.totalPages || Math.ceil(result.totalElements / props.listPageSize) || 0
    exportHasMore.value = exportCurrentPage.value < totalPages - 1
  } catch (error) {
    console.error(`获取${props.itemName}列表失败:`, error)
  } finally {
    exportSearchLoading.value = false
  }
}

function exportSearchLoadMore() {
  exportCurrentPage.value += 1
  loadExportOptions()
}

function addToExport(item) {
  const itemKey = getItemKey(item)
  if (!itemKey || isItemSelected(itemKey)) {
    return
  }

  exportSelectedList.value.push(item)
}

function removeFromExport(itemKey) {
  exportSelectedList.value = exportSelectedList.value.filter(item => getItemKey(item) !== itemKey)
}

function isItemSelected(itemKey) {
  return exportSelectedList.value.some(item => getItemKey(item) === itemKey)
}

function clearExportSelected() {
  exportSelectedList.value = []
}

function onDragStartLeft(event, item) {
  const itemKey = getItemKey(item)
  if (!itemKey || isItemSelected(itemKey)) {
    event.preventDefault()
    return
  }

  draggingItemFromLeft = item
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', 'left-to-right')
}

function onDropRightContainer(event) {
  const type = event.dataTransfer.getData('text/plain')
  if (type === 'left-to-right' && draggingItemFromLeft) {
    addToExport(draggingItemFromLeft)
    draggingItemFromLeft = null
  }
}

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

  if (type === 'left-to-right' && draggingItemFromLeft) {
    const itemKey = getItemKey(draggingItemFromLeft)
    if (itemKey && !isItemSelected(itemKey)) {
      exportSelectedList.value.splice(index, 0, draggingItemFromLeft)
    }
    draggingItemFromLeft = null
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
  draggingItemFromLeft = null
}

async function handleManualExportConfirm() {
  let exportIds = []

  if (activeTab.value === 'list') {
    if (exportSelectedList.value.length === 0) {
      ElMessage.warning(`请选择要导出的${props.itemName}项目`)
      return
    }
    exportIds = exportSelectedList.value.map(item => getItemKey(item)).filter(Boolean)
  } else {
    if (!batchInputText.value.trim()) {
      ElMessage.warning(`请输入要导出的${props.itemIdentifierLabel}`)
      return
    }
    exportIds = parseBatchInput(batchInputText.value)
      .map(id => String(id || '').trim())
      .filter(Boolean)

    if (exportIds.length === 0) {
      ElMessage.warning(`未解析到有效的${props.itemIdentifierLabel}`)
      return
    }

    exportIds = [...new Set(exportIds)]
  }

  manualExporting.value = true
  try {
    const response = await exportHandler(exportIds)
    downloadBlob(response, props.exportFilename)
    ElMessage.success(props.successMessage)
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
.export-left,
.export-right {
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
  transition:
    background-color 0.2s,
    border 0.2s;
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

.export-item-text {
  font-family: var(--el-font-family-monospace);
  font-size: 13px;
  color: var(--el-text-color-primary);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
