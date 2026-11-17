<template>
  <div class="ops-page-layout overview-dashboard" :class="{ 'is-english': currentLocale === 'en-US' }">
    <section class="overview-summary" :aria-label="t('inspection.overview.summaryAria')">
      <div class="summary-heading">
        <div>
          <h2>{{ t('inspection.overview.summaryTitle') }}</h2>
          <p>{{ t('inspection.overview.summaryDescription') }}</p>
        </div>
        <span class="summary-coverage" role="status">{{ summaryCoverage }}</span>
      </div>
      <div class="summary-values">
        <div v-for="item in distributionData" :key="item.key" class="summary-value">
          <span class="summary-dot" :class="`summary-dot--${item.field}`" aria-hidden="true"></span>
          <span>{{ item.label }}</span>
          <strong>{{ hasSummaryData ? item.value.toLocaleString(currentLocale.value) : '—' }}</strong>
        </div>
      </div>
    </section>

    <section class="overview-results" aria-labelledby="overview-results-title">
      <div class="results-toolbar">
        <div class="results-title">
          <h2 id="overview-results-title">{{ t('inspection.overview.templateResults') }}</h2>
          <span v-if="listLoaded" class="template-count">
            {{ t('inspection.templates.filteredCount', { matched: filteredTemplateList.length, total: templateList.length, count: templateList.length }) }}
          </span>
        </div>
        <div class="results-tools">
          <el-input
            v-model="searchKeyword"
            :placeholder="t('inspection.email.searchTemplates')"
            :aria-label="t('inspection.email.searchTemplates')"
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
            :title="listError ? t('inspection.templates.retryRead') : t('common.refresh')"
            :aria-label="listError ? t('inspection.templates.retryTemplates') : t('inspection.overview.refresh')"
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
          <el-table-column prop="templateName" :label="t('inspection.templates.template')" min-width="200" show-overflow-tooltip />
          <el-table-column :label="t('inspection.overview.resultState')" :min-width="currentLocale === 'en-US' ? 210 : 136">
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
                  {{ t('inspection.overview.retryStatistics') }}
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            v-for="column in resultColumns"
            :key="column.field"
            :label="column.label"
            :min-width="currentLocale === 'en-US' ? (column.field === 'unreachable' ? 132 : 104) : (column.field === 'unreachable' ? 92 : 68)"
            align="right"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <span
                class="result-count"
                :class="row.stats?.[column.field] > 0 ? `result-count--${column.field}` : ''"
              >
                {{ row.stats ? row.stats[column.field].toLocaleString(currentLocale.value) : '—' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="t('inspection.templates.configuredHosts')" :min-width="currentLocale === 'en-US' ? 160 : 104" align="right" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="result-count">{{ row.hostLength ?? '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="t('inspection.overview.recordedAt')" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span :title="formatRecordedTime(row.executedAt)">
                {{ formatRecordedTime(row.executedAt) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="t('common.actions')" min-width="260" align="left" fixed="right">
            <template #default="{ row }">
              <div class="overview-row-actions">
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="openingReport || !hasReport(row) || !isTemplateCurrent(row)"
                  @click="handleViewReport(row)"
                >
                  {{ t('inspection.templates.viewReport') }}
                </el-button>
                <el-button
                  text
                  type="primary"
                  size="small"
                  :disabled="!isTemplateCurrent(row)"
                  @click="handleCommand('run', row)"
                >
                  {{ t('inspection.templates.execute') }}
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
                    :aria-label="t('inspection.templates.moreActions', { name: row.templateName })"
                  >
                    {{ t('inspection.templates.more') }}
                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="edit">{{ t('common.edit') }}</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>{{ t('common.delete') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <span v-if="loading">{{ t('inspection.templates.loading') }}</span>
            <span v-else-if="listError">{{ t('inspection.templates.readRetry') }}</span>
            <el-empty
              v-else-if="listLoaded && templateList.length === 0"
              :description="t('inspection.templates.noTemplates')"
              :image-size="80"
            >
              <el-button type="primary" @click="goToAddTemplate">{{ t('inspection.templates.addTemplate') }}</el-button>
            </el-empty>
            <span v-else>{{ t('inspection.templates.noMatches') }}</span>
          </template>
        </el-table>
      </div>
      <div class="overview-table-note">
        {{ t('inspection.overview.countNote') }}
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
import { t, currentLocale } from '@/core/i18n'
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
  { field: 'failed', get label() { return t('inspection.status.failed') } },
  { field: 'unreachable', get label() { return t('inspection.status.missingData') } },
  { field: 'check', get label() { return t('inspection.overview.manualShort') } },
  { field: 'skipping', get label() { return t('inspection.overview.skippedShort') } },
  { field: 'ok', get label() { return t('inspection.overview.passedShort') } }
]

const summaryCoverage = computed(() => {
  if (loading.value) return t('inspection.overview.loadingSummary')
  if (listError.value) return t('inspection.overview.summaryUnavailable')
  const { total, loaded, failed, pending } = statisticsProgress.value
  if (!total) return t('inspection.overview.noReport')
  const parts = []
  if (failed || pending) parts.push(t('inspection.overview.partialSummary'))
  parts.push(t('inspection.overview.statisticsCoverage', { loaded, total, count: total }))
  if (failed) parts.push(t('inspection.overview.statisticsFailedCount', { failed, count: failed }))
  return parts.join(' · ')
})

function hasReport(template) {
  return template.jobId !== null && template.jobId !== undefined && template.jobId !== ''
}

function getResultState(template) {
  const states = {
    'not-run': { get label() { return t('inspection.overview.noReport') }, type: 'info' },
    loading: { get label() { return t('inspection.overview.statisticsLoading') }, type: 'info' },
    error: { get label() { return t('inspection.overview.statisticsFailed') }, type: 'danger' },
    interrupted: { get label() { return t('inspection.overview.statisticsInterrupted') }, type: 'warning' },
    empty: { get label() { return t('inspection.overview.noStatistics') }, type: 'info' }
  }
  if (states[template.statisticsState]) return states[template.statisticsState]
  if (template.stats?.failed > 0) return { get label() { return t('inspection.overview.failedResults') }, type: 'danger' }
  if (template.stats?.unreachable > 0) return { get label() { return t('inspection.overview.missingResults') }, type: 'warning' }
  if (template.stats?.check > 0) return { get label() { return t('inspection.overview.manualRequired') }, type: 'warning' }
  return { get label() { return t('inspection.overview.hasResults') }, type: 'info' }
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
    ElMessage.warning(t('inspection.overview.templateNoReport'))
    return
  }
  try {
    await openReport(template)
  } catch {
    if (isTemplateCurrent(template)) ElMessage.error(t('inspection.overview.openReportFailed'))
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
    await ElMessageBox.confirm(t('inspection.templates.deleteConfirm', { name }), t('inspection.templates.deleteTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    if (!isCurrent()) return
    await templateApi.deleteTemplate(id)
    if (!isCurrent()) return
    ElMessage.success(t('inspection.templates.deleteSucceeded'))
    refreshAll()
  } catch (error) {
    if (!isCurrent()) return
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to delete template:', error)
      ElMessage.error(t('inspection.templates.deleteFailed'))
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

.overview-dashboard.is-english :deep(.el-table .cell) {
  word-break: normal;
  overflow-wrap: break-word;
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
