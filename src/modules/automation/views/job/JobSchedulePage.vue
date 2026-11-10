<template>
  <div class="schedule-page ops-page-layout">
    <div class="schedule-shell">
      <section class="flow-list-panel">
        <header class="flow-list-header">
          <div class="flow-list-header__top">
            <div class="flow-list-header__meta">
              <h3 class="flow-list-title">流程列表</h3>
              <p class="flow-list-summary">{{ flowSummaryText }}</p>
            </div>
            <div class="flow-list-actions">
              <el-button
                class="toolbar-icon-btn"
                circle
                size="small"
                title="刷新流程"
                aria-label="刷新流程"
                :loading="flowsLoading"
                @click="handleRefreshFlows"
              >
                <el-icon v-show="!flowsLoading"><Refresh /></el-icon>
              </el-button>
              <el-button type="primary" size="small" @click="handleCreateFlow">
                <i class="fa fa-plus me-1" />
                新建
              </el-button>
            </div>
          </div>

          <div class="flow-list-controls">
            <el-input
              v-model="flowFilter"
              placeholder="搜索流程"
              size="small"
              clearable
              class="flow-search"
              @keyup.enter="handleRefreshFlows"
              @clear="handleRefreshFlows"
            >
              <template #prefix>
                <i class="fa fa-search" />
              </template>
            </el-input>
            <el-dropdown trigger="click" @command="handleOrderCommand">
              <el-button
                class="toolbar-icon-btn"
                circle
                size="small"
                :title="`排序：${orderFieldLabel}`"
                :aria-label="`排序：${orderFieldLabel}`"
              >
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
          </div>
        </header>

        <div class="flow-list-body" v-loading="flowsLoading">
          <el-scrollbar class="flow-list-scroll">
            <template v-if="visibleFlows.length">
              <div
                v-for="flow in visibleFlows"
                :key="flow.id"
                class="flow-item"
                :class="{ active: flow.id === activeFlowId }"
                tabindex="0"
                @click="handleSelectFlow(flow)"
                @keydown.enter.self="handleSelectFlow(flow)"
                @keydown.space.prevent.self="handleSelectFlow(flow)"
              >
                <div class="flow-item__row">
                  <div class="flow-item__content">
                    <div class="flow-item__name-row">
                      <div class="flow-item__title" :title="flow.name">{{ flow.name }}</div>
                      <el-tag
                        v-if="flow.id === activeFlowId"
                        size="small"
                        type="primary"
                        effect="light"
                      >
                        当前
                      </el-tag>
                    </div>
                  </div>

                  <div class="flow-item__actions">
                    <el-tooltip content="执行" placement="top">
                      <el-button
                        class="flow-item-action-btn"
                        text
                        circle
                        size="small"
                        @click.stop="handleRunFlow(flow)"
                      >
                        <i class="fa fa-play" />
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="编辑" placement="top">
                      <el-button
                        class="flow-item-action-btn"
                        text
                        circle
                        size="small"
                        @click.stop="handleEditFlow(flow)"
                      >
                        <i class="fa fa-edit" />
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <el-button
                        class="flow-item-action-btn"
                        type="danger"
                        text
                        circle
                        size="small"
                        @click.stop="handleDeleteFlow(flow)"
                      >
                        <i class="fa fa-trash-alt" />
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
                <div class="flow-item__meta-line">
                  <span>更新于 {{ formatDateTime(flow.updatedAt || flow.createdAt) }}</span>
                </div>
              </div>
            </template>
            <div v-else-if="hasFlowSearch" class="flow-list-empty">
              <i class="fa fa-search flow-list-empty__icon" />
              <h4 class="flow-list-empty__title">没有匹配的流程</h4>
              <p class="flow-list-empty__desc">尝试更换关键词，或清空当前搜索条件。</p>
              <div class="flow-list-empty__actions">
                <el-button size="small" @click="clearFlowFilter">清空搜索</el-button>
                <el-button type="primary" size="small" @click="handleCreateFlow">
                  <i class="fa fa-plus me-1" />
                  新建流程
                </el-button>
              </div>
            </div>
            <el-empty v-else description="暂无流程" :image-size="64">
              <el-button type="primary" size="small" @click="handleCreateFlow">
                <i class="fa fa-plus me-1" />
                新建流程
              </el-button>
            </el-empty>
          </el-scrollbar>
        </div>
      </section>

      <section class="flow-detail-panel">
        <template v-if="activeFlow">
          <div class="flow-detail-stack">
            <section class="flow-detail-overview">
              <div v-loading="activeFlowDetailLoading" class="flow-detail-header">
                <div class="flow-detail-heading">
                  <h2 class="flow-detail-title">{{ activeFlow.name }}</h2>
                  <div class="flow-detail-meta">
                    <span>更新时间 {{ activeFlowUpdatedText }}</span>
                  </div>
                  <p class="flow-detail-description">{{ activeFlowDescriptionText }}</p>
                </div>

                <div v-if="activeFlowStepPreview.length" class="flow-step-preview">
                  <div class="flow-step-preview__header">
                    <span class="flow-step-preview__label">步骤预览</span>
                    <span v-if="activeFlowStepOverflow > 0" class="flow-step-preview__more">
                      还有 {{ activeFlowStepOverflow }} 个步骤
                    </span>
                  </div>
                  <div class="flow-step-preview__list">
                    <div
                      v-for="(stepName, index) in activeFlowStepPreview"
                      :key="`${stepName}-${index}`"
                      class="flow-step-card"
                    >
                      <span class="flow-step-card__index">步骤 {{ index + 1 }}</span>
                      <span class="flow-step-card__name" :title="stepName">{{ stepName }}</span>
                    </div>
                  </div>
                </div>

                <div class="flow-detail-stats">
                  <div class="detail-stat-card">
                    <span class="detail-stat-card__label">目标主机</span>
                    <strong class="detail-stat-card__value">{{ activeFlowHostCount }}</strong>
                  </div>
                  <div class="detail-stat-card">
                    <span class="detail-stat-card__label">流程步骤</span>
                    <strong class="detail-stat-card__value">{{ activeFlowStepCount }}</strong>
                  </div>
                  <div class="detail-stat-card">
                    <span class="detail-stat-card__label">全局参数</span>
                    <strong class="detail-stat-card__value">{{ activeFlowParamCount }}</strong>
                  </div>
                  <div class="detail-stat-card">
                    <span class="detail-stat-card__label">实例总数</span>
                    <strong class="detail-stat-card__value">{{ instanceRows.length }}</strong>
                  </div>
                </div>
                <div class="flow-detail-actions">
                  <el-button type="primary" size="small" @click="handleRunFlow(activeFlow)">
                    <i class="fa fa-play me-1" />
                    执行流程
                  </el-button>
                  <el-button size="small" @click="handleEditFlow(activeFlow)">
                    <i class="fa fa-edit me-1" />
                    编辑
                  </el-button>
                  <el-button size="small" type="danger" plain @click="handleDeleteFlow(activeFlow)">
                    <i class="fa fa-trash-alt me-1" />
                    删除
                  </el-button>
                </div>
              </div>
            </section>

            <section class="flow-instance-section">
              <div class="flow-instance-panel">
                <div class="table-panel-header">
                  <div class="table-panel-header__meta">
                    <h3 class="table-panel-title">流程实例</h3>
                    <span class="table-panel-summary">{{ instanceSummaryText }}</span>
                  </div>
                  <span v-if="filteredInstances.length" class="table-panel-summary">
                    当前页 {{ currentPage }}/{{ pageCount }}
                  </span>
                </div>
                <div class="flow-detail-toolbar">
                  <div class="flow-detail-toolbar__filters">
                    <el-input
                      v-model="instanceKeyword"
                      placeholder="搜索流程实例"
                      size="small"
                      clearable
                      class="instance-search"
                      @keyup.enter="handleRefreshFlows"
                      @clear="handleRefreshFlows"
                    >
                      <template #prefix>
                        <i class="fa fa-search" />
                      </template>
                    </el-input>

                    <div class="instance-filter-strip">
                      <button
                        v-for="option in instanceStatusFilterOptions"
                        :key="option.value"
                        type="button"
                        class="instance-filter-chip"
                        :class="{ active: instanceStatusFilter === option.value }"
                        :aria-pressed="instanceStatusFilter === option.value"
                        @click="instanceStatusFilter = option.value"
                      >
                        <span>{{ option.label }}</span>
                        <em>{{ option.count }}</em>
                      </button>
                    </div>
                  </div>

                  <div class="flow-detail-toolbar__actions">
                    <el-button v-if="hasInstanceFilters" size="small" @click="resetInstanceFilters">
                      清空筛选
                    </el-button>
                    <el-button
                      class="toolbar-icon-btn"
                      circle
                      size="small"
                      title="刷新实例"
                      aria-label="刷新实例"
                      :loading="instancesLoading"
                      @click="refreshInstances"
                    >
                      <el-icon v-show="!instancesLoading"><Refresh /></el-icon>
                    </el-button>
                  </div>
                </div>

                <template v-if="instancesLoading || filteredInstances.length">
                  <div class="flow-instance-table-wrap">
                    <el-table
                      :data="paginatedInstances"
                      v-loading="instancesLoading"
                      height="100%"
                      row-key="id"
                      class="instance-table"
                      @row-click="handleViewInstance"
                    >
                      <el-table-column
                        prop="name"
                        label="名称"
                        min-width="240"
                        show-overflow-tooltip
                      />
                      <el-table-column label="状态" width="110" align="left">
                        <template #default="{ row }">
                          <el-tag
                            v-if="row.status"
                            size="small"
                            :type="getInstanceStatusType(row.status)"
                            effect="light"
                          >
                            {{ getInstanceStatusLabel(row.status) }}
                          </el-tag>
                          <span v-else>-</span>
                        </template>
                      </el-table-column>
                      <el-table-column prop="hostCount" label="主机数" width="90" align="left" />
                      <el-table-column prop="stepCount" label="步骤数" width="90" align="left" />
                      <el-table-column label="流程开始时间" min-width="180">
                        <template #default="{ row }">
                          {{ formatDateTime(row.createdAt) }}
                        </template>
                      </el-table-column>
                      <el-table-column label="最近更新时间" min-width="180">
                        <template #default="{ row }">
                          {{ formatDateTime(row.updatedAt) }}
                        </template>
                      </el-table-column>
                      <el-table-column
                        prop="createdBy"
                        label="执行人"
                        width="140"
                        show-overflow-tooltip
                      />
                      <el-table-column label="操作" width="120" fixed="right" align="left">
                        <template #default="{ row }">
                          <el-button
                            type="primary"
                            text
                            size="small"
                            @click.stop="handleViewInstance(row)"
                          >
                            查看详情
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </template>

                <el-empty v-else class="instance-empty" :image-size="80">
                  <template #description>
                    <h4>{{ instanceEmptyTitle }}</h4>
                    <p>{{ instanceEmptyDescription }}</p>
                  </template>
                  <div class="instance-empty__actions">
                    <el-button v-if="hasInstanceFilters" size="small" @click="resetInstanceFilters">
                      清空筛选
                    </el-button>
                    <el-button type="primary" size="small" @click="handleRunFlow(activeFlow)">
                      <i class="fa fa-play me-1" />
                      执行流程
                    </el-button>
                  </div>
                </el-empty>

                <div v-if="filteredInstances.length" class="ops-pagination-wrapper">
                  <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total="filteredInstances.length"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    background
                  />
                </div>
              </div>
            </section>
          </div>
        </template>
        <el-empty
          v-else
          class="detail-blank"
          :image-size="80"
          description="选择左侧流程以查看实例，或直接创建一个新流程。"
        >
          <el-button type="primary" size="small" @click="handleCreateFlow">
            <i class="fa fa-plus me-1" />
            新建流程
          </el-button>
        </el-empty>
      </section>

      <FlowEditor
        v-model="flowEditorVisible"
        :mode="flowEditorMode"
        :flow-id="editingFlowId"
        @saved="handleFlowSaved"
      />

      <FlowInstanceViewer v-model="instanceViewerVisible" :instance-id="viewingInstanceId" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { formatDateTime } from '../../utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'
import FlowEditor from '../../components/job/schedule/components/FlowEditor.vue'
import FlowInstanceViewer from '../../components/job/schedule/components/FlowInstanceViewer.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

const flowList = ref([])
const flowsLoading = ref(false)
const flowFilter = ref('')
const orderField = ref('updatedAt')
const orderDesc = ref(false)
const activeFlowId = ref('')
const activeFlowDetail = ref(null)
const activeFlowDetailLoading = ref(false)
const instanceRows = ref([])
const instancesLoading = ref(false)
const instanceKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base', numeric: true })
const flowEditorVisible = ref(false)
const flowEditorMode = ref('edit')
const editingFlowId = ref('')
const instanceViewerVisible = ref(false)
const viewingInstanceId = ref('')
const FLOW_STEP_PREVIEW_LIMIT = 10
let flowDetailRequestId = 0
let flowInstancesRequestId = 0

useActiveTaskListPolling({
  records: instanceRows,
  refresh: () => fetchFlowInstances(activeFlowId.value),
  enabled: () => Boolean(activeFlowId.value),
  activeStatuses: ['WAITING', 'PENDING', 'QUEUED', 'RUNNING', 'STARTED', 'PROCESSING']
})

const visibleFlows = computed(() => {
  const term = flowFilter.value.trim().toLowerCase()
  const filtered = !term
    ? [...flowList.value]
    : flowList.value.filter(flow => flow.name?.toLowerCase().includes(term))
  return filtered.sort((a, b) => compareFlows(a, b))
})

const activeFlow = computed(
  () => flowList.value.find(flow => flow.id === activeFlowId.value) || null
)
const orderFieldLabel = computed(() => (orderField.value === 'name' ? '名称' : '更新时间'))
const flowSummaryText = computed(() => {
  const total = flowList.value.length
  const visible = visibleFlows.value.length

  if (!total) return '暂无流程'
  if (visible !== total) return `筛选后 ${visible} / ${total} 个流程`
  return `共 ${total} 个流程`
})

const sortedInstanceRows = computed(() => [...instanceRows.value].sort(compareInstanceRows))
const hasInstanceSearch = computed(() => !!instanceKeyword.value.trim())
const hasFlowSearch = computed(() => !!flowFilter.value.trim())
const instanceStatusFilter = ref('all')

const instanceStatusCountMap = computed(() => {
  const summary = {
    all: instanceRows.value.length,
    running: 0,
    success: 0,
    failed: 0,
    waiting: 0
  }

  instanceRows.value.forEach(row => {
    const bucket = getInstanceStatusBucket(row.status)
    if (summary[bucket] != null) {
      summary[bucket] += 1
    }
  })

  return summary
})

const instanceStatusFilterOptions = computed(() => [
  { value: 'all', label: '全部', count: instanceStatusCountMap.value.all },
  { value: 'running', label: '运行中', count: instanceStatusCountMap.value.running },
  { value: 'success', label: '成功', count: instanceStatusCountMap.value.success },
  { value: 'failed', label: '失败', count: instanceStatusCountMap.value.failed },
  { value: 'waiting', label: '待执行', count: instanceStatusCountMap.value.waiting }
])

const hasInstanceFilters = computed(
  () => hasInstanceSearch.value || instanceStatusFilter.value !== 'all'
)

const filteredInstances = computed(() => {
  const term = instanceKeyword.value.trim().toLowerCase()
  return sortedInstanceRows.value.filter(item => {
    const matchesKeyword =
      !term ||
      item.name.toLowerCase().includes(term) ||
      (item.createdBy ? item.createdBy.toLowerCase().includes(term) : false)

    const matchesStatus =
      instanceStatusFilter.value === 'all' ||
      getInstanceStatusBucket(item.status) === instanceStatusFilter.value

    return matchesKeyword && matchesStatus
  })
})

const paginatedInstances = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredInstances.value.slice(start, end)
})

const pageCount = computed(() =>
  filteredInstances.value.length ? Math.ceil(filteredInstances.value.length / pageSize.value) : 0
)

const instanceSummaryText = computed(() => {
  const total = instanceRows.value.length
  const filtered = filteredInstances.value.length

  if (!total) return '暂无实例'
  if (filtered !== total) return `筛选后 ${filtered} / ${total} 个实例`
  return `共 ${total} 个实例`
})

const activeFlowUpdatedText = computed(() =>
  formatDateTime(
    activeFlowDetail.value?.updatedAt || activeFlow.value?.updatedAt || activeFlow.value?.createdAt
  )
)

const activeFlowDescriptionText = computed(
  () => activeFlowDetail.value?.description?.trim() || '当前流程暂无描述'
)

const activeFlowHostCount = computed(() => activeFlowDetail.value?.hosts?.length || 0)
const activeFlowStepCount = computed(() => activeFlowDetail.value?.steps?.length || 0)
const activeFlowParamCount = computed(() => activeFlowDetail.value?.globalParams?.length || 0)
const activeFlowStepPreview = computed(() =>
  (activeFlowDetail.value?.steps || [])
    .slice(0, FLOW_STEP_PREVIEW_LIMIT)
    .map(step => step.name || '未命名步骤')
)
const activeFlowStepOverflow = computed(() =>
  Math.max(activeFlowStepCount.value - activeFlowStepPreview.value.length, 0)
)

const instanceEmptyTitle = computed(() => {
  if (!instanceRows.value.length) return '当前流程还没有执行实例'
  return '没有匹配的流程实例'
})

const instanceEmptyDescription = computed(() => {
  if (!instanceRows.value.length) {
    return '可以先执行一次流程，实例会自动出现在这里。'
  }
  return '尝试调整搜索关键词或状态筛选，查看其它实例结果。'
})

watch(flowList, list => {
  if (!list.length) {
    activeFlowId.value = ''
    return
  }

  if (!list.some(flow => flow.id === activeFlowId.value)) {
    activeFlowId.value = list[0].id
  }
})

watch(activeFlowId, id => {
  instanceKeyword.value = ''
  instanceStatusFilter.value = 'all'
  currentPage.value = 1

  if (!id) {
    activeFlowDetail.value = null
    instanceRows.value = []
    return
  }

  fetchFlowDetail(id)
  fetchFlowInstances(id)
})

watch([instanceKeyword, instanceStatusFilter, pageSize], () => {
  currentPage.value = 1
})

watch(pageCount, count => {
  if (!count) {
    currentPage.value = 1
    return
  }

  if (currentPage.value > count) {
    currentPage.value = count
  }
})

onMounted(() => {
  fetchFlowList()
})

async function fetchFlowList() {
  flowsLoading.value = true
  try {
    const response = await jaoApi.fetchFlows()
    flowList.value = normalizeFlows(resolveResponseArray(response))
    return flowList.value
  } catch (error) {
    ElMessage.error(error?.message || '获取流程列表失败')
    flowList.value = []
    return []
  } finally {
    flowsLoading.value = false
  }
}

async function handleRefreshFlows() {
  await fetchFlowList()
  if (activeFlowId.value) {
    fetchFlowDetail(activeFlowId.value)
    fetchFlowInstances(activeFlowId.value)
  }
}

async function fetchFlowDetail(flowId) {
  if (!flowId) return

  const requestId = ++flowDetailRequestId
  activeFlowDetailLoading.value = true

  try {
    const response = await jaoApi.fetchFlowDetail(flowId)
    if (requestId !== flowDetailRequestId || activeFlowId.value !== flowId) return
    activeFlowDetail.value = normalizeFlowDetail(response?.data ?? response ?? {})
  } catch (error) {
    if (requestId === flowDetailRequestId) {
      ElMessage.error(error?.message || '获取流程详情失败')
      activeFlowDetail.value = null
    }
  } finally {
    if (requestId === flowDetailRequestId) {
      activeFlowDetailLoading.value = false
    }
  }
}

async function fetchFlowInstances(flowId) {
  if (!flowId) return

  const requestId = ++flowInstancesRequestId
  instancesLoading.value = true

  try {
    const response = await jaoApi.fetchFlowInstances(flowId)
    if (requestId !== flowInstancesRequestId || activeFlowId.value !== flowId) return
    instanceRows.value = normalizeInstances(resolveResponseArray(response))
  } catch (error) {
    if (requestId === flowInstancesRequestId) {
      ElMessage.error(error?.message || '获取流程实例失败')
      instanceRows.value = []
    }
  } finally {
    if (requestId === flowInstancesRequestId) {
      instancesLoading.value = false
    }
  }
}

function refreshInstances() {
  if (activeFlowId.value) {
    fetchFlowInstances(activeFlowId.value)
  }
}

function clearInstanceKeyword() {
  instanceKeyword.value = ''
}

function clearFlowFilter() {
  flowFilter.value = ''
}

function resetInstanceFilters() {
  clearInstanceKeyword()
  instanceStatusFilter.value = 'all'
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
  ElMessageBox.confirm(`确定要删除流程「${flow.name}」吗？此操作不可恢复。`, '删除确认', {
    closeOnClickModal: false,
    closeOnPressEscape: false,
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
    .then(async () => {
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
    })
    .catch(() => {
      // 用户取消删除
    })
}

async function handleFlowSaved(payload = {}) {
  flowEditorVisible.value = false
  const previousActiveFlowId = activeFlowId.value
  const fallbackFlowId = editingFlowId.value
  editingFlowId.value = ''

  const nextFlowId = payload?.flowId || fallbackFlowId
  const nextFlowName = payload?.flowName || ''
  const action = payload?.action || 'save'
  const list = await fetchFlowList()
  const nextFlow = resolvePreferredFlow(list, {
    flowId: nextFlowId,
    flowName: nextFlowName,
    previousActiveFlowId
  })

  if (nextFlow?.id) {
    if (nextFlow.id !== activeFlowId.value) {
      activeFlowId.value = nextFlow.id
      return
    }
    fetchFlowDetail(nextFlow.id)
  }

  if (action === 'run' && activeFlowId.value) {
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

function compareInstanceRows(a, b) {
  return getInstanceSortTime(b) - getInstanceSortTime(a)
}

function getInstanceSortTime(row) {
  return Date.parse(row?.updatedAt || row?.createdAt || '') || 0
}

function resolvePreferredFlow(
  list,
  { flowId = '', flowName = '', previousActiveFlowId = '' } = {}
) {
  if (!Array.isArray(list) || !list.length) return null
  if (flowId) {
    const matchedById = list.find(flow => flow.id === flowId)
    if (matchedById) return matchedById
  }
  if (flowName) {
    const matchedByName = list.find(flow => flow.name === flowName)
    if (matchedByName) return matchedByName
  }
  if (previousActiveFlowId) {
    const previous = list.find(flow => flow.id === previousActiveFlowId)
    if (previous) return previous
  }
  return list[0]
}

function normalizeFlowDetail(data) {
  const globalParams = resolveGlobalParams(data)
  return {
    id: data.id ?? data.flowId ?? '',
    name: data.name ?? activeFlow.value?.name ?? '未命名流程',
    description: data.description ?? '',
    updatedAt: data.updatedAt ?? data.updated_at ?? data.modifiedAt ?? '',
    createdAt: data.createdAt ?? data.created_at ?? '',
    hosts: Array.isArray(data.hosts) ? data.hosts : [],
    steps: Array.isArray(data.steps)
      ? data.steps.map(step => ({
          id: step.id ?? '',
          name: step.name ?? '',
          type: step.type ?? 'script'
        }))
      : [],
    globalParams
  }
}

function resolveGlobalParams(data) {
  if (Array.isArray(data?.globalParams)) return data.globalParams
  if (!data?.globalParamsJson) return []

  try {
    const parsed = JSON.parse(String(data.globalParamsJson))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeFlows(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map(row => ({
      id: row.id ?? row.flowId ?? '',
      name: row.name ?? row.flowName ?? '未命名流程',
      updatedAt: row.updatedAt ?? row.updated_at ?? row.modifiedAt ?? '',
      createdAt: row.createdAt ?? row.created_at ?? ''
    }))
    .filter(item => !!item.id)
}

function normalizeInstances(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map(row => {
      const hosts = safeJsonArray(row.hosts)
      const steps = safeJsonArray(row.stepIds ?? row.steps ?? row.step_ids)
      return {
        id: row.id ?? row.instanceId ?? '',
        name: row.name ?? row.instanceName ?? '未命名实例',
        status: normalizeInstanceStatus(
          row.status ?? row.instanceStatus ?? row.runStatus ?? row.state ?? ''
        ),
        hostCount: hosts.length || Number(row.hostCount) || 0,
        stepCount: steps.length || Number(row.stepCount) || 0,
        createdAt: row.createdAt ?? row.startTime ?? row.created_at,
        updatedAt: row.updatedAt ?? row.endTime ?? row.finishedAt ?? row.updated_at ?? '',
        createdBy: row.createdBy ?? row.creator ?? row.runBy ?? ''
      }
    })
    .filter(item => !!item.id)
}

function normalizeInstanceStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase()
}

function getInstanceStatusBucket(status) {
  if (['SUCCESS', 'COMPLETED', 'FINISHED', 'DONE'].includes(status)) return 'success'
  if (['FAILED', 'ERROR', 'INTERRUPTED', 'ABORTED', 'CANCELLED'].includes(status)) return 'failed'
  if (['RUNNING', 'STARTED', 'PROCESSING'].includes(status)) return 'running'
  if (['WAITING', 'PENDING', 'QUEUED'].includes(status)) return 'waiting'
  return 'waiting'
}

function getInstanceStatusType(status) {
  if (getInstanceStatusBucket(status) === 'success') return 'success'
  if (getInstanceStatusBucket(status) === 'failed') return 'danger'
  if (getInstanceStatusBucket(status) === 'running') return 'primary'
  if (getInstanceStatusBucket(status) === 'waiting') return 'warning'
  return 'info'
}

function getInstanceStatusLabel(status) {
  const statusLabelMap = {
    SUCCESS: '成功',
    COMPLETED: '已完成',
    FINISHED: '已完成',
    DONE: '已完成',
    FAILED: '失败',
    ERROR: '错误',
    INTERRUPTED: '已中断',
    ABORTED: '已终止',
    CANCELLED: '已取消',
    RUNNING: '运行中',
    STARTED: '运行中',
    PROCESSING: '处理中',
    WAITING: '等待中',
    PENDING: '待执行',
    QUEUED: '排队中'
  }

  return statusLabelMap[status] || status || '未知'
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
</script>

<style scoped lang="scss">
.schedule-page {
  flex: 1;
  width: 100%;
  min-width: 0;
  font-size: 13px;
}

.schedule-shell {
  display: flex;
  flex: 1;
  gap: 20px;
  min-height: 0;
  overflow: hidden;
}

.flow-list-panel {
  display: flex;
  flex: 0 0 280px;
  flex-direction: column;
  min-width: 0;
  padding-right: 16px;
  border-right: 1px solid var(--el-border-color-light);
}

.flow-list-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.flow-list-header__top,
.flow-list-actions,
.flow-list-controls,
.flow-item__row,
.flow-item__name-row,
.flow-detail-actions,
.flow-detail-toolbar,
.flow-detail-toolbar__filters,
.flow-detail-toolbar__actions,
.table-panel-header,
.table-panel-header__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-list-header__top,
.flow-item__row,
.table-panel-header {
  justify-content: space-between;
}

.flow-list-header__meta,
.flow-item__content,
.flow-detail-heading {
  min-width: 0;
}

.flow-list-title,
.table-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--el-text-color-primary);
}

.flow-list-summary {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-list-actions,
.flow-detail-actions,
.flow-detail-toolbar__actions {
  flex-shrink: 0;
}

.flow-search {
  flex: 1;
  min-width: 0;
}

.flow-list-body {
  flex: 1;
  min-height: 0;
  padding-top: 8px;
}

.flow-list-scroll {
  height: 100%;
}

.flow-list-scroll :deep(.el-scrollbar__view) {
  padding: 2px;
}

.flow-item {
  position: relative;
  margin-bottom: 4px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.flow-item::before {
  content: '';
  position: absolute;
  inset: 8px auto 8px -1px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
}

.flow-item:hover {
  background: var(--el-fill-color-light);
}

.flow-item.active {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}

.flow-item.active::before {
  background: var(--el-color-primary);
}

.flow-item:focus-visible,
.instance-filter-chip:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.flow-item__content {
  flex: 1;
}

.flow-item__title {
  min-width: 0;
  overflow: hidden;
  font-weight: 500;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-item__name-row :deep(.el-tag) {
  flex-shrink: 0;
}

.flow-item__meta-line {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.flow-item__actions {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.flow-item-action-btn {
  width: 24px;
  height: 24px;
  padding: 0;
}

.flow-item:hover .flow-item__actions,
.flow-item:focus-within .flow-item__actions,
.flow-item.active .flow-item__actions {
  opacity: 1;
  pointer-events: auto;
}

.flow-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 8px;
  text-align: center;
}

.flow-list-empty__icon {
  font-size: 28px;
  color: var(--el-text-color-placeholder);
}

.flow-list-empty__title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.flow-list-empty__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.flow-detail-panel,
.flow-detail-stack,
.flow-instance-section,
.flow-instance-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.flow-detail-panel {
  overflow: hidden;
}

.flow-detail-stack {
  overflow: auto;
}

.flow-detail-overview {
  flex-shrink: 0;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.flow-detail-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
}

.flow-detail-heading {
  grid-column: 1;
  grid-row: 1;
}

.flow-detail-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
}

.flow-detail-meta {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.flow-detail-description {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.flow-detail-actions {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  padding-top: 1px;
}

.flow-detail-stats {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 2;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 12px 0;
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
}

.detail-stat-card {
  min-width: 0;
  padding: 0 16px;
  border-right: 1px solid var(--el-border-color-light);
}

.detail-stat-card:last-child {
  border-right: 0;
}

.detail-stat-card__label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-stat-card__value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
  line-height: 24px;
  color: var(--el-text-color-primary);
}

.flow-step-preview {
  grid-column: 1 / -1;
  grid-row: 3;
  min-width: 0;
}

.flow-step-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-step-preview__list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.flow-step-card {
  display: flex;
  flex: 0 0 120px;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.flow-step-card__index {
  font-size: 11px;
  line-height: 16px;
  color: var(--el-text-color-secondary);
}

.flow-step-card__name {
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-instance-section {
  min-height: 320px;
}

.table-panel-header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.table-panel-header__meta {
  flex-wrap: wrap;
}

.table-panel-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-detail-toolbar {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.flow-detail-toolbar__filters {
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
  gap: 12px;
}

.instance-search {
  flex: 0 1 220px;
  min-width: 160px;
}

.instance-filter-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.instance-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.instance-filter-chip em {
  font-size: 11px;
  font-style: normal;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.instance-filter-chip:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.instance-filter-chip.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.instance-filter-chip.active em {
  color: inherit;
}

.flow-instance-table-wrap {
  display: flex;
  flex: 1;
  min-height: 0;
}

.instance-table {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.instance-table :deep(.el-table__row) {
  cursor: pointer;
}

.instance-empty,
.detail-blank {
  flex: 1;
  padding: 32px 16px;
}

.instance-empty :deep(.el-empty__description h4) {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  color: var(--el-text-color-regular);
}

.instance-empty :deep(.el-empty__description p) {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
}

.flow-list-empty__actions,
.instance-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.flow-list-actions :deep(.el-button + .el-button),
.flow-item__actions :deep(.el-button + .el-button),
.flow-detail-actions :deep(.el-button + .el-button),
.flow-detail-toolbar__actions :deep(.el-button + .el-button),
.flow-list-empty__actions :deep(.el-button + .el-button),
.instance-empty__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.ops-pagination-wrapper {
  overflow-x: auto;
}

.me-1 {
  margin-right: 4px;
}

@media (max-width: 1280px) {
  .schedule-shell {
    gap: 16px;
  }

  .flow-list-panel {
    flex-basis: 250px;
  }
}

@media (max-width: 900px) {
  .schedule-shell {
    flex-direction: column;
    overflow: auto;
  }

  .flow-list-panel {
    flex: 0 0 220px;
    padding-right: 0;
    padding-bottom: 12px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .flow-detail-panel {
    flex: 1 0 auto;
    overflow: visible;
  }

  .flow-detail-stack {
    overflow: visible;
  }

  .flow-instance-section {
    min-height: 360px;
  }

  .flow-instance-table-wrap {
    flex: none;
    height: 320px;
  }

  .detail-blank {
    min-height: 280px;
  }
}

@media (max-width: 600px) {
  .flow-detail-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .flow-detail-actions {
    grid-column: 1;
    grid-row: 2;
    flex-wrap: wrap;
    padding-top: 0;
  }

  .flow-detail-stats {
    grid-row: 3;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 16px;
  }

  .detail-stat-card:nth-child(2n) {
    border-right: 0;
  }

  .flow-step-preview {
    grid-row: 4;
  }

  .instance-search {
    flex-basis: 100%;
  }

  .flow-detail-toolbar__actions {
    margin-left: auto;
  }

  .ops-pagination-wrapper {
    justify-content: flex-start;
  }
}

@media (hover: none) {
  .flow-item__actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
