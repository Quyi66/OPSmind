<template>
  <div v-if="isAdmin" class="ops-page-layout ops-page-layout--page-scroll ssc-sql-import-page">
    <div class="yum-sql-import-panel">
      <div class="yum-sql-import-panel__grid">
        <!-- 左侧执行入口 -->
        <div
          class="ops-section yum-sql-import-panel__card yum-sql-import-panel__card--control mb-0"
        >
          <div class="ops-section__header">
            <span class="ops-section__title">{{ t('settings.sql.entry') }}</span>
          </div>

          <div class="ops-section__content">
            <el-form label-position="top" class="yum-sql-import-panel__form" @submit.prevent>
              <!-- 第一区块：文件配置 -->
              <div class="yum-sql-import-panel__form-section">
                <div class="form-section-title">
                  <el-icon class="section-icon"><Document /></el-icon>
                  {{ t('settings.sql.chooseFile') }}
                </div>

                <el-form-item :label="t('settings.sql.serverFile')" class="mb-0">
                  <el-input
                    v-model.trim="form.serverFile"
                    :placeholder="t('settings.sql.filePlaceholder')"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Document /></el-icon>
                    </template>
                  </el-input>
                  <div class="yum-sql-import-panel__tip mt-2">
                    <I18nT keypath="settings.sql.fileHint" :i18n="i18n.global">
                      <template #directory><code>/opt/sjxy/assets/gfs/fs-repos</code></template>
                    </I18nT>
                    <br />
                    <I18nT keypath="settings.sql.extensionsHint" :i18n="i18n.global">
                      <template #extensions><code>.sql</code>, <code>.sql.gz</code>, <code>.gz</code>, <code>.tar</code>, <code>.tar.gz</code>, <code>.tgz</code></template>
                    </I18nT>
                  </div>
                </el-form-item>
              </div>

              <!-- 第二区块：执行设置 -->
              <div class="yum-sql-import-panel__form-section">
                <div class="form-section-title">
                  <el-icon class="section-icon"><Setting /></el-icon>
                  {{ t('settings.sql.configuration') }}
                </div>

                <el-form-item :label="t('settings.sql.options')" class="mb-0">
                  <div class="yum-sql-import-panel__option-group">
                    <el-checkbox v-model="form.continueOnError">{{ t('settings.sql.continue') }}</el-checkbox>
                    <el-checkbox v-model="form.dryRun">{{ t('settings.sql.parseOnly') }}</el-checkbox>
                  </div>
                </el-form-item>
              </div>

              <!-- 第三区块：动作按钮 -->
              <div class="yum-sql-import-panel__actions-section">
                <el-button
                  type="primary"
                  class="yum-sql-import-panel__action-main"
                  size="large"
                  :loading="submitting"
                  :disabled="submitDisabled"
                  @click="handleSubmit"
                >
                  <template #icon>
                    <el-icon><VideoPlay /></el-icon>
                  </template>
                  {{ t('settings.sql.start') }}
                </el-button>
                <div class="yum-sql-import-panel__secondary-actions">
                  <el-button
                    :disabled="!currentJobId || submitting"
                    :loading="refreshing"
                    @click="refreshCurrentJob"
                    class="action-btn"
                  >
                    <template #icon>
                      <el-icon><Refresh /></el-icon>
                    </template>
                    {{ t('settings.sql.refresh') }}
                  </el-button>
                  <el-button
                    :disabled="!form.serverFile"
                    @click="clearFileSelection"
                    class="action-btn"
                  >
                    <template #icon>
                      <el-icon><Delete /></el-icon>
                    </template>
                    {{ t('settings.sql.clear') }}
                  </el-button>
                </div>
              </div>
            </el-form>
          </div>
        </div>

        <!-- 右侧任务结果 -->
        <div class="ops-section yum-sql-import-panel__card yum-sql-import-panel__card--result mb-0">
          <div class="ops-section__header">
            <span class="ops-section__title">{{ t('settings.sql.result') }}</span>
          </div>

          <div class="ops-section__content result-content-wrapper">
            <el-alert v-if="readError" :title="readError" type="error" :closable="false" show-icon>
              <el-button
                link
                type="primary"
                :disabled="submitting"
                :loading="refreshing"
                @click="refreshCurrentJob"
              >
                {{ t('settings.sql.retry') }}
              </el-button>
            </el-alert>
            <div v-if="!jobResult" class="yum-sql-import-panel__empty-state">
              <el-empty :description="t('settings.sql.empty')" />
            </div>

            <template v-else>
              <div class="yum-sql-import-panel__result-meta">
                <el-tag :type="getSqlImportStatusTagType(jobResult)" effect="dark" round>
                  {{ getSqlImportStatusLabel(jobResult) }}
                </el-tag>
                <span
                  v-if="isSqlImportRunning(jobResult) && !readError"
                  class="yum-sql-import-panel__running-hint"
                >
                  <el-icon class="is-loading"><Loading /></el-icon>
                  {{ t('settings.sql.polling') }}
                </span>
              </div>

              <el-descriptions
                :column="2"
                border
                class="yum-sql-import-panel__descriptions"
                label-class-name="descriptions-label"
                label-width="100"
              >
                <el-descriptions-item :label="t('settings.sql.jobId')">
                  <span>{{ jobResult.jobId || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.filename')">
                  <span class="text-semibold">{{ jobResult.fileName || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.currentEntry')">
                  <span class="text-semibold">{{ jobResult.currentEntry || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.totalStatements')">
                  <span>{{ formatNumber(jobResult.totalStatements) }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.failedStatements')">
                  <span
                    :class="
                      jobResult.failedStatements > 0
                        ? 'text-danger text-bold'
                        : jobResult.failedStatements === 0
                          ? 'text-success'
                          : ''
                    "
                  >
                    {{ formatNumber(jobResult.failedStatements) }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.elapsed')">
                  {{ formatElapsed(jobResult.elapsedMs) }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.startTime')">
                  {{ formatResultTime(jobResult.startTime) }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.endTime')">
                  {{ formatResultTime(jobResult.endTime) }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.executionOptions')">
                  {{ describeOptions(jobResult) }}
                </el-descriptions-item>
                <el-descriptions-item :label="t('settings.sql.message')">
                  {{ jobResult.message || '-' }}
                </el-descriptions-item>
              </el-descriptions>

              <div v-if="jobResult.entries.length" class="yum-sql-import-panel__section">
                <div class="yum-sql-import-panel__section-title">
                  <el-icon class="section-icon text-primary"><Document /></el-icon>
                  {{ t('settings.sql.fileSummary') }}
                </div>
                <div class="ops-table-wrapper">
                  <el-table :data="jobResult.entries" size="small" class="flat-table">
                    <el-table-column
                      prop="entry"
                      :label="t('settings.sql.entryName')"
                      min-width="220"
                      show-overflow-tooltip
                    />
                    <el-table-column prop="statements" :label="t('settings.sql.statements')" width="120" align="right" />
                  </el-table>
                </div>
              </div>

              <div v-if="jobResult.errors.length" class="yum-sql-import-panel__section">
                <div class="yum-sql-import-panel__section-title">
                  <el-icon class="section-icon text-danger"><Warning /></el-icon>
                  {{ t('settings.sql.failureDetails') }}
                  <span v-if="jobResult.errorsTruncated" class="yum-sql-import-panel__tip">
                    {{ t('settings.sql.retainedErrors') }}
                  </span>
                </div>
                <div class="ops-table-wrapper">
                  <el-table
                    :data="paginatedErrors"
                    size="small"
                    class="flat-table natural-height-table"
                  >
                    <el-table-column prop="entry" :label="t('settings.sql.entryName')" width="150" show-overflow-tooltip />
                    <el-table-column
                      prop="sql"
                      :label="t('settings.sql.fragment')"
                      min-width="220"
                      show-overflow-tooltip
                    >
                      <template #default="{ row }">
                        <code class="sql-code-snippet">{{ row.sql }}</code>
                      </template>
                    </el-table-column>
                    <el-table-column
                      prop="error"
                      :label="t('settings.sql.error')"
                      min-width="220"
                      show-overflow-tooltip
                    >
                      <template #default="{ row }">
                        <span class="text-danger">{{ row.error }}</span>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
                <!-- 分页器 -->
                <div class="ops-pagination-wrapper">
                  <el-pagination
                    v-model:current-page="errorPagination.page"
                    v-model:page-size="errorPagination.pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="jobResult.errors.length"
                    layout="total, sizes, prev, pager, next, jumper"
                    background
                    @size-change="errorPagination.page = 1"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="ops-page-layout ops-page-layout--page-scroll">
    <div class="ops-section mb-0">
      <div
        class="ops-section__content"
        style="display: flex; align-items: center; justify-content: center; min-height: 400px"
      >
        <el-empty :description="t('settings.sql.noAccess')" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { t, i18n, currentLocale } from '@/core/i18n'
import { I18nT } from 'vue-i18n'
import { message as localMessage, messageRef } from '@/core/i18n/feedback'
import { computed, onBeforeUnmount, onActivated, onDeactivated, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  Refresh,
  Delete,
  VideoPlay,
  Loading,
  Setting,
  Warning
} from '@element-plus/icons-vue'
import { yumRepoApi } from '@/modules/yum-repo/api'
import {
  formatDateTime,
  getSqlImportStatusLabel,
  getSqlImportStatusTagType,
  isSqlImportRunning,
  normalizeSqlImportJobResult,
  unwrapResponse
} from '@/modules/yum-repo/utils'
import { authService } from '@/core/auth'

const isAdmin = computed(() => authService.hasPermission('admin'))
const submitting = ref(false)
const refreshing = ref(false)
const readError = messageRef('')
const currentJobId = ref('')
const jobResult = ref(null)

const form = reactive({
  async: true,
  continueOnError: false,
  dryRun: false,
  serverFile: ''
})

// 失败明细分页状态
const errorPagination = ref({
  page: 1,
  pageSize: 10
})

// 分页后的错误明细
const paginatedErrors = computed(() => {
  if (!jobResult.value || !jobResult.value.errors) return []
  const start = (errorPagination.value.page - 1) * errorPagination.value.pageSize
  const end = start + errorPagination.value.pageSize
  return jobResult.value.errors.slice(start, end)
})

let pollTimer = 0
let active = true
let disposed = false
let readRequestId = 0

const submitDisabled = computed(() => {
  return !String(form.serverFile || '').trim()
})

function stopPolling() {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = 0
  }
}

function schedulePolling(jobId = currentJobId.value) {
  stopPolling()

  if (
    !active ||
    disposed ||
    submitting.value ||
    !jobId ||
    jobId !== currentJobId.value ||
    !isSqlImportRunning(jobResult.value)
  ) {
    return
  }

  pollTimer = window.setTimeout(() => {
    refreshJobResult(jobId, { silent: true })
  }, 3000)
}

function buildExecuteOptions() {
  return {
    async: form.async,
    continueOnError: form.continueOnError,
    dryRun: form.dryRun
  }
}

function applyJobResponse(responseData, options = {}) {
  const result = normalizeSqlImportJobResult(responseData)
  for (const field of ['elapsedMs', 'totalStatements', 'failedStatements']) {
    const value = responseData?.[field]
    if (
      value == null ||
      String(value).trim() === '' ||
      !['number', 'string'].includes(typeof value)
    )
      result[field] = null
  }
  const sameJob = currentJobId.value === result.jobId
  jobResult.value = result
  currentJobId.value = result.jobId
  readError.value = ''

  // 同一任务刷新保留正在阅读的错误页，新任务回首页；缩量约束到有效页。
  errorPagination.value.page = sameJob
    ? Math.min(
        errorPagination.value.page,
        Math.max(1, Math.ceil(result.errors.length / errorPagination.value.pageSize))
      )
    : 1

  if (isSqlImportRunning(result)) {
    schedulePolling(result.jobId)
  } else {
    stopPolling()
  }

  const failed = result.status === 'FAILED'
  const fallback = failed
    ? t('settings.sql.failed')
    : result.status === 'SUCCESS'
      ? t('settings.sql.completed')
      : options.fallbackMessage || ''
  const message = result.message || fallback
  if (active && options.notify !== false && message) {
    if (failed) ElMessage.error(message)
    else ElMessage.info(message)
  }
}

function clearFileSelection() {
  form.serverFile = ''
}

async function handleSubmit() {
  if (disposed || !active || !isAdmin.value || submitting.value || submitDisabled.value) {
    return
  }

  await submitServerFile()
}

async function submitServerFile() {
  stopPolling()
  readRequestId += 1
  refreshing.value = false
  submitting.value = true
  try {
    const response = await yumRepoApi.runSqlServerFile({
      file: form.serverFile,
      ...buildExecuteOptions()
    })
    if (disposed) return
    applyJobResponse(unwrapResponse(response), {
      fallbackMessage: form.async ? t('settings.sql.accepted') : t('settings.sql.completed')
    })
  } catch (error) {
    if (disposed) return
    console.error('执行服务器 SQL 文件失败:', error)
    if (active) ElMessage.error(resolveRequestError(error, t('settings.sql.executeFailed')))
  } finally {
    if (!disposed) {
      submitting.value = false
      schedulePolling()
    }
  }
}

async function refreshJobResult(jobId = currentJobId.value, options = {}) {
  const normalizedJobId = String(jobId ?? '').trim()
  if (
    !active ||
    disposed ||
    !isAdmin.value ||
    submitting.value ||
    !normalizedJobId ||
    normalizedJobId !== currentJobId.value
  ) {
    return
  }

  stopPolling()
  const request = ++readRequestId
  refreshing.value = true
  try {
    const response = await yumRepoApi.getSqlImportResult(normalizedJobId)
    if (!active || disposed || request !== readRequestId || normalizedJobId !== currentJobId.value)
      return
    applyJobResponse(unwrapResponse(response), { notify: !options.silent })
  } catch (error) {
    if (!active || disposed || request !== readRequestId || normalizedJobId !== currentJobId.value)
      return
    const status = error?.response?.status
    const isFatal =
      status === 404 ||
      status === 403 ||
      status === 401 ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    const retrying = options.silent && !isFatal && isSqlImportRunning(jobResult.value)
    readError.value = localMessage(retrying ? 'settings.sql.retryingFailure' : 'settings.sql.staleFailure', () => ({
      reason: resolveRequestError(error, t('settings.sql.readFailed'))
    }))

    if (options.silent && !isFatal) {
      schedulePolling(normalizedJobId)
    } else {
      stopPolling()
    }
    if (!options.silent || isFatal) {
      console.error('查询 SQL 导入结果失败:', error)
      ElMessage.error(resolveRequestError(error, t('settings.sql.readFailed')))
    }
  } finally {
    if (active && !disposed && request === readRequestId) refreshing.value = false
  }
}

async function refreshCurrentJob() {
  if (!currentJobId.value) {
    return
  }

  await refreshJobResult(currentJobId.value)
}

function resolveRequestError(error, fallback) {
  const message = String(error?.response?.data?.message || error?.message || '').trim()
  return message || fallback
}

function formatElapsed(value) {
  if (value == null || String(value).trim() === '') return '-'
  const elapsedMs = Number(value)
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return '-'

  if (elapsedMs < 1000) {
    return `${elapsedMs} ms`
  }

  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

function formatResultTime(value) {
  if (value == null || value === '' || Number.isNaN(new Date(value).getTime())) return '-'
  return formatDateTime(new Date(value))
}

const resultNumberFormatter = computed(() => new Intl.NumberFormat(currentLocale.value))
function formatNumber(value) {
  if (value == null || String(value).trim() === '') return '-'
  const number = Number(value)
  return Number.isFinite(number) && number >= 0
    ? resultNumberFormatter.value.format(number)
    : '-'
}

function describeOptions(result) {
  const labels = []
  labels.push(result.dryRun ? t('settings.sql.parseOnly') : t('settings.sql.formal'))
  labels.push(result.continueOnError ? t('settings.sql.continue') : t('settings.sql.stop'))
  return labels.join(' / ')
}

function pauseReading() {
  active = false
  readRequestId += 1
  if (refreshing.value) readError.value = localMessage('settings.sql.paused')
  refreshing.value = false
  stopPolling()
}
onDeactivated(pauseReading)
onActivated(() => {
  if (active) return
  active = true
  if (currentJobId.value && !submitting.value)
    refreshJobResult(currentJobId.value, { silent: true })
})
onBeforeUnmount(() => {
  disposed = true
  pauseReading()
})
</script>

<style scoped lang="scss">
.ssc-sql-import-page {
  min-width: 0;
}

.yum-sql-import-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 20px;
}

.yum-sql-import-panel__grid {
  display: grid;
  grid-template-columns: minmax(420px, 500px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.yum-sql-import-panel__card {
  min-width: 0;
}

.yum-sql-import-panel__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100%;
}

.yum-sql-import-panel__form-section {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  transition: background 0.3s;
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  padding-bottom: 8px;
}

.section-icon {
  font-size: 16px;
}

.yum-sql-import-panel__tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);

  code {
    font-family: Consolas, Monaco, monospace;
    background-color: var(--el-fill-color-light);
    padding: 2px 4px;
    border-radius: 4px;
    color: var(--el-color-primary);
  }
}

.yum-sql-import-panel__option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.yum-sql-import-panel__actions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.yum-sql-import-panel__action-main {
  width: 100%;
  font-weight: 600;
  letter-spacing: 1px;
}

.yum-sql-import-panel__secondary-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.action-btn {
  flex: 1;
}

.result-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.yum-sql-import-panel__empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 480px;
}

.yum-sql-import-panel__result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.yum-sql-import-panel__running-hint {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: var(--el-color-warning);
  font-weight: 500;

  .is-loading {
    margin-right: 6px;
  }
}

.yum-sql-import-panel__descriptions {
  margin-bottom: 20px;
}

.descriptions-label {
  white-space: nowrap;
  font-weight: 600;
}

.text-semibold {
  font-weight: 550;
}

.text-bold {
  font-weight: 600;
}

.text-primary {
  color: var(--el-color-primary);
}

.text-success {
  color: var(--el-color-success);
}

.text-danger {
  color: var(--el-color-danger);
}

.flat-table {
  width: 100%;
}

.sql-code-snippet {
  font-family: Consolas, Monaco, monospace;
  background: var(--el-fill-color-lighter);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.yum-sql-import-panel__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}

.yum-sql-import-panel__section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

@media (max-width: 1120px) {
  .yum-sql-import-panel__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .yum-sql-import-panel__grid {
    gap: 16px;
  }

  .yum-sql-import-panel__form-section {
    padding: 14px;
  }

  .yum-sql-import-panel__secondary-actions {
    flex-direction: column;
  }

  .yum-sql-import-panel__empty-state {
    min-height: 320px;
  }
}
</style>
