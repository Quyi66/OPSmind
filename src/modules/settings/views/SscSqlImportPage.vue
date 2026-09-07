<template>
  <div v-if="isAdmin" class="ops-page-layout ops-page-layout--page-scroll ssc-sql-import-page">
    <div class="yum-sql-import-panel">
      <div class="yum-sql-import-panel__grid">
        <!-- 左侧执行入口 -->
        <div
          class="ops-section yum-sql-import-panel__card yum-sql-import-panel__card--control mb-0"
        >
          <div class="ops-section__header">
            <span class="ops-section__title">执行入口</span>
          </div>

          <div class="ops-section__content">
            <el-form label-position="top" class="yum-sql-import-panel__form">
              <!-- 第一区块：文件配置 -->
              <div class="yum-sql-import-panel__form-section">
                <div class="form-section-title">
                  <el-icon class="section-icon"><Document /></el-icon>
                  文件选择
                </div>

                <el-form-item label="服务器文件" class="mb-0">
                  <el-input
                    v-model.trim="form.serverFile"
                    placeholder="请输入白名单目录内的相对文件名，例如 patch-data.sql.gz"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Document /></el-icon>
                    </template>
                  </el-input>
                  <div class="yum-sql-import-panel__tip mt-2">
                    文件需放置于服务器白名单目录中（未配置参数时默认：
                    <code>/opt/sjxy/assets/gfs/fs-repos</code>
                    ）。
                    <br />
                    支持相对路径，支持扩展名：
                    <code>.sql</code>
                    ,
                    <code>.sql.gz</code>
                    ,
                    <code>.gz</code>
                    ,
                    <code>.tar</code>
                    ,
                    <code>.tar.gz</code>
                    ,
                    <code>.tgz</code>
                    。
                  </div>
                </el-form-item>
              </div>

              <!-- 第二区块：执行设置 -->
              <div class="yum-sql-import-panel__form-section">
                <div class="form-section-title">
                  <el-icon class="section-icon"><Setting /></el-icon>
                  配置选项
                </div>

                <el-form-item label="附加选项" class="mb-0">
                  <div class="yum-sql-import-panel__option-group">
                    <el-checkbox v-model="form.continueOnError">遇错继续</el-checkbox>
                    <el-checkbox v-model="form.dryRun">仅解析不执行</el-checkbox>
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
                  开始执行
                </el-button>
                <div class="yum-sql-import-panel__secondary-actions">
                  <el-button
                    :disabled="!currentJobId"
                    @click="refreshCurrentJob"
                    class="action-btn"
                  >
                    <template #icon>
                      <el-icon><Refresh /></el-icon>
                    </template>
                    刷新当前任务
                  </el-button>
                  <el-button
                    :disabled="!form.serverFile"
                    @click="clearFileSelection"
                    class="action-btn"
                  >
                    <template #icon>
                      <el-icon><Delete /></el-icon>
                    </template>
                    清空输入
                  </el-button>
                </div>
              </div>
            </el-form>
          </div>
        </div>

        <!-- 右侧任务结果 -->
        <div class="ops-section yum-sql-import-panel__card yum-sql-import-panel__card--result mb-0">
          <div class="ops-section__header">
            <span class="ops-section__title">任务结果</span>
          </div>

          <div class="ops-section__content result-content-wrapper">
            <div v-if="!jobResult" class="yum-sql-import-panel__empty-state">
              <el-empty description="执行后可在这里查看进度与结果" />
            </div>

            <template v-else>
              <div class="yum-sql-import-panel__result-meta">
                <el-tag :type="getSqlImportStatusTagType(jobResult)" effect="dark" round>
                  {{ getSqlImportStatusLabel(jobResult) }}
                </el-tag>
                <span
                  v-if="isSqlImportRunning(jobResult)"
                  class="yum-sql-import-panel__running-hint"
                >
                  <el-icon class="is-loading"><Loading /></el-icon>
                  正在自动轮询任务进度...
                </span>
              </div>

              <el-descriptions
                :column="2"
                border
                class="yum-sql-import-panel__descriptions"
                label-class-name="descriptions-label"
                label-width="100"
              >
                <el-descriptions-item label="任务 ID">
                  <span>{{ jobResult.jobId || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="文件名">
                  <span class="text-semibold">{{ jobResult.fileName || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="当前条目">
                  <span class="text-semibold">{{ jobResult.currentEntry || '-' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="总语句数">
                  <span>{{ formatNumber(jobResult.totalStatements) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="失败语句数">
                  <span
                    :class="
                      jobResult.failedStatements > 0 ? 'text-danger text-bold' : 'text-success'
                    "
                  >
                    {{ formatNumber(jobResult.failedStatements) }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="耗时">
                  {{ formatElapsed(jobResult.elapsedMs) }}
                </el-descriptions-item>
                <el-descriptions-item label="开始时间">
                  {{ formatResultTime(jobResult.startTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="结束时间">
                  {{ formatResultTime(jobResult.endTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="执行参数">
                  {{ describeOptions(jobResult) }}
                </el-descriptions-item>
                <el-descriptions-item label="消息">
                  {{ jobResult.message || '-' }}
                </el-descriptions-item>
              </el-descriptions>

              <div v-if="jobResult.entries.length" class="yum-sql-import-panel__section">
                <div class="yum-sql-import-panel__section-title">
                  <el-icon class="section-icon text-primary"><Document /></el-icon>
                  分文件小结
                </div>
                <div class="ops-table-wrapper">
                  <el-table :data="jobResult.entries" size="small" class="flat-table">
                    <el-table-column
                      prop="entry"
                      label="条目"
                      min-width="220"
                      show-overflow-tooltip
                    />
                    <el-table-column prop="statements" label="语句数" width="120" align="right" />
                  </el-table>
                </div>
              </div>

              <div v-if="jobResult.errors.length" class="yum-sql-import-panel__section">
                <div class="yum-sql-import-panel__section-title">
                  <el-icon class="section-icon text-danger"><Warning /></el-icon>
                  失败明细
                  <span v-if="jobResult.errorsTruncated" class="yum-sql-import-panel__tip">
                    仅保留前 200 条
                  </span>
                </div>
                <div class="ops-table-wrapper">
                  <el-table
                    :data="paginatedErrors"
                    size="small"
                    class="flat-table natural-height-table"
                  >
                    <el-table-column prop="entry" label="条目" width="150" show-overflow-tooltip />
                    <el-table-column
                      prop="sql"
                      label="SQL 片段"
                      min-width="220"
                      show-overflow-tooltip
                    >
                      <template #default="{ row }">
                        <code class="sql-code-snippet">{{ row.sql }}</code>
                      </template>
                    </el-table-column>
                    <el-table-column
                      prop="error"
                      label="错误信息"
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
        <el-empty description="您没有权限访问此页面，仅超级管理员可使用 SQL 导入功能。" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
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

  if (!jobId || !isSqlImportRunning(jobResult.value)) {
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
  jobResult.value = result
  currentJobId.value = result.jobId

  // 重置失败明细页码
  errorPagination.value.page = 1

  if (isSqlImportRunning(result)) {
    schedulePolling(result.jobId)
  } else {
    stopPolling()
  }

  const message = result.message || options.fallbackMessage || ''
  if (options.notify !== false && message) {
    ElMessage.info(message)
  }
}

function clearFileSelection() {
  form.serverFile = ''
}

async function handleSubmit() {
  if (submitDisabled.value) {
    return
  }

  await submitServerFile()
}

async function submitServerFile() {
  submitting.value = true
  try {
    const response = await yumRepoApi.runSqlServerFile({
      file: form.serverFile,
      ...buildExecuteOptions()
    })
    applyJobResponse(unwrapResponse(response), {
      fallbackMessage: form.async ? '任务已受理，开始查询执行进度' : 'SQL 执行完成'
    })
  } catch (error) {
    console.error('执行服务器 SQL 文件失败:', error)
    ElMessage.error(resolveRequestError(error, '执行服务器 SQL 文件失败'))
  } finally {
    submitting.value = false
  }
}

async function refreshJobResult(jobId = currentJobId.value, options = {}) {
  const normalizedJobId = String(jobId || '').trim()
  if (!normalizedJobId) {
    return
  }

  try {
    const response = await yumRepoApi.getSqlImportResult(normalizedJobId)
    applyJobResponse(unwrapResponse(response), { notify: !options.silent })
  } catch (error) {
    const status = error?.response?.status
    const isFatal = status === 404 || status === 403 || status === 401

    if (options.silent && !isFatal) {
      schedulePolling(normalizedJobId)
    } else {
      stopPolling()
    }
    if (!options.silent || isFatal) {
      console.error('查询 SQL 导入结果失败:', error)
      ElMessage.error(resolveRequestError(error, '查询 SQL 导入结果失败'))
    }
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
  const elapsedMs = Number(value || 0)
  if (!elapsedMs) return '-'

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
  if (!value) return '-'
  return formatDateTime(value)
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value || 0))
}

function describeOptions(result) {
  const labels = []
  labels.push(result.dryRun ? 'dryRun' : '正式执行')
  labels.push(result.continueOnError ? '遇错继续' : '遇错即停')
  return labels.join(' / ')
}

onBeforeUnmount(() => {
  stopPolling()
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
