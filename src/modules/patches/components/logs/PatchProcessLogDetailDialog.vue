<template>
  <el-dialog
    v-model="visible"
    title="流程操作详情"
    width="1000px"
    :close-on-click-modal="false"
    destroy-on-close
    class="process-log-dialog"
    @open="load"
    @closed="handleClosed"
  >
    <div v-loading="loading" class="process-detail">
      <template v-if="detailTask">
        <div class="ops-stepper process-detail__stepper">
          <template v-for="(step, index) in wizardSteps" :key="step.key">
            <div
              class="stepper-item stepper-item--clickable"
              :class="getStepperClasses(step.key, index)"
              @click="currentStep = index"
            >
              <div class="stepper-icon">
                <i v-if="getWizardStepState(step.key) === 'failed'" class="fa fa-times" />
                <i v-else-if="getWizardStepState(step.key) === 'success'" class="fa fa-check" />
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="stepper-title">{{ step.title }}</div>
            </div>
            <div
              v-if="index < wizardSteps.length - 1"
              class="stepper-line"
              :class="{ 'is-active': getWizardStepState(step.key) === 'success' }"
            />
          </template>
        </div>

        <div v-show="currentStepKey === 'select'" class="install-content">
          <div class="install-card">
            <div class="card-header">
              <i class="fa fa-lock" />
              {{ operationConfig.selectionTitle }}
            </div>
            <div class="card-body card-body--scroll">
              <div v-if="selectionItems.length === 0" class="no-data">暂无数据</div>
              <div v-for="item in selectionItems" :key="item.key" class="selection-item">
                <div class="selection-item__primary">{{ item.primary }}</div>
                <div v-if="item.secondary" class="selection-item__secondary">
                  {{ item.secondary }}
                </div>
              </div>
            </div>
          </div>

          <div class="install-card">
            <div class="card-header">
              <i class="fa fa-cube" />
              {{ operationConfig.packageCardTitle }}
            </div>
            <div class="card-body card-body--scroll">
              <div v-for="packageName in affectedPackages" :key="packageName" class="package-item">
                {{ packageName }}
              </div>
              <div v-if="affectedPackages.length === 0" class="no-data">暂无数据</div>
            </div>
          </div>
          <div class="install-card install-card-full">
            <div class="card-header">
              <i class="fa fa-list" />
              {{ operationConfig.hostCardTitle }}
            </div>
            <div class="card-body card-body--scroll">
              <div class="selection-item__primary">共 {{ hosts.length }} 台</div>
              <div v-for="host in hosts" :key="host" class="selection-item">
                <div class="selection-item__primary">{{ host }}</div>
              </div>
              <div v-if="hosts.length === 0" class="no-data">暂无数据</div>
            </div>
          </div>
        </div>

        <div v-show="currentStepKey === 'pre'" class="task-step-content">
          <ScriptStepContent
            icon="fa-code"
            title="预执行脚本"
            :alert="preCheckAlert"
            :run-id="preCheckRunId"
            :script-content="preCheckScript"
            @show-result="openExecuteResult($event, '预执行脚本')"
          />

          <!-- 前置环境检查详细结果 -->
          <div v-if="parsedPreCheckResult" class="pre-check-result-panel">
            <div class="panel-title">
              <i class="fa fa-heartbeat text-primary" />
              前置环境检查结果
            </div>

            <!-- 不可达主机列表 -->
            <div
              v-if="parsedPreCheckResult.unreachable && parsedPreCheckResult.unreachable.length > 0"
              class="unreachable-hosts-block"
            >
              <div class="unreachable-hosts-title">
                不可达主机 ({{ parsedPreCheckResult.unreachable.length }} 台)：
              </div>
              <div class="unreachable-hosts-tags">
                <el-tag
                  v-for="hostId in parsedPreCheckResult.unreachable"
                  :key="hostId"
                  type="danger"
                  size="small"
                >
                  {{ getHostDisplayName(hostId) }}
                </el-tag>
              </div>
            </div>

            <!-- 主机结果详情列表 -->
            <div
              v-if="parsedPreCheckResult.results && parsedPreCheckResult.results.length > 0"
              class="host-results-list"
            >
              <div
                v-for="hostResult in parsedPreCheckResult.results"
                :key="hostResult.host_id"
                class="host-result-card"
              >
                <div
                  class="host-result-header"
                  :class="{ 'is-unreachable': isHostUnreachable(hostResult) }"
                >
                  <span class="host-name">
                    <i class="fa fa-server me-1" />
                    {{ getHostDisplayName(hostResult.host_id) }}
                    <span v-if="isHostUnreachable(hostResult)" class="unreachable-label">
                      (无法连通)
                    </span>
                  </span>
                  <div class="host-tags">
                    <el-tag
                      v-if="hostResult.blockers > 0"
                      type="danger"
                      size="small"
                      effect="dark"
                    >
                      阻断项: {{ hostResult.blockers }}
                    </el-tag>
                    <el-tag
                      v-if="hostResult.warnings > 0"
                      type="warning"
                      size="small"
                      effect="dark"
                    >
                      警告项: {{ hostResult.warnings }}
                    </el-tag>
                    <el-tag
                      v-if="hostResult.blockers === 0 && hostResult.warnings === 0"
                      type="success"
                      size="small"
                      effect="dark"
                    >
                      检查通过
                    </el-tag>
                  </div>
                </div>

                <div class="host-result-body">
                  <el-collapse v-model="activeCollapseNames" class="no-border-collapse">
                    <el-collapse-item title="查看检查项明细" :name="hostResult.host_id">
                      <div class="checks-list">
                        <div
                          v-for="check in sortChecks(hostResult.checks)"
                          :key="check.id"
                          class="check-item"
                        >
                          <i
                            class="fa"
                            :class="{
                              'fa-times-circle': check.status === 'fail',
                              'fa-exclamation-circle': check.status === 'warn',
                              'fa-check-circle': check.status === 'ok'
                            }"
                            :style="{
                              color:
                                check.status === 'fail'
                                  ? 'var(--el-color-danger)'
                                  : check.status === 'warn'
                                    ? 'var(--el-color-warning)'
                                    : 'var(--el-color-success)'
                            }"
                          />
                          <div class="check-item-content">
                            <div class="check-item-header">
                              <span class="check-title">{{ getCheckTitle(check.id) }}</span>
                              <el-tag
                                :type="
                                  check.status === 'fail'
                                    ? 'danger'
                                    : check.status === 'warn'
                                      ? 'warning'
                                      : 'success'
                                "
                                size="small"
                                class="check-status-tag"
                              >
                                {{
                                  check.status === 'fail'
                                    ? '阻断'
                                    : check.status === 'warn'
                                      ? '警告'
                                      : '通过'
                                }}
                              </el-tag>
                            </div>
                            <div class="check-detail-text">
                              {{ check.detail }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ScriptStepContent
          v-show="currentStepKey === 'validate'"
          icon="fa-check-square-o"
          title="校验脚本"
          :alert="validateAlert"
          :run-id="validateRunId"
          :script-content="validateScript"
          @show-result="openExecuteResult($event, '校验脚本')"
        />

        <div v-show="currentStepKey === 'restart'" class="task-step-content">
          <div class="task-step-editor">
            <div class="task-step-editor__title">
              <i class="fa fa-refresh" />
              重启策略
            </div>
            <el-alert
              :type="restartAlert.type"
              :closable="false"
              show-icon
              :title="restartAlert.title"
              class="task-step-alert"
            >
              <template #default>
                <div class="task-detail-info">
                  <div>{{ detailTask.restartReason || '未提供重启说明' }}</div>
                  <el-button
                    v-if="restartRunId"
                    type="primary"
                    link
                    class="execute-result-link"
                    @click="openExecuteResult(restartRunId, '执行重启')"
                  >
                    查看执行详情
                  </el-button>
                </div>
              </template>
            </el-alert>
          </div>
        </div>

        <div v-show="currentStepKey === 'execute'" class="task-step-content">
          <div class="task-step-editor">
            <div class="task-step-editor__title">
              <i class="fa fa-download" />
              {{ operationConfig.executeTitle }}
            </div>

            <div class="install-summary-card">
              <SummaryRow
                :label="operationConfig.selectionSummaryLabel"
                :items="selectionItems"
                empty-text="暂无数据"
              />
              <SummaryRow label="目标主机" :items="hosts" empty-text="暂无主机" />
              <SummaryRow
                :label="operationConfig.packageSummaryLabel"
                :items="affectedPackages"
                empty-text="暂无软件包"
              />
            </div>

            <div class="pipeline-timeline mt-3">
              <div
                v-for="item in pipelineItems"
                :key="item.key"
                class="timeline-item"
                :class="{
                  'is-success': item.state === 'success',
                  'is-failed': item.state === 'failed'
                }"
              >
                <div class="timeline-node">
                  <i v-if="item.state === 'success'" class="fa fa-check" />
                  <i v-else-if="item.state === 'failed'" class="fa fa-times" />
                  <i v-else class="fa fa-clock-o" />
                </div>
                <div class="timeline-content">
                  <div class="timeline-info">
                    <div class="timeline-title">{{ item.label }}</div>
                    <div class="timeline-status-text">{{ item.text }}</div>
                  </div>
                  <div v-if="item.runId" class="timeline-actions">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="openExecuteResult(item.runId, item.label)"
                    >
                      查看详情
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 前置环境检查详细结果 -->
            <div v-if="parsedPreCheckResult" class="pre-check-result-panel">
              <div class="panel-title">
                <i class="fa fa-heartbeat text-primary" />
                前置环境检查结果
              </div>

              <!-- 不可达主机列表 -->
              <div
                v-if="
                  parsedPreCheckResult.unreachable &&
                  parsedPreCheckResult.unreachable.length > 0
                "
                class="unreachable-hosts-block"
              >
                <div class="unreachable-hosts-title">
                  不可达主机 ({{ parsedPreCheckResult.unreachable.length }} 台)：
                </div>
                <div class="unreachable-hosts-tags">
                  <el-tag
                    v-for="hostId in parsedPreCheckResult.unreachable"
                    :key="hostId"
                    type="danger"
                    size="small"
                  >
                    {{ getHostDisplayName(hostId) }}
                  </el-tag>
                </div>
              </div>

              <!-- 主机结果详情列表 -->
              <div
                v-if="parsedPreCheckResult.results && parsedPreCheckResult.results.length > 0"
                class="host-results-list"
              >
                <div
                  v-for="hostResult in parsedPreCheckResult.results"
                  :key="hostResult.host_id"
                  class="host-result-card"
                >
                  <div
                    class="host-result-header"
                    :class="{ 'is-unreachable': isHostUnreachable(hostResult) }"
                  >
                    <span class="host-name">
                      <i class="fa fa-server me-1" />
                      {{ getHostDisplayName(hostResult.host_id) }}
                      <span v-if="isHostUnreachable(hostResult)" class="unreachable-label">
                        (无法连通)
                      </span>
                    </span>
                    <div class="host-tags">
                      <el-tag
                        v-if="hostResult.blockers > 0"
                        type="danger"
                        size="small"
                        effect="dark"
                      >
                        阻断项: {{ hostResult.blockers }}
                      </el-tag>
                      <el-tag
                        v-if="hostResult.warnings > 0"
                        type="warning"
                        size="small"
                        effect="dark"
                      >
                        警告项: {{ hostResult.warnings }}
                      </el-tag>
                      <el-tag
                        v-if="hostResult.blockers === 0 && hostResult.warnings === 0"
                        type="success"
                        size="small"
                        effect="dark"
                      >
                        检查通过
                      </el-tag>
                    </div>
                  </div>

                  <div class="host-result-body">
                    <el-collapse v-model="activeCollapseNames" class="no-border-collapse">
                      <el-collapse-item title="查看检查项明细" :name="hostResult.host_id">
                        <div class="checks-list">
                          <div
                            v-for="check in sortChecks(hostResult.checks)"
                            :key="check.id"
                            class="check-item"
                          >
                            <i
                              class="fa"
                              :class="{
                                'fa-times-circle': check.status === 'fail',
                                'fa-exclamation-circle': check.status === 'warn',
                                'fa-check-circle': check.status === 'ok'
                              }"
                              :style="{
                                color:
                                  check.status === 'fail'
                                    ? 'var(--el-color-danger)'
                                    : check.status === 'warn'
                                      ? 'var(--el-color-warning)'
                                      : 'var(--el-color-success)'
                              }"
                            />
                            <div class="check-item-content">
                              <div class="check-item-header">
                                <span class="check-title">{{ getCheckTitle(check.id) }}</span>
                                <el-tag
                                  :type="
                                    check.status === 'fail'
                                      ? 'danger'
                                      : check.status === 'warn'
                                        ? 'warning'
                                        : 'success'
                                  "
                                  size="small"
                                  class="check-status-tag"
                                >
                                  {{
                                    check.status === 'fail'
                                      ? '阻断'
                                      : check.status === 'warn'
                                        ? '警告'
                                        : '通过'
                                  }}
                                </el-tag>
                              </div>
                              <div class="check-detail-text">
                                {{ check.detail }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </el-collapse-item>
                    </el-collapse>
                  </div>
                </div>
              </div>
            </div>

            <!-- 全流程中断异常提示 -->
            <el-alert
              v-if="isTaskFailed"
              type="error"
              :closable="false"
              show-icon
              :title="`执行任务中断${taskErrorMessage ? '：' + taskErrorMessage : ''}`"
              class="task-step-alert mt-3"
            >
              <template #default>
                <div style="font-size: 13px">
                  由于部分环节出现异常{{ taskErrorMessage ? `（${taskErrorMessage}）` : '' }}，任务已停止。请检查原因。
                </div>
              </template>
            </el-alert>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer process-detail__footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button :disabled="currentStep === 0" @click="currentStep -= 1">上一步</el-button>
        <el-button
          :disabled="currentStep >= wizardSteps.length - 1"
          type="primary"
          @click="currentStep += 1"
        >
          下一步
        </el-button>
      </div>
    </template>
  </el-dialog>

  <ExecuteResultDialog
    v-model:visible="executeResultVisible"
    :run-id="executeRunId"
    :job-title="executeJobTitle"
  />
</template>

<script setup>
import { computed, ref, toRef, watch } from 'vue'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { usePatchProcessLogDetail } from '../../composables/usePatchProcessLogDetail'
import ScriptStepContent from './PatchProcessLogScriptStep.vue'
import SummaryRow from './PatchProcessLogSummaryRow.vue'
import { useActiveTaskListPolling } from '@/composables/useActiveTaskListPolling'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const sourceTask = toRef(props, 'task')
const executeResultVisible = ref(false)
const executeRunId = ref('')
const executeJobTitle = ref('')
const activeCollapseNames = ref([])

const {
  loading,
  task: detailTask,
  currentStep,
  currentStepKey,
  operationConfig,
  wizardSteps,
  selectionItems,
  hosts,
  affectedPackages,
  preCheckScript,
  validateScript,
  preCheckAlert,
  validateAlert,
  restartAlert,
  preCheckRunId,
  validateRunId,
  restartRunId,
  pipelineItems,
  taskErrorMessage,
  isTaskFailed,
  parsedPreCheckResult,
  load,
  reset,
  getWizardStepState
} = usePatchProcessLogDetail(sourceTask)

useActiveTaskListPolling({
  records: () => (detailTask.value ? [detailTask.value] : []),
  refresh: load,
  enabled: () => props.modelValue,
  activeStatuses: ['PRE_CHECKING', 'INSTALLING', 'ROLLING_BACK', 'RESTARTING', 'VALIDATING']
})

watch(
  parsedPreCheckResult,
  newVal => {
    if (newVal?.results) {
      activeCollapseNames.value = newVal.results
        .filter(r => r.blockers > 0 || r.warnings > 0)
        .map(r => r.host_id)
    } else {
      activeCollapseNames.value = []
    }
  },
  { immediate: true }
)

const checkTitles = {
  conn: '连通性',
  sudo: '提权权限',
  os: '操作系统识别',
  pkg_manager: '包管理器',
  pkg_lock: '包管理器占用',
  pkg_db: '包数据库健康',
  disk: '磁盘空间',
  disk_boot: '/boot 空间',
  kernel_pending: '待重启内核',
  repo: '软件仓库',
  pkg_exists: '目标包存在性',
  version_ok: '目标版本可用性',
  depsolve: '依赖解析',
  already_satisfied: '已是目标版本',
  exec: '检查执行异常'
}

function getCheckTitle(id) {
  return checkTitles[id] || id
}

function isHostUnreachable(hostResult) {
  return (
    Array.isArray(hostResult.checks) &&
    hostResult.checks.some(c => c.id === 'conn' && c.status === 'fail')
  )
}

function sortChecks(checks) {
  if (!Array.isArray(checks)) return []
  const severityMap = { fail: 0, warn: 1, ok: 2 }
  return [...checks].sort((a, b) => {
    const aVal = severityMap[a.status] ?? 3
    const bVal = severityMap[b.status] ?? 3
    return aVal - bVal
  })
}

function getHostDisplayName(hostId) {
  if (!hostId) return ''
  return hostId
}

function getStepperClasses(stepKey, index) {
  const state = getWizardStepState(stepKey)
  return {
    'is-active': currentStep.value === index,
    'is-success': state === 'success',
    'is-failed': state === 'failed'
  }
}

function openExecuteResult(runId, jobTitle) {
  if (!runId) return
  executeRunId.value = runId
  executeJobTitle.value = jobTitle
  executeResultVisible.value = true
}

function handleClosed() {
  reset()
  executeResultVisible.value = false
  executeRunId.value = ''
  executeJobTitle.value = ''
}
</script>

<style scoped lang="scss">
:deep(.process-log-dialog) {
  .el-dialog {
    border-radius: 12px;
    overflow: hidden;
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
  }

  .el-dialog__header {
    margin-right: 0;
    padding: 18px 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .el-dialog__body {
    padding: 20px 24px 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .el-dialog__footer {
    padding: 12px 24px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.ops-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 40px;
}

.stepper-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 90px;
  position: relative;
  z-index: 1;

  .stepper-icon {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background-color: var(--el-bg-color, #fff);
    border: 2px solid var(--el-text-color-placeholder, #a8abb2);
    color: var(--el-text-color-placeholder, #a8abb2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 6px;
    transition: all 0.3s;
  }

  .stepper-title {
    font-size: 12px;
    color: var(--el-text-color-regular, #606266);
    font-weight: 500;
    transition: all 0.3s;
    text-align: center;
    white-space: nowrap;
  }

  &.is-active {
    .stepper-icon {
      border-color: var(--el-color-primary, #409eff);
      background-color: var(--el-color-primary, #409eff);
      color: #fff;
    }

    .stepper-title {
      color: var(--el-color-primary, #409eff);
      font-weight: bold;
    }
  }

  &.is-success {
    .stepper-icon {
      border-color: var(--el-color-success, #67c23a);
      color: var(--el-color-success, #67c23a);
    }

    .stepper-title {
      color: var(--el-color-success, #67c23a);
    }
  }

  &.is-failed {
    .stepper-icon {
      border-color: var(--el-color-danger, #f56c6c);
      background-color: var(--el-color-danger, #f56c6c);
      color: #fff;
    }

    .stepper-title {
      color: var(--el-color-danger, #f56c6c);
    }
  }
}

.stepper-item--clickable {
  cursor: pointer;
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--el-border-color-lighter, #ebeef5);
  margin: 12px -30px 0;
  z-index: 0;
  transition: all 0.3s;

  &.is-active {
    background-color: var(--el-color-success, #67c23a);
  }
}

.process-detail {
  min-height: 420px;
  padding-right: 4px;
}

.process-detail__stepper {
  margin-bottom: 24px;
}

.process-detail__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.install-content {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(0, 3fr);
  gap: 16px;
  align-items: start;
}

.install-card-full {
  grid-column: span 2;
}

.install-content > .install-card:not(.install-card-full) .card-body--scroll {
  max-height: 320px;
}

.install-content > .install-card.install-card-full .card-body--scroll {
  max-height: 260px;
}

.install-card {
  margin-bottom: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;

  .card-header {
    background: var(--el-fill-color-light);
    padding: 8px 12px;
    font-weight: 500;
    font-size: 13px;
    color: var(--el-text-color-primary);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .card-body {
    padding: 10px 12px;
    background: var(--el-bg-color);
    font-size: 13px;
    color: var(--el-text-color-primary);
  }
}

.card-body--scroll {
  max-height: 220px;
  overflow-y: auto;
}

.selection-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: none;
  }
}

.selection-item__primary {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.selection-item__secondary {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 2px;
  word-break: break-all;
}

.package-item {
  font-family: monospace;
  font-size: 14px;
  margin-bottom: 4px;
  color: #666;
  word-break: break-all;
}

.task-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 280px;
}

.task-step-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-step-editor__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.task-step-alert {
  width: 100%;
}

.task-detail-info {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.execute-result-link {
  font-size: 14px;
}

.install-summary-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}

.pipeline-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-blank);

  &.is-success {
    border-color: var(--el-color-success-light-5);
    background-color: var(--el-color-success-light-9);
  }

  &.is-failed {
    border-color: var(--el-color-danger-light-5);
    background-color: var(--el-color-danger-light-9);
  }
}

.timeline-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background-color: var(--el-fill-color);
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.is-success .timeline-node {
  background-color: var(--el-color-success);
  color: #fff;
}

.is-failed .timeline-node {
  background-color: var(--el-color-danger);
  color: #fff;
}

.timeline-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeline-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.timeline-status-text,
.timeline-actions {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.timeline-actions {
  font-size: 12px;
  word-break: break-all;
}

.no-data {
  color: var(--el-text-color-placeholder);
}

.mt-3 {
  margin-top: 12px;
}

.text-primary {
  color: var(--el-color-primary);
}

.pre-check-result-panel {
  margin-top: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 16px;
  background-color: var(--el-fill-color-blank);
  width: 100%;
  box-sizing: border-box;

  .panel-title {
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 12px;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.unreachable-hosts-block {
  margin-bottom: 12px;

  .unreachable-hosts-title {
    font-weight: 600;
    color: var(--el-color-danger);
    margin-bottom: 6px;
    font-size: 13px;
  }

  .unreachable-hosts-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}

.host-results-list {
  width: 100%;
}

.host-result-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;

  .host-result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background-color: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-extra-light);
    flex-wrap: wrap;
    gap: 8px;

    &.is-unreachable {
      background-color: var(--el-color-danger-light-9);
      border-bottom-color: var(--el-color-danger-light-7);
    }

    .host-name {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      color: var(--el-text-color-primary);

      .unreachable-label {
        font-size: 12px;
        margin-left: 8px;
        font-weight: normal;
        color: var(--el-color-danger);
      }
    }

    .host-tags {
      display: flex;
      gap: 6px;
      align-items: center;
    }
  }

  .host-result-body {
    padding: 12px 16px;
  }
}

.no-border-collapse {
  border: none;

  :deep(.el-collapse-item__header) {
    border-bottom: none;
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }
}

.checks-list {
  padding-top: 4px;

  .check-item {
    display: flex;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-child {
      border-bottom: none;
    }

    i {
      font-size: 16px;
      margin-top: 2px;
      margin-right: 10px;
    }

    .check-item-content {
      flex: 1;

      .check-item-header {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .check-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--el-text-color-primary);
        }

        .check-status-tag {
          font-size: 10px;
          height: 16px;
          line-height: 14px;
          padding: 0 4px;
        }
      }

      .check-detail-text {
        font-size: 12px;
        color: var(--el-text-color-regular);
        margin-top: 4px;
        line-height: 1.4;
      }
    }
  }
}

@media (max-width: 900px) {
  :deep(.process-log-dialog) {
    .el-dialog {
      width: calc(100vw - 24px) !important;
      margin: 0 auto;
    }

    .el-dialog__header,
    .el-dialog__body,
    .el-dialog__footer {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

  .timeline-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
