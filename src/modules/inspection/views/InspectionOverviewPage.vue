<template>
  <div class="ops-page-layout overview-dashboard">
    <section class="overview-summary" aria-label="关联报告的检查结果汇总">
      <div class="summary-heading">
        <div>
          <h2>检查结果汇总</h2>
          <p>全部模板关联报告的检查项结果合计，各报告执行时间可能不同。</p>
        </div>
        <span class="summary-coverage" role="status">{{ summaryCoverage }}</span>
      </div>
      <div class="summary-values">
        <div v-for="item in distributionData" :key="item.key" class="summary-value">
          <span class="summary-dot" :class="`summary-dot--${item.field}`" aria-hidden="true"></span>
          <span>{{ item.label }}</span>
          <strong>{{ hasSummaryData ? item.value.toLocaleString() : '—' }}</strong>
        </div>
      </div>
    </section>

    <section class="overview-results" aria-labelledby="overview-results-title">
      <div class="results-toolbar">
        <div class="results-title">
          <h2 id="overview-results-title">模板巡检结果</h2>
          <span v-if="listLoaded" class="template-count">
            {{ filteredTemplateList.length }} / {{ templateList.length }} 个模板
          </span>
        </div>
        <div class="results-tools">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索模板名称"
            aria-label="搜索模板名称"
            clearable
            size="small"
            class="template-search-input"
          >
            <template #prefix><i class="fa fa-search" aria-hidden="true"></i></template>
          </el-input>
          <el-button
            class="toolbar-icon-btn"
            circle
            size="small"
            :loading="refreshing"
            :title="listError ? '重试读取' : '刷新'"
            :aria-label="listError ? '重试读取巡检模板' : '刷新巡检总览'"
            @click="refreshAll"
          >
            <i v-show="!refreshing" class="fas fa-sync-alt" aria-hidden="true"></i>
          </el-button>
        </div>
      </div>

      <el-alert v-if="listError" :title="listError" type="warning" :closable="false" show-icon />

      <div class="overview-table-wrapper">
        <el-table
          ref="reportTable"
          v-loading="loading"
          :data="filteredTemplateList"
          row-key="id"
          height="100%"
          style="width: 100%"
        >
          <el-table-column prop="templateName" label="模板" min-width="200" show-overflow-tooltip />
          <el-table-column label="结果状态" min-width="136">
            <template #default="{ row }">
              <div class="result-state">
                <el-tag :type="getResultState(row).type" size="small">
                  {{ getResultState(row).label }}
                </el-tag>
                <el-button
                  v-if="['error', 'interrupted'].includes(row.statisticsState)"
                  link
                  type="primary"
                  size="small"
                  :disabled="loading"
                  @click="retryStatistics(row)"
                >
                  重试统计
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            v-for="column in resultColumns"
            :key="column.field"
            :label="column.label"
            :min-width="column.field === 'unreachable' ? 92 : 68"
            align="right"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span
                class="result-count"
                :class="row.stats?.[column.field] > 0 ? `result-count--${column.field}` : ''"
              >
                {{ row.stats ? row.stats[column.field].toLocaleString() : '—' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="配置主机数" min-width="104" align="right" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="result-count">{{ row.hostLength ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="模板记录时间" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span :title="formatRecordedTime(row.executedAt)">
                {{ formatRecordedTime(row.executedAt) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" align="left" fixed="right">
            <template #default="{ row }">
              <div class="overview-row-actions">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="openingReport || !hasReport(row) || !isTemplateCurrent(row)"
                  @click="handleViewReport(row)"
                >
                  查看报告
                </el-button>
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="!isTemplateCurrent(row)"
                  @click="handleCommand('run', row)"
                >
                  执行
                </el-button>
                <el-dropdown
                  trigger="click"
                  :disabled="!isTemplateCurrent(row)"
                  @command="command => handleCommand(command, row)"
                >
                  <el-button
                    text
                    type="primary"
                    size="small"
                    :disabled="!isTemplateCurrent(row)"
                    :aria-label="`${row.templateName}的更多操作`"
                  >
                    更多
                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <span v-if="loading">正在读取巡检模板…</span>
            <span v-else-if="listError">读取失败，请刷新重试</span>
            <el-empty
              v-else-if="listLoaded && templateList.length === 0"
              description="暂无巡检模板"
              :image-size="80"
            >
              <el-button type="primary" @click="goToAddTemplate">新增模板</el-button>
            </el-empty>
            <span v-else>没有匹配的模板</span>
          </template>
        </el-table>
      </div>
      <div class="overview-table-note">
        “—”表示暂无可核实计数；结果状态不代表任务运行状态。
        配置主机数为模板当前配置数量，不代表关联报告实际覆盖主机数；时间来自模板记录。
      </div>
    </section>

    <TemplateEditDialog
      v-model:visible="editDialogVisible"
      :template-id="editTemplateId"
      @success="handleEditSuccess"
    />
    <RunTemplateDialog
      v-model:visible="runDialogVisible"
      :template-id="runTemplateId"
      @success="handleRunSuccess"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templateApi } from '../api'
import { useOverviewData } from '../composables/useOverviewData'
import { useOverviewReportNavigation } from '../composables/useOverviewReportNavigation'
import { formatDateTime } from '../utils/helpers'
import TemplateEditDialog from '../components/template/TemplateEditDialog.vue'
import RunTemplateDialog from '../components/template/RunTemplateDialog.vue'

const {
  loading,
  refreshing,
  templateList,
  searchKeyword,
  filteredTemplateList,
  distributionData,
  listError,
  listLoaded,
  statisticsProgress,
  hasSummaryData,
  retryStatistics,
  isTemplateCurrent,
  captureTemplate,
  initData,
  refreshAll
} = useOverviewData()
const { reportTable, openingReport, openReport } = useOverviewReportNavigation(
  searchKeyword,
  loading,
  isTemplateCurrent
)

const editDialogVisible = ref(false)
const editTemplateId = ref('')
const runDialogVisible = ref(false)
const runTemplateId = ref('')
const resultColumns = [
  { field: 'failed', label: '失败' },
  { field: 'unreachable', label: '数据缺失' },
  { field: 'check', label: '人工' },
  { field: 'skipping', label: '跳过' },
  { field: 'ok', label: '通过' }
]

const summaryCoverage = computed(() => {
  if (loading.value) return '正在读取模板…'
  if (listError.value) return '模板读取失败，暂无可核实汇总'
  const { total, loaded, failed, pending } = statisticsProgress.value
  if (!total) return '暂无关联报告'
  const prefix = failed || pending ? '部分汇总 · ' : ''
  const errors = failed ? ` · ${failed} 个统计未读取成功` : ''
  return `${prefix}统计已读取 ${loaded} / ${total} 个有报告模板${errors}`
})

function hasReport(template) {
  return template.jobId !== null && template.jobId !== undefined && template.jobId !== ''
}

function getResultState(template) {
  const states = {
    'not-run': { label: '暂无关联报告', type: 'info' },
    loading: { label: '统计读取中', type: 'info' },
    error: { label: '统计读取失败', type: 'danger' },
    interrupted: { label: '统计读取已中断', type: 'warning' },
    empty: { label: '暂无检查统计', type: 'info' }
  }
  if (states[template.statisticsState]) return states[template.statisticsState]
  if (template.stats?.failed > 0) return { label: '有失败结果', type: 'danger' }
  if (template.stats?.unreachable > 0) return { label: '存在数据缺失', type: 'warning' }
  if (template.stats?.check > 0) return { label: '需人工检查', type: 'warning' }
  return { label: '已有检查结果', type: 'info' }
}

function formatRecordedTime(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(new Date(value).getTime())
  )
    return '—'
  return formatDateTime(value)
}

async function handleViewReport(template) {
  if (!isTemplateCurrent(template)) return
  if (!hasReport(template)) {
    ElMessage.warning('该模板暂无关联报告')
    return
  }
  try {
    await openReport(template)
  } catch {
    if (isTemplateCurrent(template)) ElMessage.error('无法打开报告，请重试')
  }
}

function handleCommand(command, template) {
  if (!isTemplateCurrent(template)) return
  switch (command) {
    case 'run':
      runTemplateId.value = template.id
      runDialogVisible.value = true
      break
    case 'edit':
      editTemplateId.value = template.id
      editDialogVisible.value = true
      break
    case 'delete':
      deleteTemplate(template)
      break
  }
}

async function deleteTemplate(template) {
  if (!isTemplateCurrent(template)) return
  const isCurrent = captureTemplate(template)
  const id = template.id
  const name = template.templateName
  try {
    await ElMessageBox.confirm(`确定要删除模板「${name}」吗？`, '删除确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    if (!isCurrent()) return
    await templateApi.deleteTemplate(id)
    if (!isCurrent()) return
    ElMessage.success('删除成功')
    refreshAll()
  } catch (error) {
    if (!isCurrent()) return
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to delete template:', error)
      ElMessage.error('删除失败')
    }
  }
}

function handleEditSuccess() {
  refreshAll()
}
function handleRunSuccess() {
  refreshAll()
}
function goToAddTemplate() {
  editTemplateId.value = ''
  editDialogVisible.value = true
}
onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.overview-dashboard {
  gap: 16px;
  min-width: 0;
}

.overview-summary,
.overview-results {
  min-width: 0;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.overview-summary {
  flex-shrink: 0;
  padding: 14px 16px;
}

.summary-heading,
.results-toolbar,
.results-title,
.results-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
}

.summary-heading,
.results-toolbar {
  justify-content: space-between;
}

.summary-heading h2,
.results-title h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.summary-heading p,
.summary-coverage,
.template-count,
.overview-table-note {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.summary-heading p {
  margin: 4px 0 0;
}

.summary-values {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin-top: 12px;
}

.summary-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  strong {
    font-size: 21px;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }
}

.summary-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-text-color-secondary);
  &--ok {
    background: var(--el-color-success);
  }
  &--failed {
    background: var(--el-color-danger);
  }
  &--unreachable {
    background: var(--el-color-warning);
  }
  &--check {
    background: var(--el-color-primary);
  }
}

.overview-results {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  > .el-alert {
    flex-shrink: 0;
  }
}

.results-toolbar {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.results-tools {
  margin-left: auto;
  gap: 8px;
  .template-search-input {
    width: 240px;
    max-width: 100%;
  }
}

.overview-table-wrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.result-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.result-count {
  font-variant-numeric: tabular-nums;
  &--failed {
    color: var(--el-color-danger);
    font-weight: 600;
  }
  &--unreachable {
    color: var(--el-color-warning-dark-2);
    font-weight: 600;
  }
}

.overview-row-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  white-space: nowrap;
  vertical-align: middle;
  :deep(.el-button.is-text) {
    flex-shrink: 0;
    margin-left: 0;
  }
  :deep(.el-dropdown) {
    flex-shrink: 0;
  }
  :deep(.el-button > span) {
    gap: 4px;
  }
}

.overview-table-note {
  flex-shrink: 0;
  padding: 10px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .results-tools {
    width: 100%;
    margin-left: 0;
    flex-wrap: nowrap;
  }
  .results-tools .template-search-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
  .summary-values {
    gap: 10px 20px;
  }
}
</style>
