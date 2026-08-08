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
                class="flow-header-btn"
                plain
                :loading="flowsLoading"
                @click="handleRefreshFlows"
              >
                <el-icon v-show="!flowsLoading"><Refresh /></el-icon>
                <span>刷新</span>
              </el-button>
              <el-button type="primary" class="flow-create-btn" @click="handleCreateFlow">
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
              class="flow-search" @keyup.enter="handleRefreshFlows" @clear="handleRefreshFlows">
              <template #prefix>
                <i class="fa fa-search" />
              </template>
            </el-input>
            <el-dropdown trigger="click" @command="handleOrderCommand">
              <el-button class="flow-order-btn" plain>
                <i class="fa fa-sort" />
                <span>排序 · {{ orderFieldLabel }}</span>
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
                @click="handleSelectFlow(flow)"
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
                    <div class="flow-item__meta-line">
                      <span class="flow-item__meta-label">更新时间</span>
                      <span class="flow-item__meta">
                        {{ formatDateTime(flow.updatedAt || flow.createdAt) }}
                      </span>
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
              </div>
            </template>
            <div v-else-if="hasFlowSearch" class="flow-list-empty">
              <i class="fa fa-search flow-list-empty__icon" />
              <h4 class="flow-list-empty__title">没有匹配的流程</h4>
              <p class="flow-list-empty__desc">尝试更换关键词，或清空当前搜索条件。</p>
              <div class="flow-list-empty__actions">
                <el-button @click="clearFlowFilter">清空搜索</el-button>
                <el-button type="primary" @click="handleCreateFlow">
                  <i class="fa fa-plus me-1" />
                  新建流程
                </el-button>
              </div>
            </div>
            <el-empty v-else description="暂无流程" :image-size="100">
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
                <div class="flow-detail-header__main">
                  <div class="flow-detail-heading">
                    <div class="flow-detail-eyebrow">当前流程</div>
                    <h2 class="flow-detail-title">{{ activeFlow.name }}</h2>
                    <div class="flow-detail-meta">
                      <span>更新时间 {{ activeFlowUpdatedText }}</span>
                      <span>{{ instanceSummaryText }}</span>
                      <span>当前页 {{ currentPage }}/{{ pageCount || 1 }}</span>
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
                        <span class="flow-step-card__name">{{ stepName }}</span>
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
                </div>

                <div class="flow-detail-actions">
                  <el-button
                    type="primary"
                    class="flow-primary-action"
                    @click="handleRunFlow(activeFlow)"
                  >
                    <i class="fa fa-play me-1" />
                    执行流程
                  </el-button>
                  <el-button class="flow-secondary-action" @click="handleEditFlow(activeFlow)">
                    <i class="fa fa-edit me-1" />
                    编辑
                  </el-button>
                  <el-button class="flow-secondary-action" @click="handleDeleteFlow(activeFlow)">
                    <i class="fa fa-trash-alt me-1" />
                    删除
                  </el-button>
                </div>
              </div>
            </section>

            <section class="flow-instance-section">
              <div class="flow-instance-panel">
                <div class="flow-detail-toolbar">
                  <div class="flow-detail-toolbar__filters">
                    <el-input
                      v-model="instanceKeyword"
                      placeholder="搜索流程实例"
                      size="small"
                      clearable
                      class="instance-search" @keyup.enter="handleRefreshFlows" @clear="handleRefreshFlows">
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
                        @click="instanceStatusFilter = option.value"
                      >
                        <span>{{ option.label }}</span>
                        <em>{{ option.count }}</em>
                      </button>
                    </div>
                  </div>

                  <div class="flow-detail-toolbar__actions">
                    <el-button
                      v-if="hasInstanceFilters"
                      class="flow-toolbar-clear-btn"
                      plain
                      @click="resetInstanceFilters"
                    >
                      清空筛选
                    </el-button>
                    <el-button
                      class="flow-toolbar-refresh-btn"
                      plain
                      :loading="instancesLoading"
                      @click="refreshInstances"
                    >
                      <el-icon v-show="!instancesLoading"><Refresh /></el-icon>
                      <span>刷新</span>
                    </el-button>
                  </div>
                </div>

                <div class="table-panel-header">
                  <div class="table-panel-header__meta">
                    <h3 class="table-panel-title">流程实例</h3>
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

                <div v-else class="instance-empty">
                  <i class="fa" :class="hasInstanceSearch ? 'fa-search' : 'fa-stream'" />
                  <h4>{{ instanceEmptyTitle }}</h4>
                  <p>
                    {{ instanceEmptyDescription }}
                  </p>
                  <div class="instance-empty__actions">
                    <el-button v-if="hasInstanceFilters" @click="resetInstanceFilters">
                      清空筛选
                    </el-button>
                    <el-button type="primary" @click="handleRunFlow(activeFlow)">
                      <i class="fa fa-play me-1" />
                      执行流程
                    </el-button>
                  </div>
                </div>

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
        <div v-else class="detail-blank">
          <i class="fa fa-inbox detail-blank__icon" />
          <p>选择左侧流程以查看实例，或直接创建一个新流程。</p>
          <el-button type="primary" @click="handleCreateFlow">
            <i class="fa fa-plus me-1" />
            新建流程
          </el-button>
        </div>
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
@use '@/styles/common.scss' as *;

.schedule-page {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  gap: 0;
  --schedule-surface-bg: var(--el-bg-color);
  --schedule-side-bg: color-mix(in srgb, var(--el-fill-color-light) 55%, var(--el-bg-color));
  --schedule-card-hover-border: #cfd8ec;
  --schedule-card-hover-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  --schedule-card-active-bg: color-mix(in srgb, var(--el-color-primary) 6%, var(--el-bg-color));
  --schedule-card-active-shadow: 0 6px 18px rgba(64, 158, 255, 0.25);
  --schedule-primary-shadow: 0 10px 22px rgba(64, 158, 255, 0.18);
  --schedule-panel-shadow: 0 12px 28px rgba(15, 23, 42, 0.04);
  --schedule-toolbar-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  --schedule-header-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
  --schedule-empty-text: #9ca3af;
  --schedule-empty-icon: #d1d5db;
}

.schedule-shell {
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 0;
  background: var(--schedule-surface-bg);
  border-radius: 12px;
  overflow: hidden;
}

.flow-list-panel {
  width: 320px;
  min-width: 320px;
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  background: var(--schedule-side-bg);
}

.flow-list-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.flow-list-header__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.flow-list-header__meta {
  min-width: 0;
}

.flow-list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.flow-list-summary {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-list-actions,
.flow-list-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-list-actions {
  flex-shrink: 0;
}

.flow-list-controls {
  width: 100%;
}

.flow-header-btn,
.flow-order-btn,
.flow-create-btn,
.flow-toolbar-refresh-btn {
  min-height: 36px;
  padding-inline: 12px;
  border-radius: 10px;
  font-size: 13px;
}

.flow-header-btn,
.flow-order-btn,
.flow-toolbar-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}

.flow-order-btn {
  flex-shrink: 0;
}

.flow-create-btn {
  box-shadow: var(--schedule-primary-shadow);
}

.flow-search {
  flex: 1;
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
  padding: 14px;
}

.flow-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 220px;
  padding: 24px 18px;
  text-align: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-fill-color-light) 70%, var(--el-bg-color));
}

.flow-list-empty__icon {
  font-size: 32px;
  color: var(--el-text-color-placeholder);
}

.flow-list-empty__title {
  margin: 0;
  font-size: 17px;
  color: var(--el-text-color-primary);
}

.flow-list-empty__desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.flow-list-empty__actions {
  display: flex;
  gap: 8px;
}

.flow-item {
  position: relative;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.flow-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.2s ease;
}

.flow-item__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.flow-item__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.flow-item__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flow-item__meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.flow-item__meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-item:last-child {
  margin-bottom: 0;
}

.flow-item:hover {
  border-color: var(--schedule-card-hover-border);
  box-shadow: var(--schedule-card-hover-shadow);
}

.flow-item.active {
  border-color: var(--el-color-primary);
  background: var(--schedule-card-active-bg);
  box-shadow: var(--schedule-card-active-shadow);
}

.flow-item.active::before {
  background: var(--el-color-primary);
}

.flow-item__title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-item__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.flow-item__actions {
  display: flex;
  opacity: 0;
  pointer-events: none;
  transform: translateY(2px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.flow-item-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 10px;
}

.flow-item-action-btn:hover {
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.flow-item:hover .flow-item__actions,
.flow-item.active .flow-item__actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.flow-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  min-width: 0;
  overflow: hidden;
}

.flow-detail-panel :deep(.flow-editor-panel) {
  height: 100%;
}

.flow-detail-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flow-detail-overview,
.flow-instance-section {
  min-height: 0;
}

.flow-detail-overview {
  flex-shrink: 0;
  padding: 16px 16px 10px;
}

.flow-detail-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  position: relative;
  margin: 0;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color-light));
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--el-color-primary) 9%, var(--el-bg-color)) 0%,
      var(--el-bg-color) 54%
    ),
    var(--el-bg-color);
  box-shadow: var(--schedule-header-shadow);
}

.flow-detail-header__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.flow-detail-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 320px;
}

.flow-detail-eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-primary) 12%, var(--el-bg-color));
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  letter-spacing: 0.04em;
}

.flow-detail-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}

.flow-detail-description {
  margin: 0;
  max-width: 860px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.flow-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-detail-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-fill-color-light) 82%, var(--el-bg-color));
  border: 1px solid var(--el-border-color-lighter);
}

.flow-step-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-fill-color-light) 84%, var(--el-bg-color));
  border: 1px solid var(--el-border-color-lighter);
}

.flow-step-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.flow-step-preview__label,
.flow-step-preview__more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flow-step-preview__label {
  font-weight: 600;
}

.flow-step-preview__list {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 8px;
}

.flow-step-card {
  --step-accent: var(--el-color-primary);
  --step-surface: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-bg-color));
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--step-accent) 22%, var(--el-border-color-light));
  background: linear-gradient(180deg, var(--step-surface) 0%, var(--el-bg-color) 100%);
}

.flow-step-card:nth-child(4n + 2) {
  --step-accent: #67c23a;
  --step-surface: color-mix(in srgb, #67c23a 12%, var(--el-bg-color));
}

.flow-step-card:nth-child(4n + 3) {
  --step-accent: #e6a23c;
  --step-surface: color-mix(in srgb, #e6a23c 13%, var(--el-bg-color));
}

.flow-step-card:nth-child(4n + 4) {
  --step-accent: #f56c6c;
  --step-surface: color-mix(in srgb, #f56c6c 11%, var(--el-bg-color));
}

.flow-step-card__index {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--step-accent) 14%, var(--el-bg-color));
  color: var(--step-accent);
  font-size: 10px;
  font-weight: 600;
}

.flow-step-card__name {
  min-width: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--el-text-color-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-word;
}

.flow-detail-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.detail-stat-card {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--el-fill-color-light) 82%, var(--el-bg-color)) 0%,
    var(--el-bg-color) 100%
  );
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.detail-stat-card__label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail-stat-card__value {
  display: block;
  margin-top: 4px;
  font-size: 20px;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.flow-detail-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 1;
}

.flow-primary-action,
.flow-secondary-action {
  min-height: 36px;
  min-width: 92px;
  padding-inline: 12px;
  border-radius: 12px;
  justify-content: center;
}

.flow-primary-action {
  box-shadow: var(--schedule-primary-shadow);
}

.flow-list-actions :deep(.el-button + .el-button),
.flow-detail-actions :deep(.el-button + .el-button),
.flow-detail-toolbar__actions :deep(.el-button + .el-button),
.flow-list-empty__actions :deep(.el-button + .el-button),
.instance-empty__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.flow-detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  background: color-mix(in srgb, var(--el-fill-color-light) 65%, var(--el-bg-color));
  box-shadow: var(--schedule-toolbar-shadow);
  flex-shrink: 0;
}

.flow-instance-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0 16px 16px;
  overflow: hidden;
}

.flow-detail-toolbar__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.instance-search {
  width: 280px;
  max-width: 100%;
}

.instance-filter-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.instance-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: var(--el-bg-color);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.instance-filter-chip em {
  font-style: normal;
  font-size: 12px;
  color: inherit;
  opacity: 0.8;
}

.instance-filter-chip:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.instance-filter-chip.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-bg-color));
  color: var(--el-color-primary);
  box-shadow: var(--schedule-primary-shadow);
}

.flow-detail-toolbar__actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  flex-shrink: 0;
  gap: 12px;
}

.flow-toolbar-clear-btn {
  min-height: 36px;
  border-radius: 10px;
}

.flow-instance-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 18px;
  background: var(--schedule-surface-bg);
  box-shadow: var(--schedule-panel-shadow);
  overflow: hidden;
}

.flow-instance-table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
}

.table-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 12px;
}

.table-panel-header__meta {
  min-width: 0;
}

.table-panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.ops-pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.instance-table {
  flex: 1;
  min-height: 0;
}

.instance-table :deep(.el-table) {
  border-radius: 12px;
}

.instance-table :deep(.el-table th) {
  background: color-mix(in srgb, var(--el-fill-color-light) 85%, var(--el-bg-color));
}

.instance-table :deep(.el-table__row) {
  cursor: pointer;
}

.instance-table :deep(.el-table__row:hover > td) {
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--el-bg-color));
}

.instance-empty {
  flex: 1;
  min-height: 0;
  margin: 4px 0 0;
  padding: 32px 24px;
  border: 1px dashed var(--el-border-color);
  border-radius: 16px;
  background: color-mix(in srgb, var(--el-fill-color-light) 72%, var(--el-bg-color));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.instance-empty > i {
  font-size: 42px;
  color: var(--el-text-color-placeholder);
}

.instance-empty > h4 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.instance-empty > p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  max-width: 420px;
}

.instance-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  width: 100%;
}

.instance-empty__actions :deep(.el-button) {
  min-width: 120px;
}

.detail-blank {
  flex: 1;
  margin: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--schedule-empty-text);
  gap: 12px;
  text-align: center;
}

.detail-blank__icon {
  font-size: 64px;
  color: var(--schedule-empty-icon);
}

.me-1 {
  margin-right: 4px;
}

@media (max-width: 1180px) {
  .schedule-shell {
    flex-direction: column;
  }

  .flow-list-panel {
    width: 100%;
    min-width: 0;
    max-height: 320px;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }

  .flow-detail-actions {
    position: static;
    flex-wrap: wrap;
    justify-content: flex-start;
    padding-top: 6px;
    border-top: 1px dashed
      color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color-light));
  }

  .flow-detail-actions :deep(.el-button) {
    flex: 1;
  }

  .flow-detail-heading {
    padding-right: 0;
  }

  .flow-step-preview__list,
  .flow-detail-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .flow-detail-toolbar__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .instance-search {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .flow-list-header__top,
  .flow-list-controls,
  .flow-detail-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .flow-list-actions {
    width: 100%;
  }

  .flow-header-btn,
  .flow-order-btn,
  .flow-create-btn,
  .flow-toolbar-refresh-btn {
    justify-content: center;
  }

  .flow-detail-toolbar__actions {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .flow-detail-overview,
  .flow-instance-section {
    padding-inline: 12px;
  }

  .flow-detail-overview,
  .flow-instance-section,
  .detail-blank {
    min-height: 0;
  }

  .flow-detail-overview {
    padding-top: 12px;
  }

  .table-panel-header {
    flex-direction: column;
  }

  .flow-list-empty__actions,
  .instance-filter-strip {
    width: 100%;
  }

  .instance-filter-chip {
    justify-content: space-between;
    flex: 1 1 calc(50% - 8px);
  }

  .flow-step-preview__list,
  .flow-detail-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-step-preview__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flow-detail-stats {
    grid-template-columns: 1fr;
  }

  .instance-empty__actions {
    width: 100%;
    flex-direction: column;
  }

  .ops-pagination-wrapper {
    justify-content: flex-start;
  }

  .flow-item__actions {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
}
</style>

<style lang="scss">
html.dark .schedule-page {
  --schedule-surface-bg: rgba(15, 23, 42, 0.82);
  --schedule-side-bg: linear-gradient(180deg, rgba(30, 41, 59, 0.82), rgba(15, 23, 42, 0.86));
  --schedule-card-hover-border: rgba(96, 165, 250, 0.26);
  --schedule-card-hover-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
  --schedule-card-active-bg: color-mix(
    in srgb,
    var(--el-color-primary) 14%,
    rgba(15, 23, 42, 0.92)
  );
  --schedule-card-active-shadow: 0 10px 24px rgba(59, 130, 246, 0.18);
  --schedule-primary-shadow: 0 12px 24px rgba(59, 130, 246, 0.22);
  --schedule-panel-shadow: 0 18px 36px rgba(0, 0, 0, 0.2);
  --schedule-toolbar-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  --schedule-header-shadow: 0 16px 32px rgba(0, 0, 0, 0.2);
  --schedule-empty-text: #94a3b8;
  --schedule-empty-icon: #64748b;
}
</style>
