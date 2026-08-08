<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`运维工具运行结果${jobTitle ? ` · ${jobTitle}` : ''}`"
    width="1260px"
    :z-index="zIndex"
    append-to-body
    destroy-on-close
    class="execute-result-dialog-wrapper"
    @close="handleClose"
  >
    <div class="result-dialog" v-loading="loading">
      <el-tabs v-model="activeTab">
        <el-tab-pane v-for="tab in visibleTabs" :key="tab.name" :label="tab.label" :name="tab.name">
          <template v-if="tab.name === 'overview'">
            <el-scrollbar max-height="calc(100vh - 240px)" class="overview-scroll">
              <template v-if="result">
                <div class="overview-header">
                  <div class="overview-status">
                    <div class="status-chip" :class="statusClass">{{ summary.statusLabel }}</div>
                    <div class="status-duration">{{ summary.duration }}</div>
                    <div class="status-range">
                      <span>{{ summary.startTime }}</span>
                      <span class="status-sep">→</span>
                      <span>{{ summary.endTime }}</span>
                    </div>
                  </div>
                  <div class="overview-meta">
                    <div class="meta-item">
                      <span class="meta-label">运行 ID</span>
                      <span class="meta-value">{{ summary.runId }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">执行通道</span>
                      <span class="meta-value">
                        <el-tag
                          size="small"
                          :type="summary.connectionType === 'mixed' ? 'warning' : (summary.isAgentConnection ? 'success' : summary.connectionType === 'ssh' ? 'info' : 'warning')"
                        >
                          {{ summary.connectionTypeLabel }}
                        </el-tag>
                      </span>
                    </div>
                    <div v-if="summary.agentClientId" class="meta-item">
                      <span class="meta-label">Agent Client ID</span>
                      <span class="meta-value">{{ summary.agentClientId }}</span>
                    </div>
                    <div v-if="summary.agentVersion" class="meta-item">
                      <span class="meta-label">Agent 版本</span>
                      <span class="meta-value">{{ summary.agentVersion }}</span>
                    </div>
                    <div v-if="summary.relayTraceId" class="meta-item">
                      <span class="meta-label">Relay 追踪 ID</span>
                      <span class="meta-value">{{ summary.relayTraceId }}</span>
                    </div>
                    <div v-if="summary.dispatchStatus" class="meta-item">
                      <span class="meta-label">下发状态</span>
                      <span class="meta-value">{{ summary.dispatchStatus }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">执行人</span>
                      <span class="meta-value">{{ summary.username }}</span>
                    </div>
                  </div>
                </div>
                <JobUpgradeOverview
                  v-if="isAnsibleJob"
                  :ansible-contents="ansibleContents"
                />

                <div
                  v-if="summary.errorTitle || summary.errorDetails || (summary.errorList && summary.errorList.length)"
                  class="result-error"
                >
                  <div class="error-title-bar">
                    <i class="fa fa-exclamation-triangle error-icon" />
                    <span class="error-title">{{ summary.errorTitle }}</span>
                  </div>
                  <div v-if="summary.errorList && summary.errorList.length" class="error-list">
                    <div v-for="(err, idx) in summary.errorList" :key="idx" class="error-item">
                      <span class="error-bullet">•</span>
                      <span class="error-text">{{ err }}</span>
                    </div>
                  </div>
                  <pre v-if="summary.errorDetails" class="error-details">{{ summary.errorDetails }}</pre>
                </div>

                <div v-if="batches.length && !hasHostInfo" class="result-section">
                  <div class="section-header">
                    <span>批次状态</span>
                  </div>
                  <div class="batch-list">
                    <div v-for="batch in batches" :key="batch.batch" class="batch-card">
                      <div class="batch-card__header">
                        <div>
                          <span class="batch-name">{{ batch.batch }}</span>
                          <span class="batch-status" :class="`is-${batch.status?.toLowerCase?.()}`">
                            {{ statusLabel(batch.status) }}
                          </span>
                        </div>
                        <span class="batch-meta">主机数：{{ batch.machineCount ?? 0 }}</span>
                      </div>
                      <div v-if="batch.steps && batch.steps.length" class="batch-steps">
                        <div v-for="step in batch.steps" :key="step.name" class="batch-step">
                          <div class="batch-step__title">
                            <span>{{ step.name }}</span>
                            <el-tag size="small" :type="statusTagType(step.status)">
                              {{ statusLabel(step.status) }}
                            </el-tag>
                          </div>
                          <p class="batch-step__message">{{ step.message }}</p>
                        </div>
                      </div>
                      <div v-else class="batch-step__message">无步骤信息</div>
                    </div>
                  </div>
                </div>
              </template>
              <el-empty v-else description="暂无执行数据" />
            </el-scrollbar>
          </template>

          <template v-else-if="tab.name === 'process'">
            <div v-if="processModelPretty" class="process-tab">
              <el-alert
                title="流程图渲染尚未接入，先展示配置 JSON"
                type="info"
                :closable="false"
                class="mb-3"
              />
              <el-scrollbar max-height="calc(100vh - 260px)" class="process-scroll">
                <pre class="process-json">{{ processModelPretty }}</pre>
              </el-scrollbar>
            </div>
            <el-empty v-else description="暂无流程配置" />
          </template>

          <template v-else-if="tab.name === 'hosts'">
            <div v-if="ansibleTreeData.length" class="hosts-pane">
              <div class="hosts-tree-panel">
                <div class="tree-toolbar">
                  <el-input v-model="hostFilterText" size="small" placeholder="搜索主机" clearable>
                    <template #prefix>
                      <i class="fa fa-search" />
                    </template>
                  </el-input>
                  <el-dropdown trigger="click" @command="handleHostAction">
                    <el-button text circle size="small">
                      <i class="fa fa-ellipsis-v" />
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="export" :disabled="!ansibleRawOutput">
                          <span>导出输出</span>
                        </el-dropdown-item>
                        <el-dropdown-item divided command="merge">
                          <span>批次合并模式</span>
                          <i v-if="mergeBatches" class="fa fa-check dropdown-check" />
                        </el-dropdown-item>
                        <el-dropdown-item command="expand">
                          {{ treeExpandAll ? '全部收起' : '全部展开' }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
                <el-scrollbar class="tree-scroll">
                  <el-tree
                    :key="treeRenderKey"
                    ref="hostTreeRef"
                    :data="ansibleTreeData"
                    :props="treeProps"
                    node-key="id"
                    highlight-current
                    :default-expand-all="treeExpandAll"
                    :expand-on-click-node="false"
                    :filter-node-method="filterHostNode"
                    @node-click="handleTreeNodeClick"
                  >
                    <template #default="{ data }">
                      <div class="tree-node" :class="`is-${data.type}`">
                        <div class="tree-node__label">
                          <i v-if="data.type === 'group'" class="fa fa-book" />
                          <i v-else-if="data.type === 'play'" class="fa fa-play-circle" />
                          <i v-else-if="data.type === 'host'" class="fa fa-server" />
                          <span>{{ data.label }}</span>
                        </div>
                        <template v-if="data.type === 'play'">
                          <span class="tree-node__meta">{{ data.hostCount }}</span>
                        </template>
                        <template v-else-if="data.type === 'host'">
                          <el-tag size="small" :type="taskStatusTag(data.status)">
                            {{ taskStatusLabel(data.status) }}
                          </el-tag>
                        </template>
                      </div>
                    </template>
                  </el-tree>
                </el-scrollbar>
              </div>
              <div class="hosts-detail-panel">
                <template v-if="selectedHost">
                  <div class="host-detail-header">
                    <div>
                      <div class="host-detail-title">
                        <h4>{{ selectedHost.title }}</h4>
                        <span v-if="selectedHost.delegateHost" class="delegate-badge">
                          Delegate: {{ selectedHost.delegateHost }}
                        </span>
                      </div>
                      <div class="host-detail-meta">
                        <el-tag size="small" :type="taskStatusTag(selectedHost.status)">
                          {{ taskStatusLabel(selectedHost.status) }}
                        </el-tag>
                        <span>{{ selectedHost.batchTitle }}</span>
                        <span>·</span>
                        <span>{{ selectedHost.playTitle }}</span>
                      </div>
                    </div>
                    <el-input
                      v-model="hostTaskSearch"
                      size="small"
                      placeholder="搜索任务或输出"
                      clearable
                      class="host-task-search"
                    >
                      <template #prefix>
                        <i class="fa fa-search" />
                      </template>
                    </el-input>
                  </div>
                  <div v-if="hostStatusChips.length" class="host-status-filters">
                    <span
                      v-for="chip in hostStatusChips"
                      :key="chip.status"
                      class="host-status-chip"
                      :class="{ active: hostStatusFilter === chip.status }"
                      @click="toggleHostStatus(chip.status)"
                    >
                      <span>{{ taskStatusLabel(chip.status) }}</span>
                      <span class="chip-count">{{ chip.count }}</span>
                    </span>
                  </div>
                  <el-scrollbar class="host-task-list">
                    <template v-if="filteredHostTasks.length">
                      <div
                        v-for="task in filteredHostTasks"
                        :key="task.id"
                        class="host-task-card"
                        :class="`is-${task.status}`"
                      >
                        <div class="host-task-card__header">
                          <div class="host-task-card__title">
                            <span v-if="task.delegateHost" class="delegate-badge">
                              {{ task.delegateHost }}
                            </span>
                            <span class="task-name">{{ task.name }}</span>
                          </div>
                          <el-tag size="small" :type="taskStatusTag(task.status)">
                            {{ taskStatusLabel(task.status) }}
                          </el-tag>
                        </div>
                        <pre v-if="task.output" class="host-task-card__output">{{
                          task.output
                        }}</pre>
                      </div>
                    </template>
                    <el-empty v-else description="暂无任务" />
                  </el-scrollbar>
                </template>
                <el-empty v-else description="请选择左侧主机" />
              </div>
            </div>
            <el-empty v-else description="暂无主机输出" />
          </template>

          <template v-else-if="tab.name === 'list'">
            <div
              v-if="
                filteredListRows.length ||
                listPlayOptions.length ||
                listHostOptions.length ||
                listKeyword ||
                selectedPlayFilter ||
                selectedHostFilter
              "
              class="list-view"
            >
              <div class="ops-filter-bar">
                <el-form :inline="true" size="small">
                  <el-form-item label="剧本" v-if="listPlayOptions.length">
                    <el-select
                      v-model="selectedPlayFilter"
                      placeholder="全部剧本"
                      clearable
                      style="width: 180px"
                    >
                      <el-option
                        v-for="play in listPlayOptions"
                        :key="play"
                        :label="play"
                        :value="play"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="目标主机" v-if="listHostOptions.length">
                    <el-select
                      v-model="selectedHostFilter"
                      placeholder="全部主机"
                      clearable
                      style="width: 180px"
                    >
                      <el-option
                        v-for="host in listHostOptions"
                        :key="host"
                        :label="host"
                        :value="host"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item>
                    <el-input
                      v-model="listKeyword"
                      placeholder="搜索主机 / 任务 / 输出"
                      clearable
                      style="width: 240px"
                    >
                      <template #prefix>
                        <i class="fa fa-search" />
                      </template>
                    </el-input>
                  </el-form-item>
                </el-form>
              </div>
              <el-table :data="paginatedListRows" :height="'calc(100vh - 350px)'" class="result-table">
                <el-table-column prop="host" label="主机" width="180" show-overflow-tooltip />
                <el-table-column
                  prop="executorUrl"
                  label="执行主机"
                  width="220"
                  show-overflow-tooltip
                />
                <el-table-column prop="task" label="任务" min-width="220" show-overflow-tooltip />
                <el-table-column prop="play" label="剧本" width="200" show-overflow-tooltip />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" :type="taskStatusTag(row.status)">
                      {{ taskStatusLabel(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="output" label="输出" min-width="240" show-overflow-tooltip />
              </el-table>
              <div
                class="pagination-wrapper"
                style="margin-top: 12px; display: flex; justify-content: flex-end"
              >
                <el-pagination
                  v-model:current-page="listCurrentPage"
                  v-model:page-size="listPageSize"
                  :page-sizes="[50, 100, 200, 500]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="filteredListRows.length"
                />
              </div>
            </div>
            <el-empty v-else description="暂无任务数据" />
          </template>

          <template v-else-if="tab.name === 'raw'">
            <div v-if="ansibleRawOutput" class="raw-output">
              <div class="raw-toolbar">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :disabled="!downloadUrl"
                  @click="openDownload"
                >
                  <i class="fa fa-file-export mr-1" />
                  下载 Ansible 原始输出
                </el-button>
              </div>
              <el-scrollbar max-height="calc(100vh - 260px)" class="raw-scroll">
                <div class="raw-code-container">
                  <div
                    v-for="line in rawOutputLines"
                    :key="line.id"
                    class="raw-code-line"
                    :style="{ paddingLeft: `${line.indent}ch` }"
                  >
                    {{ line.text || ' ' }}
                  </div>
                </div>
                <div
                  v-if="ansibleRawOutput.length > 500000 && !showFullRawOutput"
                  class="load-all-wrapper"
                  style="text-align: center; margin-top: 10px; padding-bottom: 20px"
                >
                  <el-button type="primary" plain @click="showFullRawOutput = true">
                    <i class="fa fa-download mr-1" />
                    加载全部内容（{{ (ansibleRawOutput.length / 1024).toFixed(0) }} KB）
                  </el-button>
                  <p
                    style="font-size: 14px; color: var(--el-text-color-secondary); margin-top: 8px"
                  >
                    数据量较大，加载全部可能导致短暂卡顿
                  </p>
                </div>
              </el-scrollbar>
            </div>
            <el-empty v-else description="暂无原始输出" />
          </template>

          <template v-else-if="tab.name === 'output'">
            <div class="output-tab">
              <AnsibleLogViewer
                :run-id="props.runId"
                :status="result?.status || ''"
                :active="activeTab === 'output'"
              />
            </div>
          </template>

          <template v-else-if="tab.name === 'rest'">
            <div class="rest-tab">
              <div class="rest-meta">
                <div class="rest-meta__item">
                  <span class="rest-meta__label">状态码</span>
                  <el-tag :type="statusTagType(result ? result.status : '')">
                    {{ restDetail.statusCode }}
                  </el-tag>
                </div>
                <div class="rest-meta__item">
                  <span class="rest-meta__label">Content-Type</span>
                  <span>{{ restDetail.contentType }}</span>
                </div>
              </div>
              <pre v-if="restDetail.error" class="rest-error">{{ restDetail.error }}</pre>
              <el-scrollbar v-else max-height="calc(100vh - 260px)" class="rest-payload">
                <pre>{{ restDetail.payload }}</pre>
              </el-scrollbar>
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDateTime } from '@/modules/automation/utils/helpers'
import * as jaoApi from '@/modules/automation/api/jao'
import { JOB_STATUS_LABELS, JOB_STATUS_TAG_TYPES } from '@/modules/automation/constants/jobStatus'
import { isActiveRunStatus, isSuccessfulRunStatus, normalizeRunStatus } from '@/utils/taskStatus'
import { AGENT_ERROR_MESSAGES, agentApi } from '@/modules/asset/api'
import { authService } from '@/core/auth'
import { translateText } from '@/utils/i18n'
import AnsibleLogViewer from '../AnsibleLogViewer.vue'
import JobUpgradeOverview from './JobUpgradeOverview.vue'

const ANSIBLE_JOB_TYPES = ['script', 'command', 'process']
const TASK_STATUS_LABELS = {
  ok: '成功',
  changed: '成功',
  failed: '失败',
  unreachable: '不可达',
  ignored: '忽略',
  skipped: '跳过',
  running: '运行中',
  unknown: '未知'
}
const TASK_STATUS_TAGS = {
  ok: 'success',
  changed: 'success',
  failed: 'danger',
  unreachable: 'danger',
  ignored: 'info',
  skipped: 'info',
  running: 'warning',
  unknown: 'info'
}
const HOST_STATUS_PRIORITY = [
  'unreachable',
  'failed',
  'changed',
  'ok',
  'ignored',
  'skipped',
  'running',
  'unknown'
]
const treeProps = { label: 'label', children: 'children' }

const props = defineProps({
  visible: { type: Boolean, default: false },
  runId: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  zIndex: { type: Number, default: undefined }
})

const emit = defineEmits(['update:visible', 'settled', 'close'])

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
})

const activeTab = ref('overview')
const loading = ref(false)
const result = ref(null)
const executionChannelInfo = ref({})
let executionChannelRequestSequence = 0
const pollTimer = ref()
const hasObservedActiveRun = ref(false)
const jobType = computed(() => normalizeJobType(result.value?.jobType ?? result.value?.job_type))
const isAnsibleJob = computed(() => ANSIBLE_JOB_TYPES.includes(jobType.value))
const isProcessJob = computed(() => jobType.value === 'process')
const isRestJob = computed(() => jobType.value === 'rest')
const processModelData = computed(() => parseProcessModel(result.value))
const processModelPretty = computed(() =>
  processModelData.value ? JSON.stringify(processModelData.value, null, 2) : ''
)
const ansibleArtifacts = computed(() => buildAnsibleArtifacts(result.value, isAnsibleJob.value))
const ansibleContents = computed(() => ansibleArtifacts.value.contents)
const ansibleRawOutput = computed(() => ansibleArtifacts.value.raw)
const ansibleHostRows = computed(() => summarizeHostRows(ansibleContents.value))
const hostTreeRef = ref(null)
const hostFilterText = ref('')
const hostTaskSearch = ref('')
const mergeBatches = ref(true)
const treeRenderKey = ref(0)
const treeExpandAll = ref(true)
const selectedHost = ref(null)
const hostStatusFilter = ref('')
const selectedPlayFilter = ref('')
const selectedHostFilter = ref('')
const listKeyword = ref('')
const listCurrentPage = ref(1)
const listPageSize = ref(50)
const showFullRawOutput = ref(false)
const ansibleTreeData = computed(
  () => buildHostTree(ansibleContents.value, { mergeBatches: mergeBatches.value }).tree
)

const hasHostInfo = computed(() => {
  if (!isAnsibleJob.value || !ansibleContents.value.length) return false
  return ansibleContents.value.some(content => {
    const plays = Array.isArray(content?.plays) ? content.plays : []
    return plays.some(play => {
      const tasks = Array.isArray(play?.tasks) ? play.tasks : []
      return tasks.some(task => Array.isArray(task?.hosts) && task.hosts.length > 0)
    })
  })
})



const hostTaskStats = computed(() => computeStatusStats(selectedHost.value?.tasks || []))
const hostStatusChips = computed(() => buildStatusChips(hostTaskStats.value))
const filteredHostTasks = computed(() =>
  filterHostTasks(selectedHost.value, hostStatusFilter.value, hostTaskSearch.value)
)
const listPlayOptions = computed(() => buildListPlayOptions(ansibleHostRows.value))
const listHostOptions = computed(() => buildListHostOptions(ansibleHostRows.value))
const filteredListRows = computed(() =>
  filterListRows(ansibleHostRows.value, {
    play: selectedPlayFilter.value,
    host: selectedHostFilter.value,
    keyword: listKeyword.value
  })
)

const paginatedListRows = computed(() => {
  const start = (listCurrentPage.value - 1) * listPageSize.value
  return filteredListRows.value.slice(start, start + listPageSize.value)
})

watch([selectedPlayFilter, selectedHostFilter, listKeyword], () => {
  listCurrentPage.value = 1
})

const truncatedAnsibleRawOutput = computed(() => {
  if (!ansibleRawOutput.value) return ''
  if (showFullRawOutput.value) return ansibleRawOutput.value
  const MAX_LEN = 500000
  return ansibleRawOutput.value.length > MAX_LEN
    ? `${ansibleRawOutput.value.slice(0, MAX_LEN)}\n\n... (截断)`
    : ansibleRawOutput.value
})

const rawOutputLines = computed(() => {
  const content = truncatedAnsibleRawOutput.value
  if (!content) return []
  return content.split('\n').map((line, index) => {
    const trimmed = line.trimStart()
    return {
      id: index,
      text: trimmed,
      indent: line.length - trimmed.length
    }
  })
})

const restDetail = computed(() => buildRestDetail(result.value))
const downloadUrl = computed(() =>
  props.runId ? `/sjxy-console/workflow/api/workflow/runlogs/ansible/${props.runId}` : ''
)
const visibleTabs = computed(() => {
  const tabs = [{ name: 'overview', label: '概要' }]
  if (isProcessJob.value) {
    tabs.push({ name: 'process', label: '流程图' })
  }
  if (isAnsibleJob.value) {
    tabs.push(
      { name: 'hosts', label: '按主机查看' },
      { name: 'list', label: '按列表查看' },
      { name: 'raw', label: '原始输出' },
      { name: 'output', label: 'Output' }
    )
  }
  if (isRestJob.value) {
    tabs.push({ name: 'rest', label: 'API 输出' })
  }
  return tabs
})

watch(
  () => [props.visible, props.runId],
  ([visible, runId]) => {
    if (visible && runId) {
      activeTab.value = 'overview'
      hasObservedActiveRun.value = false
      fetchResult()
      return
    }

    stopResultPolling()
  },
  { immediate: true }
)

watch(
  () => props.visible,
  visible => {
    if (!visible) {
      stopResultPolling()
      resetState()
    }
  }
)

watch(visibleTabs, tabs => {
  if (!tabs.length) return
  const exists = tabs.some(tab => tab.name === activeTab.value)
  if (!exists) {
    activeTab.value = tabs[0].name
  }
})

watch(hostFilterText, () => {
  nextTick(applyHostFilter)
})

watch(
  () => ansibleTreeData.value,
  () => {
    nextTick(applyHostFilter)
  }
)

watch(treeRenderKey, () => {
  nextTick(applyHostFilter)
})

watch(
  () => ansibleContents.value,
  () => {
    resetHostSelection()
    hostFilterText.value = ''
    hostTaskSearch.value = ''
    selectedPlayFilter.value = ''
    selectedHostFilter.value = ''
    listKeyword.value = ''
    listCurrentPage.value = 1
    showFullRawOutput.value = false
  }
)

watch(
  () => listPlayOptions.value,
  options => {
    if (!options.length) {
      selectedPlayFilter.value = ''
      return
    }
    if (options.length === 1) {
      selectedPlayFilter.value = options[0]
      return
    }
    if (!options.includes(selectedPlayFilter.value)) {
      selectedPlayFilter.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => listHostOptions.value,
  options => {
    if (!options.length) {
      selectedHostFilter.value = ''
      return
    }
    if (!options.includes(selectedHostFilter.value)) {
      selectedHostFilter.value = ''
    }
  },
  { immediate: true }
)

function handleClose() {
  const status = normalizeRunStatus(result.value?.status)
  stopResultPolling()
  emit('close', {
    runId: props.runId,
    status,
    succeeded: isSuccessfulRunStatus(status)
  })
  dialogVisible.value = false
  resetState()
}

function resetState() {
  activeTab.value = 'overview'
  result.value = null
  executionChannelInfo.value = {}
  executionChannelRequestSequence += 1
  hasObservedActiveRun.value = false
  hostFilterText.value = ''
  hostTaskSearch.value = ''
  mergeBatches.value = true
  treeRenderKey.value += 1
  treeExpandAll.value = true
  selectedHost.value = null
  hostStatusFilter.value = ''
  selectedPlayFilter.value = ''
  selectedHostFilter.value = ''
  listKeyword.value = ''
  listCurrentPage.value = 1
  showFullRawOutput.value = false
}

async function fetchResult() {
  if (!props.runId) return
  loading.value = true
  try {
    const response = await jaoApi.getExecuteResult(props.runId)
    result.value = response?.data ?? response ?? null
    void refreshExecutionChannelInfo(result.value)
    syncResultPolling(result.value)
  } catch (error) {
    stopResultPolling()
    ElMessage.error(error?.message || '获取执行结果失败')
  } finally {
    loading.value = false
  }
}

function syncResultPolling(data) {
  const status = normalizeRunStatus(data?.status)
  if (isActiveRunStatus(status)) {
    hasObservedActiveRun.value = true
    scheduleResultPolling()
    return
  }

  stopResultPolling()
  if (hasObservedActiveRun.value && props.runId) {
    emit('settled', {
      runId: props.runId,
      status
    })
    hasObservedActiveRun.value = false
  }
}

function scheduleResultPolling(delay = 3000) {
  stopResultPolling()
  pollTimer.value = window.setTimeout(() => {
    pollTimer.value = undefined
    void fetchResult()
  }, delay)
}

function stopResultPolling() {
  if (pollTimer.value) {
    clearTimeout(pollTimer.value)
    pollTimer.value = undefined
  }
}

const KNOWN_MSG_MAP = {
  'app_secops.log.exec_script_fail': '脚本执行失败',
  'app_secops.log.exec_install_fail': '安装/升级任务执行失败',
  'app_secops.log.exec_scan_fail': '漏洞/补丁扫描失败',
  'app_secops.log.exec_rollback_fail': '补丁回滚任务失败',
  'acm.common.log.conn_failed': '主机连通性检测失败',
  'acm.common.log.collect_failed': '资产采集失败'
}

function translateAgentErrorText(value) {
  const text = String(value || '').trim()
  if (!text) return text
  const matchedCode = Object.keys(AGENT_ERROR_MESSAGES).find(code => text.includes(code))
  if (!matchedCode) return text
  const translated = AGENT_ERROR_MESSAGES[matchedCode]
  return text === matchedCode ? translated : `${translated}（${text}）`
}

function isIgnorableDebugMsg(msgStr) {
  if (!msgStr || typeof msgStr !== 'string') return true
  const s = msgStr.trim()
  if (!s) return true
  if (s.startsWith('export_data_file_name is')) return true
  if (s.startsWith('secops_func is')) return true
  if (s.startsWith('full_pkgs:')) return true
  if (s.startsWith('target_nvr_pkgs=')) return true
  if (s.startsWith('latest_only_pkgs=')) return true
  return false
}

function parseJsonDeep(input) {
  let curr = input
  for (let i = 0; i < 3; i++) {
    if (typeof curr === 'string') {
      const trimmed = curr.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          curr = JSON.parse(trimmed)
        } catch {
          break
        }
      } else {
        break
      }
    } else {
      break
    }
  }
  return curr
}

function extractMsgsFromMsgInfo(msgInfo) {
  const extractedMsgs = []
  if (!msgInfo) return extractedMsgs

  const infoObj = parseJsonDeep(msgInfo)

  if (typeof infoObj === 'object' && infoObj !== null) {
    const plays = Array.isArray(infoObj?.plays) ? infoObj.plays : []
    plays.forEach(play => {
      const tasks = Array.isArray(play?.tasks) ? play.tasks : []
      tasks.forEach(task => {
        const hosts = Array.isArray(task?.hosts) ? task.hosts : []
        hosts.forEach(h => {
          const msgVal = h.msg || h.message || h.stderr || h.stdout
          if (typeof msgVal === 'string' && msgVal.trim()) {
            if (!isIgnorableDebugMsg(msgVal)) {
              const hostKey = h.hostKey || h.host || h.name
              const hostPrefix = hostKey ? `[${hostKey}] ` : ''
              const formatted = `${hostPrefix}${msgVal.trim()}`
              if (!extractedMsgs.includes(formatted)) {
                extractedMsgs.push(formatted)
              }
            }
          }
        })
      })
    })
  }

  if (extractedMsgs.length === 0 && typeof msgInfo === 'string') {
    const msgRegex = /"msg"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    let match
    while ((match = msgRegex.exec(msgInfo)) !== null) {
      try {
        const unescaped = JSON.parse(`"${match[1]}"`)
        if (typeof unescaped === 'string' && !isIgnorableDebugMsg(unescaped)) {
          if (!extractedMsgs.includes(unescaped)) {
            extractedMsgs.push(unescaped)
          }
        }
      } catch {
        if (!isIgnorableDebugMsg(match[1])) {
          extractedMsgs.push(match[1])
        }
      }
    }
  }

  return extractedMsgs
}

function extractMsgsFromAnsibleContents(contents) {
  const msgs = []
  if (!Array.isArray(contents)) return msgs

  contents.forEach(content => {
    const plays = Array.isArray(content?.plays) ? content.plays : []
    plays.forEach(play => {
      const tasks = Array.isArray(play?.tasks) ? play.tasks : []
      tasks.forEach(task => {
        const hosts = Array.isArray(task?.hosts) ? task.hosts : []
        hosts.forEach(h => {
          // 必须包含失败/不可达/非零退出码标示才判定为错误节点
          const isFailedHost = h.failed || h.unreachable || (h.rc !== undefined && h.rc !== 0 && h.rc !== 0.0)
          if (isFailedHost) {
            const msgVal = h.msg || h.message || h.stderr || h.stdout
            if (typeof msgVal === 'string' && msgVal.trim()) {
              if (!isIgnorableDebugMsg(msgVal)) {
                const hostKey = h.hostKey || h.host || h.name
                const hostPrefix = hostKey ? `[${hostKey}] ` : ''
                const formatted = `${hostPrefix}${msgVal.trim()}`
                if (!msgs.includes(formatted)) {
                  msgs.push(formatted)
                }
              }
            }
          }
        })
      })
    })
  })

  return msgs
}

function parseJobExecutionError(errorRaw, ansibleContents = [], jobStatus = '') {
  const isStatusFailed = ['FAILED', 'ERROR'].includes(String(jobStatus).toUpperCase())

  if (!errorRaw && (!ansibleContents || !ansibleContents.length)) {
    return { title: '', list: [], details: '' }
  }

  // 状态成功且没有后端显式错误文本时，不展示错误
  if (!isStatusFailed && !errorRaw) {
    return { title: '', list: [], details: '' }
  }

  const lines = String(errorRaw || '').split('\n').map(l => l.trim()).filter(Boolean)
  let failedTaskCount = null
  const messagesList = []
  let isJsonFormatted = false

  lines.forEach(line => {
    let obj = null
    try {
      obj = JSON.parse(line)
    } catch {
      const msgIdMatch = /"msg_id"\s*:\s*"([^"]+)"/.exec(line)
      if (msgIdMatch) {
        obj = { msg_id: msgIdMatch[1] }
      }
    }

    if (obj) {
      isJsonFormatted = true

      if (obj.FailedTask !== undefined) {
        failedTaskCount = obj.FailedTask
        return
      }

      if (obj.msg_id) {
        const msgId = obj.msg_id
        let translated = KNOWN_MSG_MAP[msgId]
        if (!translated) {
          const i18nVal = translateText(`#{${msgId}}`)
          translated = i18nVal && i18nVal !== msgId && !i18nVal.includes('#{') ? i18nVal : msgId
        }

        if (translated && !messagesList.includes(translated)) {
          messagesList.push(translated)
        }

        if (obj.msg_info) {
          const msgs = extractMsgsFromMsgInfo(obj.msg_info)
          msgs.forEach(m => {
            if (!messagesList.includes(m)) {
              messagesList.push(m)
            }
          })
        }
      } else if (obj.message || obj.error || obj.msg) {
        const msg = obj.message || obj.error || obj.msg
        if (typeof msg === 'string' && !isIgnorableDebugMsg(msg) && !messagesList.includes(msg)) {
          messagesList.push(msg)
        }
      }
    }
  })

  // 只有当真正的失败节点存在时，才提取 ansibleContents 中的 msg
  const ansibleMsgs = extractMsgsFromAnsibleContents(ansibleContents)
  ansibleMsgs.forEach(m => {
    if (!messagesList.includes(m)) {
      messagesList.push(m)
    }
  })

  // 如果作业状态成功，且没有提取到真正失败节点的报错，不展示错误框
  if (!isStatusFailed && messagesList.length === 0) {
    return { title: '', list: [], details: '' }
  }

  if (isJsonFormatted || ansibleMsgs.length > 0 || isStatusFailed) {
    let title = '作业执行失败'
    if (failedTaskCount !== null) {
      title += `（${failedTaskCount} 个任务失败）`
    }

    if (messagesList.length === 0 && isStatusFailed) {
      messagesList.push('检测到运行异常，但未提取到具体报错消息')
    }

    return {
      title,
      list: messagesList.map(translateAgentErrorText),
      details: ''
    }
  }

  const [firstLine = '', ...rest] = lines
  return {
    title: translateAgentErrorText(firstLine) || '执行报错',
    list: [],
    details: rest.join('\n')
  }
}

const AGENT_CONNECTION_TYPES = ['koreops_agent', 'agent', 'oplus_agent']

function normalizeConnectionType(value) {
  const connectionType = String(value || '').toLowerCase()
  if (AGENT_CONNECTION_TYPES.includes(connectionType)) return 'koreops_agent'
  if (connectionType === 'ssh') return 'ssh'
  if (connectionType === 'mixed') return 'mixed'
  return ''
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function joinDisplayValues(value) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  return [...new Set(
    values
      .flatMap(item => String(item).split(','))
      .map(item => item.trim())
      .filter(Boolean)
  )].join(', ')
}

function getDirectExecutionChannelInfo(data) {
  const detail = data?.detail || {}
  return {
    connectionType: normalizeConnectionType(firstDefined(
      data?.executionChannel,
      data?.execution_channel,
      data?.connectionType,
      data?.connection_type,
      detail.executionChannel,
      detail.execution_channel,
      detail.connectionType,
      detail.connection_type
    )),
    agentClientId: joinDisplayValues(firstDefined(
      data?.agentClientId,
      data?.agent_client_id,
      detail.agentClientId,
      detail.agent_client_id
    )),
    agentVersion: joinDisplayValues(firstDefined(
      data?.agentVersion,
      data?.agent_version,
      detail.agentVersion,
      detail.agent_version
    )),
    relayTraceId: joinDisplayValues(firstDefined(
      data?.relayTraceId,
      data?.relay_trace_id,
      data?.traceId,
      data?.trace_id,
      detail.relayTraceId,
      detail.relay_trace_id,
      detail.traceId,
      detail.trace_id
    )),
    dispatchStatus: joinDisplayValues(firstDefined(
      data?.dispatchStatus,
      data?.dispatch_status,
      detail.dispatchStatus,
      detail.dispatch_status
    ))
  }
}

function extractResultHostIds(data) {
  const detail = data?.detail || {}
  const params = data?.params || detail.params || {}
  const ids = []
  const append = value => {
    if (Array.isArray(value)) {
      value.forEach(append)
      return
    }
    if (value && typeof value === 'object') {
      const id = value.hostId || value.host_id || value.id || value.key
      if (id) ids.push(String(id))
      return
    }
    if (value !== undefined && value !== null && value !== '') {
      String(value)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .forEach(id => ids.push(id))
    }
  }

  ;[
    data?.hostIds,
    data?.host_ids,
    data?.targetHostIds,
    data?.target_host_ids,
    detail.hostIds,
    detail.host_ids,
    detail.targetHostIds,
    detail.target_host_ids,
    params.hostIds,
    params.host_ids
  ].forEach(append)

  return [...new Set(ids)]
}

async function refreshExecutionChannelInfo(data) {
  const sequence = ++executionChannelRequestSequence
  const directInfo = getDirectExecutionChannelInfo(data)
  executionChannelInfo.value = directInfo
  const hostIds = extractResultHostIds(data)
  if (hostIds.length === 0) return

  try {
    const infos = []
    for (let index = 0; index < hostIds.length; index += 100) {
      const response = await agentApi.getHostAgentInfo(hostIds.slice(index, index + 100))
      if (Array.isArray(response)) infos.push(...response)
    }
    if (sequence !== executionChannelRequestSequence || infos.length === 0) return
    const returnedHostIds = new Set(infos.map(info => String(info?.hostId || '')).filter(Boolean))
    if (returnedHostIds.size !== hostIds.length) return

    const channels = [...new Set(
      infos.map(info => normalizeConnectionType(info?.connectionType)).filter(Boolean)
    )]
    executionChannelInfo.value = {
      ...directInfo,
      connectionType: channels.length > 1 ? 'mixed' : channels[0] || directInfo.connectionType,
      agentClientId: joinDisplayValues(
        infos.map(info => info?.agentClientId || info?.clientId).filter(Boolean)
      ) || directInfo.agentClientId,
      agentVersion: joinDisplayValues(
        infos.map(info => info?.agentVersion).filter(Boolean)
      ) || directInfo.agentVersion,
      dispatchStatus: directInfo.dispatchStatus
    }
  } catch (error) {
    if (sequence === executionChannelRequestSequence) {
      console.warn('获取任务目标的 Agent 通道信息失败:', error)
    }
  }
}

const summary = computed(() => {
  const data = result.value || {}
  const start = data.startTime || data.start_time
  const end = data.endTime || data.end_time
  const status = data.status || ''
  const parsedError = parseJobExecutionError(data.error || '', ansibleContents.value, status)
  const connectionType = executionChannelInfo.value.connectionType || ''
  const isAgentConnection = connectionType === 'koreops_agent'
  return {
    status,
    statusLabel: JOB_STATUS_LABELS[status] || status || '-',
    duration: formatDuration(start, end),
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    username: data.username || '-',
    runId: data.runId || data.id || props.runId || '-',
    connectionType,
    isAgentConnection,
    connectionTypeLabel: connectionType === 'mixed'
      ? '混合通道（Agent / SSH）'
      : isAgentConnection
        ? 'Agent (koreops_agent)'
        : connectionType === 'ssh'
          ? 'SSH'
          : '未知',
    agentClientId: executionChannelInfo.value.agentClientId || '',
    agentVersion: executionChannelInfo.value.agentVersion || '',
    relayTraceId: executionChannelInfo.value.relayTraceId || '',
    dispatchStatus: executionChannelInfo.value.dispatchStatus || '',
    errorTitle: parsedError.title,
    errorList: parsedError.list,
    errorDetails: parsedError.details
  }
})

const statusClass = computed(() => {
  const status = summary.value.status?.toLowerCase?.()
  return status ? `status-${status}` : 'status-default'
})

const batches = computed(() => {
  const batchList = result.value?.detail?.batches
  if (!Array.isArray(batchList)) return []
  return batchList.map(batch => ({
    ...batch,
    steps: formatBatchSteps(batch.steps)
  }))
})

function statusLabel(status) {
  return JOB_STATUS_LABELS[status] || status || '-'
}

function statusTagType(status) {
  return JOB_STATUS_TAG_TYPES[status] || 'info'
}

function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status || TASK_STATUS_LABELS.unknown
}

function taskStatusTag(status) {
  return TASK_STATUS_TAGS[status] || 'info'
}

async function openDownload() {
  if (!downloadUrl.value) return
  try {
    const authHeaders = authService.getAuthHeaders()
    const response = await fetch(downloadUrl.value, {
      method: 'GET',
      headers: authHeaders
    })

    if (!response.ok) throw new Error('下载失败')

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `ansible-output-${props.runId || Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)

    ElMessage.success('下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

function handleHostAction(command) {
  switch (command) {
    case 'export':
      exportHostView()
      break
    case 'merge':
      toggleMergeMode()
      break
    case 'expand':
      toggleTreeExpand()
      break
    default:
      break
  }
}

function exportHostView() {
  if (!ansibleRawOutput.value) {
    ElMessage.warning('暂无可导出的数据')
    return
  }
  const blob = new Blob([ansibleRawOutput.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ansible-output-${props.runId || Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function toggleMergeMode() {
  mergeBatches.value = !mergeBatches.value
  treeExpandAll.value = true
  treeRenderKey.value += 1
  resetHostSelection()
}

function toggleTreeExpand() {
  treeExpandAll.value = !treeExpandAll.value
  treeRenderKey.value += 1
}

function applyHostFilter() {
  let tree = hostTreeRef.value
  if (Array.isArray(tree)) {
    tree = tree[0]
  }
  if (!tree) return
  tree.filter(hostFilterText.value.trim())
}

function filterHostNode(value, data) {
  if (!value) return true
  const keyword = value.toLowerCase()
  return String(data.label || '')
    .toLowerCase()
    .includes(keyword)
}

function handleTreeNodeClick(data) {
  if (data.type !== 'host') {
    return
  }
  selectedHost.value = data.host
  hostStatusFilter.value = ''
  hostTaskSearch.value = ''
}

function toggleHostStatus(status) {
  hostStatusFilter.value = hostStatusFilter.value === status ? '' : status
}

function resetHostSelection() {
  selectedHost.value = null
  hostStatusFilter.value = ''
  hostTaskSearch.value = ''
}

function formatBatchSteps(stepsObj) {
  if (!stepsObj || typeof stepsObj !== 'object') return []
  return Object.entries(stepsObj).map(([name, step]) => ({
    name,
    status: step?.status || '',
    message: parseStepMessage(step?.message)
  }))
}

function parseStepMessage(message) {
  if (!message) return '-'
  try {
    const parsed = JSON.parse(message)
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(' | ')
    }
    return String(parsed)
  } catch {
    return String(message)
  }
}



function formatDuration(start, end) {
  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null
  if (
    !startDate ||
    !endDate ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return '-'
  }
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime())
  const totalSeconds = Math.round(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = num => String(num).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}

function normalizeJobType(value) {
  return (value || '').toString().trim().toLowerCase()
}

function parseProcessModel(data) {
  if (!data?.configJson) return null
  const parsed = safeJsonParse(data.configJson, null)
  return parsed?.processModel ?? null
}

function buildAnsibleArtifacts(data, enabled) {
  if (!enabled || !data) {
    return { contents: [], raw: '' }
  }
  const batches = Array.isArray(data.data) ? data.data : []
  const contents = []
  batches.forEach(batch => {
    const output = batch?.output
    if (!output) return
    const parsed = safeJsonParse(output, null)
    if (parsed) {
      if (typeof parsed === 'object' && parsed !== null) {
        parsed._executorUrl = batch?.executorUrl ?? batch?.executor_url ?? ''
      }
      contents.push(parsed)
    }
  })
  return {
    contents,
    raw: contents.length ? JSON.stringify(contents, null, 2) : ''
  }
}

function summarizeHostRows(contents) {
  const rows = []
  let counter = 0
  contents.forEach((content, contentIndex) => {
    const executorUrl = content?._executorUrl ?? ''
    const plays = Array.isArray(content?.plays) ? content.plays : []
    plays.forEach((play, playIndex) => {
      const playName = play?.play?.name || play?.name || `Play ${contentIndex + 1}-${playIndex + 1}`
      const tasks = Array.isArray(play?.tasks) ? play.tasks : []
      tasks.forEach(task => {
        const taskName = task?.task?.name || '未命名任务'
        const hosts = Array.isArray(task?.hosts) ? task.hosts : []
        hosts.forEach((host, hostIndex) => {
          const hostKey = host?.hostKey ?? host?.host ?? host?.name ?? `host-${hostIndex}`
          const parsedHost = parseHostKey(hostKey)
          rows.push({
            id: `row-${counter++}`,
            host: parsedHost.targetHost || parsedHost.delegateHost || hostKey,
            delegateHost: parsedHost.delegateHost,
            executorUrl: executorUrl || '',
            play: playName,
            task: taskName,
            status: detectHostStatus(host),
            output: formatHostOutput(host)
          })
        })
      })
    })
  })
  return rows.slice(0, 500)
}

function buildHostTree(contents, { mergeBatches }) {
  const tree = []
  let groupIndex = 0
  let hostAutoId = 0

  const addGroup = (label, plays) => {
    const groupId = `group-${groupIndex++}`
    const groupNode = { id: groupId, label, type: 'group', children: [] }
    plays.forEach((play, playIndex) => {
      const playId = `${groupId}-play-${playIndex}`
      const playNode = {
        id: playId,
        label: play.title,
        type: 'play',
        hostCount: play.hosts.length,
        children: []
      }
      play.hosts.forEach(host => {
        const hostId = `${playId}-host-${hostAutoId++}`
        const hostNode = {
          id: hostId,
          label: host.title,
          type: 'host',
          status: host.status,
          host: { ...host, id: hostId }
        }
        playNode.children.push(hostNode)
      })
      if (playNode.children.length) {
        groupNode.children.push(playNode)
      }
    })
    if (groupNode.children.length) {
      tree.push(groupNode)
    }
  }

  if (mergeBatches) {
    const mergedPlays = []
    contents.forEach(content => {
      mergedPlays.push(...extractPlays(content, { batchTitle: 'Playbook' }))
    })
    if (mergedPlays.length) {
      addGroup('Playbook', mergedPlays)
    }
  } else {
    contents.forEach((content, index) => {
      const batchTitle = `Playbook ${index + 1}`
      const plays = extractPlays(content, { batchTitle })
      if (plays.length) {
        addGroup(batchTitle, plays)
      }
    })
  }

  return { tree }
}

function extractPlays(content, meta = {}) {
  const plays = Array.isArray(content?.plays) ? content.plays : []
  return plays.map((play, playIndex) => {
    const title = play?.play?.name || play?.name || `Play ${playIndex + 1}`
    return {
      title,
      batchTitle: meta.batchTitle || 'Playbook',
      hosts: collectHostsFromPlay(play, {
        playTitle: title,
        batchTitle: meta.batchTitle || 'Playbook'
      })
    }
  })
}

function collectHostsFromPlay(play, meta) {
  const hostMap = new Map()
  const tasks = Array.isArray(play?.tasks) ? play.tasks : []
  tasks.forEach((task, taskIndex) => {
    const taskName = task?.task?.name || `任务 ${taskIndex + 1}`
    const hosts = Array.isArray(task?.hosts) ? task.hosts : []
    hosts.forEach((host, hostIndex) => {
      const hostKey = host?.hostKey ?? host?.host ?? host?.name ?? `host-${taskIndex}-${hostIndex}`
      const parsedHost = parseHostKey(hostKey)
      const mapKey = parsedHost.targetHost || parsedHost.delegateHost || hostKey
      let hostEntry = hostMap.get(mapKey)
      if (!hostEntry) {
        hostEntry = {
          title: mapKey,
          delegateHost: parsedHost.delegateHost,
          playTitle: meta.playTitle,
          batchTitle: meta.batchTitle,
          status: detectHostStatus(host),
          tasks: []
        }
        hostMap.set(mapKey, hostEntry)
      }
      const taskStatus = detectHostStatus(host)
      hostEntry.tasks.push({
        id: `${mapKey}-task-${hostEntry.tasks.length}`,
        name: taskName,
        status: taskStatus,
        output: formatHostOutput(host),
        delegateHost: parsedHost.delegateHost
      })
      hostEntry.status = pickDominantStatus(hostEntry.status, taskStatus)
    })
  })
  return Array.from(hostMap.values())
}

function pickDominantStatus(current, nextStatus) {
  if (!current) return nextStatus || 'unknown'
  if (!nextStatus) return current
  return statusPriority(nextStatus) < statusPriority(current) ? nextStatus : current
}

function statusPriority(status) {
  const idx = HOST_STATUS_PRIORITY.indexOf(status)
  return idx === -1 ? HOST_STATUS_PRIORITY.length : idx
}

function computeStatusStats(tasks) {
  return tasks.reduce((acc, task) => {
    const key = task.status || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function buildStatusChips(stats) {
  const chips = []
  HOST_STATUS_PRIORITY.forEach(status => {
    if (stats[status]) {
      chips.push({ status, count: stats[status] })
    }
  })
  Object.entries(stats).forEach(([status, count]) => {
    if (!HOST_STATUS_PRIORITY.includes(status)) {
      chips.push({ status, count })
    }
  })
  return chips
}

function filterHostTasks(host, statusFilter, keyword) {
  if (!host) return []
  const term = keyword.trim().toLowerCase()
  return host.tasks.filter(task => {
    const statusMatch = !statusFilter || task.status === statusFilter
    if (!statusMatch) return false
    if (!term) return true
    const output = task.output ? task.output.toLowerCase() : ''
    const taskName = task.name ? task.name.toLowerCase() : ''
    return taskName.includes(term) || output.includes(term)
  })
}

function buildListPlayOptions(rows) {
  const set = new Set()
  rows.forEach(row => {
    if (row.play) {
      set.add(row.play)
    }
  })
  return Array.from(set)
}

function buildListHostOptions(rows) {
  const set = new Set()
  rows.forEach(row => {
    if (row.host) {
      set.add(row.host)
    }
  })
  return Array.from(set)
}

function filterListRows(rows, filters) {
  const { play = '', host = '', keyword = '' } = filters || {}
  const term = keyword.trim().toLowerCase()
  return rows.filter(row => {
    if (play && row.play !== play) return false
    if (host && row.host !== host) return false
    if (!term) return true
    const output = row.output ? row.output.toLowerCase() : ''
    const task = row.task ? row.task.toLowerCase() : ''
    const rowHost = row.host ? row.host.toLowerCase() : ''
    const delegate = row.delegateHost ? row.delegateHost.toLowerCase() : ''
    const executorUrl = row.executorUrl ? row.executorUrl.toLowerCase() : ''
    return (
      output.includes(term) ||
      task.includes(term) ||
      rowHost.includes(term) ||
      delegate.includes(term) ||
      executorUrl.includes(term)
    )
  })
}

function detectHostStatus(host) {
  if (!host || typeof host !== 'object') return 'unknown'
  if (host.unreachable) return 'unreachable'
  if (host.failed) return 'failed'
  if (host.changed) return 'changed'
  if (host.ok) return 'ok'
  if (host.ignored) return 'ignored'
  if (host.skipped || host.skipping) return 'skipped'
  return host.running ? 'running' : 'unknown'
}

function parseHostKey(hostKey) {
  if (!hostKey) return { targetHost: '', delegateHost: '' }
  const matches = /([^\s]+)(?:\s*->\s*(.+))?/.exec(hostKey)
  return {
    targetHost: matches?.[1] ?? hostKey,
    delegateHost: matches?.[2] ?? ''
  }
}

function formatHostOutput(host) {
  const value = host?.stdout ?? host?.stderr ?? host?.msg ?? host?.output
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function buildRestDetail(data) {
  if (!data) {
    return { statusCode: '-', contentType: '-', payload: '-', error: '' }
  }
  return {
    statusCode: data.detail?.statusCode ?? data.detail?.status ?? '-',
    contentType: data.detail?.contentType ?? data.detail?.headers?.['Content-Type'] ?? '-',
    payload: formatJsonPayload(data.data ?? data.detail?.payload ?? {}),
    error: data.error ?? ''
  }
}

function formatJsonPayload(value) {
  if (value == null || value === '') return '空'
  if (typeof value === 'string') {
    const parsed = safeJsonParse(value, null)
    return parsed ? JSON.stringify(parsed, null, 2) : value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function safeJsonParse(input, fallback = {}) {
  if (!input) return fallback
  try {
    return typeof input === 'string' ? JSON.parse(input) : input
  } catch {
    return fallback
  }
}

onBeforeUnmount(() => {
  stopResultPolling()
})
</script>

<style scoped>
.result-dialog {
  --result-text-secondary: var(--el-text-color-secondary);
  --result-text-placeholder: var(--el-text-color-placeholder);
  --result-surface-soft: var(--el-fill-color-light);
  --result-danger-bg: var(--el-color-danger-light-9);
  --result-danger-border: var(--el-color-danger-light-5);
  --result-danger-text: var(--el-color-danger);
  --result-success-bg: var(--el-color-success-light-9);
  --result-success-border: var(--el-color-success-light-5);
  --result-success-text: var(--el-color-success);
  --result-primary-bg: var(--el-color-primary-light-9);
  --result-primary-border: var(--el-color-primary-light-5);
  --result-primary-text: var(--el-color-primary);
  --result-neutral-bg: var(--el-fill-color-light);
  --result-neutral-border: var(--el-border-color-light);
  --result-neutral-text: var(--el-text-color-secondary);
  --result-neutral-strong: var(--el-text-color-regular);
  min-height: 360px;
}

:deep(.el-tabs__header) {
  margin-bottom: 8px !important;
}

:deep(.el-tabs__content) {
  padding-top: 4px !important;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-bottom: 16px;
}

.overview-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 14px;
  border-radius: 999px;
  font-weight: 600;
  border: 1px solid transparent;
}

.status-duration {
  font-size: 22px;
  font-weight: 600;
}

.status-range {
  font-size: 14px;
  color: var(--result-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-sep {
  color: var(--result-text-placeholder);
}

.status-failed {
  background: var(--result-danger-bg);
  border-color: var(--result-danger-border);
  color: var(--result-danger-text);
}

.status-success {
  background: var(--result-success-bg);
  border-color: var(--result-success-border);
  color: var(--result-success-text);
}

.status-waiting {
  background: var(--result-neutral-bg);
  border-color: var(--result-neutral-border);
  color: var(--result-neutral-text);
}

.status-default {
  background: var(--result-neutral-bg);
  border-color: var(--result-neutral-border);
  color: var(--result-neutral-strong);
}

.overview-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-label {
  font-size: 14px;
  color: var(--result-text-secondary);
}

.meta-value {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.result-error {
  border: 1px solid var(--result-danger-border);
  background: var(--result-danger-bg);
  border-radius: 8px;
  padding: 14px 16px;
  margin-top: 16px;
  margin-bottom: 16px;
}

.error-title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  color: var(--result-danger-text);
  font-size: 15px;
}

.error-title {
  margin: 0;
  color: var(--result-danger-text);
  font-weight: 600;
  font-size: 14px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--result-danger-text);
  font-size: 13px;
  line-height: 1.5;
}

.error-bullet {
  font-weight: bold;
}

.error-text {
  word-break: break-all;
}

.error-details {
  margin: 8px 0 0;
  font-family: Consolas, 'SFMono-Regular', Menlo, Monaco, monospace;
  font-size: 13px;
  color: var(--result-danger-text);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.result-section {
  margin-top: 24px;
}

.section-header {
  font-weight: 600;
  margin-bottom: 12px;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.batch-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px 16px;
  background: var(--el-bg-color);
}

.batch-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.batch-name {
  font-weight: 600;
  margin-right: 12px;
}

.batch-status {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--result-neutral-bg);
  color: var(--result-neutral-text);
}

.batch-status.is-failed {
  background: var(--result-danger-bg);
  color: var(--result-danger-text);
}

.batch-card__header .batch-meta {
  font-size: 14px;
  color: var(--result-text-secondary);
}

.batch-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-step__title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.batch-step__message {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  white-space: pre-line;
}

.tab-placeholder {
  padding: 48px 0;
  text-align: center;
  color: var(--result-text-placeholder);
}

.process-tab {
  display: flex;
  flex-direction: column;
}

.process-scroll {
}

.process-json {
  margin: 0;
  font-family: Consolas, 'SFMono-Regular', Menlo, Monaco, monospace;
  font-size: 14px;
  background: #1e1e1e;
  color: #f2f2f2;
  padding: 12px;
  border-radius: 6px;
}

.hosts-pane {
  display: flex;
  gap: 16px;
  height: calc(100vh - 260px);
}

.hosts-tree-panel {
  width: 280px;
  padding-right: 12px;
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tree-scroll {
  flex: 1;
  min-height: 0;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 4px;
}

.tree-node__label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tree-node__meta {
  font-size: 14px;
  color: var(--result-text-secondary);
}

.dropdown-check {
  margin-left: 8px;
}

.hosts-detail-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.host-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.host-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.host-detail-title h4 {
  margin: 0;
}

.delegate-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  font-size: 14px;
  border-radius: 4px;
  background: var(--result-surface-soft);
  color: var(--result-neutral-strong);
}

.host-detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--result-text-secondary);
}

.host-task-search {
  width: 220px;
}

.host-status-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.host-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--el-border-color-light);
  color: var(--result-neutral-strong);
  font-size: 14px;
  cursor: pointer;
}

.host-status-chip.active {
  background: var(--result-primary-bg);
  border-color: var(--result-primary-border);
  color: var(--result-primary-text);
}

.chip-count {
  font-weight: 600;
}

.host-task-list {
  flex: 1;
  min-height: 0;
}

.host-task-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-bg-color);
}

.host-task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 16px;
}

.host-task-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.host-task-card__title .task-name {
  word-break: break-all;
  overflow-wrap: break-word;
}

.host-task-card__output {
  margin: 0;
  font-size: 14px;
  background: #1e1e1e;
  color: #f2f2f2;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: break-word;
}

.hosts-detail-panel :deep(.el-empty) {
  margin: auto;
}

.list-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-view .ops-filter-bar {
  margin-bottom: 0;
}

.list-view :deep(.el-form) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.list-view :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

.list-view :deep(.el-form-item__label) {
  font-size: 14px;
  padding-right: 8px;
}

.result-table :deep(.el-table__body-wrapper) {
}

.raw-output {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.raw-toolbar {
  display: flex;
  justify-content: flex-end;
}

.raw-scroll {
}

.raw-code-container {
  font-family: Consolas, 'SFMono-Regular', Menlo, Monaco, monospace;
  font-size: 14px;
  line-height: 1.6;
}

.raw-code-line {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-tab {
  height: calc(100vh - 260px);
}

.rest-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rest-meta {
  display: flex;
  gap: 24px;
}

.rest-meta__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rest-meta__label {
  font-size: 14px;
  color: var(--result-text-secondary);
}

.rest-error {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: var(--result-danger-bg);
  color: var(--result-danger-text);
  border: 1px solid var(--result-danger-border);
}

.rest-payload {
  background: #1e1e1e;
  border-radius: 6px;
}

.rest-payload pre {
  margin: 0;
  color: #f2f2f2;
}

.mr-1 {
  margin-right: 4px;
}


</style>

<style>
.execute-result-dialog-wrapper .el-dialog__body {
  max-height: calc(100vh - 140px) !important;
  overflow-y: hidden !important;
}
</style>
