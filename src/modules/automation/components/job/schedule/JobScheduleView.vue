<template>
  <div class="schedule-shell">
    <section class="flow-list-panel">
      <header class="flow-list-header">
        <el-input
          v-model="flowFilter"
          placeholder="搜索流程"
          size="small"
          clearable
          class="flow-search"
        >
          <template #prefix>
            <i class="fa fa-search" />
          </template>
        </el-input>
        <el-dropdown trigger="click" @command="handleOrderCommand">
          <el-button text circle size="small" :title="`排序 · ${orderFieldLabel}`">
            <i class="fa fa-sort" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="name">
                名称
                <i
                  v-if="orderField === 'name'"
                  class="fa"
                  :class="orderDesc ? 'fa-sort-alpha-down-alt' : 'fa-sort-alpha-up'"
                />
              </el-dropdown-item>
              <el-dropdown-item command="updatedAt">
                更新时间
                <i
                  v-if="orderField === 'updatedAt'"
                  class="fa"
                  :class="orderDesc ? 'fa-sort-amount-down-alt' : 'fa-sort-amount-up'"
                />
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" size="small" plain @click="handleCreateFlow">
          <i class="fa fa-plus me-1" />新建
        </el-button>
      </header>

      <div class="flow-list-body" v-loading="flowsLoading">
        <el-scrollbar class="flow-list-scroll">
          <template v-if="visibleFlows.length">
            <div
              v-for="flow in visibleFlows"
              :key="flow.id"
              class="flow-item"
              :class="{ active: flow.id === activeFlowId }"
              @click="handleSelectFlow(flow)"
            >
              <div class="flow-item__content">
                <div class="flow-item__title" :title="flow.name">{{ flow.name }}</div>
                <div class="flow-item__meta">{{ formatDateTime(flow.updatedAt || flow.createdAt) }}</div>
              </div>
              <div class="flow-item__actions">
                <el-tooltip content="执行" placement="top">
                  <el-button text circle size="small" @click.stop="handleRunFlow(flow)">
                    <i class="fa fa-play" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="编辑" placement="top">
                  <el-button text circle size="small" @click.stop="handleEditFlow(flow)">
                    <i class="fa fa-edit" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button text circle size="small" @click.stop="handleDeleteFlow(flow)">
                    <i class="fa fa-trash-alt" />
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </template>
          <el-empty v-else description="暂无流程" :image-size="100" />
        </el-scrollbar>
      </div>
    </section>

    <section class="flow-detail-panel">
      <template v-if="activeFlow">
        <div class="instance-toolbar">
          <el-input
            v-model="instanceKeyword"
            placeholder="搜索流程实例"
            size="small"
            clearable
            class="instance-search"
          >
            <template #prefix>
              <i class="fa fa-search" />
            </template>
          </el-input>
          <el-button circle size="small" @click="refreshInstances" :disabled="instancesLoading">
            <i class="fa fa-sync" />
          </el-button>
        </div>

        <el-table
          :data="filteredInstances"
          v-loading="instancesLoading"
          border
          height="100%"
          class="instance-table"
          empty-text="暂无实例"
        >
          <el-table-column prop="name" label="名称" min-width="220" show-overflow-tooltip />
          <el-table-column prop="hostCount" label="主机数" width="90" align="center" />
          <el-table-column prop="stepCount" label="步骤数" width="90" align="center" />
          <el-table-column label="流程开始时间" min-width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="createdBy" label="执行人" width="140" show-overflow-tooltip />
          <el-table-column label="操作" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <el-button type="primary" text size="small" @click="handleViewInstance(row)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <div v-else class="detail-blank">
        <i class="fa fa-inbox detail-blank__icon" />
        <p>选择左侧流程以查看实例</p>
      </div>
    </section>

    <FlowEditor
      v-model="flowEditorVisible"
      :mode="flowEditorMode"
      :flow-id="editingFlowId"
      @saved="handleFlowSaved"
    />

    <FlowInstanceViewer
      v-model="instanceViewerVisible"
      :instance-id="viewingInstanceId"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import * as jaoApi from '@/modules/automation/api/jao'
import FlowEditor from './components/FlowEditor.vue'
import FlowInstanceViewer from './components/FlowInstanceViewer.vue'

const flowList = ref([])
const flowsLoading = ref(false)
const flowFilter = ref('')
const orderField = ref('updatedAt')
const orderDesc = ref(false)
const activeFlowId = ref('')
const instanceRows = ref([])
const instancesLoading = ref(false)
const instanceKeyword = ref('')
const legacyBase = computed(() => appUrlManager.getAppUrl('jao').replace(/#.*$/, ''))
const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base', numeric: true })
const flowEditorVisible = ref(false)
const flowEditorMode = ref('edit')
const editingFlowId = ref('')
const instanceViewerVisible = ref(false)
const viewingInstanceId = ref('')

const visibleFlows = computed(() => {
  const term = flowFilter.value.trim().toLowerCase()
  const filtered = !term
    ? [...flowList.value]
    : flowList.value.filter((flow) => flow.name?.toLowerCase().includes(term))
  return filtered.sort((a, b) => compareFlows(a, b))
})

const activeFlow = computed(() => flowList.value.find((flow) => flow.id === activeFlowId.value) || null)
const orderFieldLabel = computed(() => (orderField.value === 'name' ? '名称' : '更新时间'))

const filteredInstances = computed(() => {
  if (!instanceKeyword.value) return instanceRows.value
  const term = instanceKeyword.value.trim().toLowerCase()
  return instanceRows.value.filter((item) => {
    return (
      item.name.toLowerCase().includes(term) ||
      (item.createdBy ? item.createdBy.toLowerCase().includes(term) : false)
    )
  })
})

watch(flowList, (list) => {
  if (!list.length) {
    activeFlowId.value = ''
    return
  }
  if (!list.some((flow) => flow.id === activeFlowId.value)) {
    activeFlowId.value = list[0].id
  }
})

watch(activeFlowId, (id) => {
  instanceKeyword.value = ''
  if (!id) {
    instanceRows.value = []
    return
  }
  fetchFlowInstances(id)
})

onMounted(() => {
  fetchFlowList()
})

async function fetchFlowList() {
  flowsLoading.value = true
  try {
    const response = await jaoApi.fetchFlows()
    flowList.value = normalizeFlows(resolveResponseArray(response))
  } catch (error) {
    ElMessage.error(error?.message || '获取流程列表失败')
    flowList.value = []
  } finally {
    flowsLoading.value = false
  }
}

async function fetchFlowInstances(flowId) {
  if (!flowId) return
  instancesLoading.value = true
  try {
    const response = await jaoApi.fetchFlowInstances(flowId)
    instanceRows.value = normalizeInstances(resolveResponseArray(response))
  } catch (error) {
    ElMessage.error(error?.message || '获取流程实例失败')
    instanceRows.value = []
  } finally {
    instancesLoading.value = false
  }
}

function refreshInstances() {
  if (activeFlowId.value) {
    fetchFlowInstances(activeFlowId.value)
  }
}

function handleSelectFlow(flow) {
  activeFlowId.value = flow.id
}

function handleOrderCommand(field) {
  if (orderField.value === field) {
    orderDesc.value = !orderDesc.value
  } else {
    orderField.value = field
    orderDesc.value = false
  }
}

function openFlowEditor(mode, flowId = '') {
  flowEditorMode.value = mode
  editingFlowId.value = flowId
  flowEditorVisible.value = true
}

function handleCreateFlow() {
  openFlowEditor('create')
}

function handleRunFlow(flow) {
  openFlowEditor('run', flow.id)
}

function handleEditFlow(flow) {
  openFlowEditor('edit', flow.id)
}

function handleDeleteFlow(flow) {
  ElMessageBox.confirm(
    `确定要删除流程「${flow.name}」吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(async () => {
    try {
      await jaoApi.deleteFlow(flow.id)
      ElMessage.success('删除成功')
      // 如果删除的是当前选中的流程，清空选中
      if (activeFlowId.value === flow.id) {
        activeFlowId.value = ''
      }
      fetchFlowList()
    } catch (error) {
      ElMessage.error(error?.message || '删除失败')
    }
  }).catch(() => {
    // 用户取消删除
  })
}

function handleFlowSaved() {
  flowEditorVisible.value = false
  const wasEditingFlowId = editingFlowId.value
  editingFlowId.value = ''
  fetchFlowList()
  if (wasEditingFlowId === activeFlowId.value && activeFlowId.value) {
    refreshInstances()
  }
}

function handleViewInstance(instance) {
  viewingInstanceId.value = instance.id
  instanceViewerVisible.value = true
}

function compareFlows(a, b) {
  const field = orderField.value
  let diff = 0
  if (field === 'name') {
    diff = collator.compare(a.name || '', b.name || '')
  } else {
    const aTime = Date.parse(a.updatedAt || a.createdAt || '') || 0
    const bTime = Date.parse(b.updatedAt || b.createdAt || '') || 0
    diff = aTime - bTime
  }
  if (diff === 0) {
    diff = collator.compare(a.name || '', b.name || '')
  }
  return orderDesc.value ? -diff : diff
}

function normalizeFlows(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => ({
      id: row.id ?? row.flowId ?? '',
      name: row.name ?? row.flowName ?? '未命名流程',
      updatedAt: row.updatedAt ?? row.updated_at ?? row.modifiedAt ?? '',
      createdAt: row.createdAt ?? row.created_at ?? ''
    }))
    .filter((item) => !!item.id)
}

function normalizeInstances(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      const hosts = safeJsonArray(row.hosts)
      const steps = safeJsonArray(row.stepIds)
      return {
        id: row.id ?? row.instanceId ?? '',
        name: row.name ?? row.instanceName ?? '未命名实例',
        hostCount: hosts.length,
        stepCount: steps.length,
        createdAt: row.createdAt ?? row.startTime ?? row.created_at,
        createdBy: row.createdBy ?? row.creator ?? row.runBy ?? ''
      }
    })
    .filter((item) => !!item.id)
}

function safeJsonArray(source) {
  if (!source) return []
  if (Array.isArray(source)) return source
  try {
    const parsed = JSON.parse(String(source))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function resolveResponseArray(response) {
  if (!response) return []
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.records)) return response.data.records
  if (Array.isArray(response?.records)) return response.records
  return []
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value) {
  return value < 10 ? `0${value}` : String(value)
}
</script>

<style scoped>
.schedule-shell {
  display: flex;
  min-height: 560px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.flow-list-panel {
  width: 280px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  background: #f7f9fc;
}

.flow-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.flow-search :deep(.el-input__inner) {
  border-radius: 999px;
}

.flow-list-body {
  flex: 1;
  min-height: 0;
}

.flow-list-scroll {
  height: 100%;
  padding: 12px;
}

.flow-item {
  position: relative;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flow-item__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 70px;
  min-height: 44px;
}

.flow-item:last-child {
  margin-bottom: 0;
}

.flow-item:hover {
  border-color: #cfd8ec;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.flow-item.active {
  border-color: #409eff;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
}

.flow-item__title {
  font-weight: 600;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-item__meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.flow-item__actions {
  position: absolute;
  right: 10px;
  bottom: 6px;
  display: flex;
  gap: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.flow-item:hover .flow-item__actions {
  opacity: 1;
  pointer-events: auto;
}

.flow-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.instance-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.instance-search {
  width: 240px;
}

.instance-table {
  flex: 1;
}

.detail-blank {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  gap: 12px;
}

.detail-blank__icon {
  font-size: 64px;
  color: #d1d5db;
}

.me-1 {
  margin-right: 4px;
}
</style>
