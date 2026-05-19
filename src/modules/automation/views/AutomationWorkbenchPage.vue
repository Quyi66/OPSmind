<template>
  <div class="automation-workbench ops-page-layout">
    <div class="ops-action-bar workbench-toolbar">
      <span style="flex: 1" />
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="refreshAll" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div v-if="summaryCards.length" class="workbench-summary-grid">
      <button
        v-for="card in summaryCards"
        :key="card.key"
        type="button"
        class="summary-card"
        :class="[`summary-card--${card.tone || 'default'}`]"
        @click="handleNavigate(card.to)"
      >
        <div class="summary-card__head">
          <span class="summary-card__label">{{ card.label }}</span>
          <span v-if="card.badge" class="summary-card__badge">{{ card.badge }}</span>
        </div>
        <div class="summary-card__body">
          <strong class="summary-card__value">{{ card.value }}</strong>
          <span v-if="card.meta" class="summary-card__meta">{{ card.meta }}</span>
        </div>
      </button>
    </div>

    <div class="workbench-main-grid">
      <section v-if="canViewJobs" class="workbench-panel workbench-panel--wide">
        <div class="workbench-panel__header">
          <div class="workbench-panel__header-main">
            <h3 class="workbench-panel__title">作业概况</h3>
            <span class="workbench-panel__pill">近7天</span>
          </div>
          <el-button link type="primary" @click="handleNavigate('/run-records/logs')">运行记录</el-button>
        </div>

        <div class="job-type-grid">
          <button
            v-for="item in jobTypeTotals"
            :key="item.key"
            type="button"
            class="job-type-card"
            :class="`job-type-card--${item.key}`"
            @click="handleOpenJobType(item.type)"
          >
            <span class="job-type-card__label">{{ item.label }}</span>
            <strong class="job-type-card__value">{{ item.value }}</strong>
          </button>
        </div>

        <div class="trend-strip">
          <div
            v-for="item in trendRows"
            :key="item.date"
            class="trend-strip__item"
            :title="`${item.date} · ${item.total}`"
          >
            <span class="trend-strip__bar-wrap">
              <span class="trend-strip__bar" :style="{ height: `${item.ratio}%` }" />
            </span>
            <span class="trend-strip__value">{{ item.total }}</span>
            <span class="trend-strip__date">{{ item.date }}</span>
          </div>
        </div>
      </section>

      <section v-if="canViewJobs" class="workbench-panel">
        <div class="workbench-panel__header">
          <div class="workbench-panel__header-main">
            <h3 class="workbench-panel__title">定时任务</h3>
            <span class="workbench-panel__pill">{{ cronSummary.total ? `启用率 ${cronEnabledRate}%` : '暂无数据' }}</span>
          </div>
          <el-button link type="primary" @click="handleNavigate('/jao/taskScheduler')">任务列表</el-button>
        </div>

        <div class="cron-summary-grid">
          <div class="cron-summary-card cron-summary-card--total">
            <span class="cron-summary-card__label">总数</span>
            <strong class="cron-summary-card__value">{{ cronSummary.total }}</strong>
          </div>
          <div class="cron-summary-card cron-summary-card--enabled">
            <span class="cron-summary-card__label">已启用</span>
            <strong class="cron-summary-card__value">{{ cronSummary.enabled }}</strong>
          </div>
          <div class="cron-summary-card cron-summary-card--disabled">
            <span class="cron-summary-card__label">已停用</span>
            <strong class="cron-summary-card__value">{{ cronSummary.disabled }}</strong>
          </div>
        </div>

        <div v-if="highlightedCronJobs.length" class="cron-list">
          <button
            v-for="item in highlightedCronJobs"
            :key="item.id"
            type="button"
            class="cron-list__item"
            :class="{ 'cron-list__item--enabled': item.triggerStatus === '1' }"
            @click="handleNavigate('/jao/taskScheduler')"
          >
            <div class="cron-list__content">
              <strong class="cron-list__title">{{ item.jobDesc || `任务 ${item.id}` }}</strong>
              <span class="cron-list__meta">{{ item.scheduleConf || '-' }}</span>
            </div>
            <el-tag size="small" :type="item.triggerStatus === '1' ? 'success' : 'danger'" effect="plain">
              {{ item.triggerStatus === '1' ? '已启用' : '已停用' }}
            </el-tag>
          </button>
        </div>
        <el-empty v-else description="暂无任务" :image-size="72" />
      </section>
    </div>

    <section v-if="canViewJobs" class="workbench-panel">
      <div class="workbench-panel__header">
        <div class="workbench-panel__header-main">
          <h3 class="workbench-panel__title">今日失败运行</h3>
          <span class="workbench-panel__pill workbench-panel__pill--danger">
            {{ failedRunTotal ? `${failedRunTotal} 条失败` : '运行正常' }}
          </span>
        </div>
        <el-button link type="primary" @click="handleOpenFailedRuns">失败日志</el-button>
      </div>

      <div class="failed-summary-grid">
        <div class="failed-summary-card">
          <span class="failed-summary-card__label">今日运行</span>
          <strong class="failed-summary-card__value">{{ todayRunTotal }}</strong>
        </div>
        <div class="failed-summary-card failed-summary-card--danger">
          <span class="failed-summary-card__label">今日失败</span>
          <strong class="failed-summary-card__value">{{ failedRunTotal }}</strong>
        </div>
      </div>

      <div v-if="recentFailedRuns.length" class="run-list">
        <button
          v-for="item in recentFailedRuns"
          :key="item.id"
          type="button"
          class="run-list__item"
          @click="handleOpenRunResult(item)"
        >
          <div class="run-list__content">
            <strong class="run-list__title">{{ translateText(item.job_title) || '-' }}</strong>
            <span class="run-list__meta">{{ formatDateTime(item.start_time) }}</span>
          </div>
          <div class="run-list__tail">
            <span class="run-list__user">{{ item.username || '-' }}</span>
            <el-tag size="small" type="danger" effect="plain">失败</el-tag>
          </div>
        </button>
      </div>
      <el-empty v-else description="今日暂无失败运行" :image-size="72" />
    </section>

    <ExecuteResultDialog
      v-if="resultDialogVisible"
      v-model:visible="resultDialogVisible"
      :run-id="resultMeta.runId"
      :job-title="resultMeta.jobTitle"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { authService } from '@/core/auth'
import { canAccessMenuCode } from '@/core/auth/permission-policy'
import { translateText } from '@/utils/i18n'
import ExecuteResultDialog from '@/modules/automation/components/job/JobListView/ExecuteResultDialog.vue'
import { useAutomationWorkbench } from '@/modules/automation/composables/useAutomationWorkbench.js'

const router = useRouter()

const checkPermission = permission => authService.hasPermission(permission)
const canViewJobs = canAccessMenuCode(checkPermission, 'jao')
const canViewCommands = canAccessMenuCode(checkPermission, 'cmd')
const canViewScripts = canAccessMenuCode(checkPermission, 'gfs')

const {
  loading,
  reviewStore,
  todayRunTotal,
  failedRunTotal,
  recentFailedRuns,
  jobTypeTotals,
  trendRows,
  cronSummary,
  highlightedCronJobs,
  refreshAll
} = useAutomationWorkbench({ canViewJobs })

const resultDialogVisible = ref(false)
const resultMeta = ref({ runId: '', jobTitle: '' })

const cronEnabledRate = computed(() => {
  const total = cronSummary.value.total || 0
  if (!total) {
    return 0
  }

  return Math.round((cronSummary.value.enabled / total) * 100)
})

const summaryCards = computed(() => [
  canViewJobs
    ? {
        key: 'todayRuns',
        label: '今日运行',
        value: todayRunTotal.value,
        to: '/run-records/logs?day=0',
        tone: 'accent',
        badge: '今日',
        meta: '运行记录'
      }
    : null,
  canViewJobs
    ? {
        key: 'failedRuns',
        label: '今日失败',
        value: failedRunTotal.value,
        to: '/run-records/logs?day=0&status=FAILED',
        tone: 'danger',
        badge: '风险',
        meta: '失败日志'
      }
    : null,
  canViewJobs
    ? {
        key: 'enabledCron',
        label: '已启用定时',
        value: cronSummary.value.enabled,
        to: '/jao/taskScheduler',
        tone: 'success',
        badge: '活跃',
        meta: '任务列表'
      }
    : null,
  canViewJobs
    ? {
        key: 'approvals',
        label: '作业待审批',
        value: reviewStore.approvalCount,
        to: '/jao/approvals',
        tone: 'default',
        badge: '待办',
        meta: '作业审批'
      }
    : null,
  canViewCommands
    ? {
        key: 'commandReview',
        label: '命令待审核',
        value: reviewStore.commandCount,
        to: '/cmd/review',
        tone: 'default',
        badge: '待办',
        meta: '命令审核'
      }
    : null,
  canViewScripts
    ? {
        key: 'scriptReview',
        label: '脚本待审核',
        value: reviewStore.scriptCount,
        to: '/gfs/scriptReview',
        tone: 'default',
        badge: '待办',
        meta: '脚本审核'
      }
    : null
].filter(Boolean))

function handleNavigate(target) {
  if (!target) {
    return
  }

  router.push(target)
}

function handleOpenFailedRuns() {
  handleNavigate('/run-records/logs?day=0&status=FAILED')
}

function handleOpenJobType(type) {
  handleNavigate(`/run-records/logs?day=365&type=${type}`)
}

function handleOpenRunResult(item) {
  resultMeta.value = {
    runId: item?.id || '',
    jobTitle: translateText(item?.job_title) || '-'
  }
  resultDialogVisible.value = true
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const pad = number => (number < 10 ? `0${number}` : String(number))

  return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped lang="scss">
.automation-workbench {
  --workbench-panel-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.9));
  --workbench-panel-border: rgba(148, 163, 184, 0.16);
  --workbench-panel-shadow: 0 18px 34px rgba(15, 23, 42, 0.06);
  --workbench-card-bg: rgba(255, 255, 255, 0.92);
  --workbench-card-border: rgba(148, 163, 184, 0.16);
  --workbench-card-hover-border: rgba(15, 118, 110, 0.34);
  --workbench-card-hover-shadow: 0 18px 28px rgba(15, 118, 110, 0.1);
  --workbench-muted-bg: rgba(241, 245, 249, 0.78);
  --workbench-surface-line: rgba(255, 255, 255, 0.56);
  --workbench-info: #2563eb;
  --workbench-info-soft: rgba(59, 130, 246, 0.12);
  --workbench-accent: #0f766e;
  --workbench-accent-soft: rgba(20, 184, 166, 0.18);
  --workbench-danger: #dc2626;
  --workbench-danger-soft: rgba(248, 113, 113, 0.14);
  --workbench-warning: #d97706;
  --workbench-warning-soft: rgba(245, 158, 11, 0.14);
  --workbench-success: #059669;
  --workbench-success-soft: rgba(16, 185, 129, 0.14);
  --workbench-danger-pill-bg: rgba(254, 226, 226, 0.72);
  --workbench-metric-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(241, 245, 249, 0.78));
  --workbench-metric-danger-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(254, 226, 226, 0.78));
  gap: 14px;
  position: relative;
  padding-bottom: 4px;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 24%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.1), transparent 22%),
    transparent;
}

.workbench-toolbar {
  margin-bottom: 0;
}

.workbench-toolbar :deep(.toolbar-icon-btn) {
  border-color: var(--workbench-card-border);
  background: var(--workbench-card-bg);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.workbench-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(164px, 1fr));
  gap: 14px;
}

.summary-card {
  --summary-accent: var(--workbench-info);
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 252, 0.9));
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 118px;
  padding: 16px 16px 18px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 20px;
  background: var(--summary-bg);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.summary-card::after {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--summary-accent), rgba(255, 255, 255, 0));
  opacity: 0.88;
}

.summary-card:hover {
  border-color: var(--workbench-card-hover-border);
  box-shadow: var(--workbench-card-hover-shadow);
  transform: translateY(-3px);
}

.summary-card--accent {
  --summary-accent: var(--workbench-accent);
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 250, 0.92));
}

.summary-card--danger {
  --summary-accent: var(--workbench-danger);
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(254, 242, 242, 0.92));
}

.summary-card--warning {
  --summary-accent: var(--workbench-warning);
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 237, 0.92));
}

.summary-card--success {
  --summary-accent: var(--workbench-success);
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 245, 0.92));
}

.summary-card--default {
  --summary-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.9));
}

.summary-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.summary-card__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--el-text-color-secondary);
}

.summary-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 999px;
  background: var(--workbench-muted-bg);
  font-size: 11px;
  font-weight: 600;
  color: var(--summary-accent);
}

.summary-card__body {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.summary-card__value {
  font-size: 30px;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.summary-card__meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--summary-accent);
}

.summary-card--accent .summary-card__value {
  color: var(--workbench-accent);
}

.summary-card--danger .summary-card__value {
  color: var(--workbench-danger);
}

.summary-card--warning .summary-card__value {
  color: var(--workbench-warning);
}

.summary-card--success .summary-card__value {
  color: var(--workbench-success);
}

.workbench-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 14px;
}

.workbench-panel {
  position: relative;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--workbench-panel-border);
  border-radius: 22px;
  background: var(--workbench-panel-bg);
  box-shadow: var(--workbench-panel-shadow);
  overflow: hidden;
}

.workbench-panel::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, var(--workbench-surface-line), transparent);
}

.workbench-panel--wide {
  min-width: 0;
}

.workbench-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workbench-panel__header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.workbench-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--el-text-color-primary);
}

.workbench-panel__pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 999px;
  background: var(--workbench-muted-bg);
  font-size: 11px;
  font-weight: 600;
  color: var(--workbench-accent);
}

.workbench-panel__pill--danger {
  background: var(--workbench-danger-pill-bg);
  color: var(--workbench-danger);
}

.job-type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.job-type-card {
  --job-accent: var(--workbench-accent);
  --job-bg: linear-gradient(160deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 252, 0.88));
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-height: 116px;
  padding: 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 18px;
  background: var(--job-bg);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.job-type-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: linear-gradient(90deg, var(--job-accent), rgba(255, 255, 255, 0));
}

.job-type-card:hover {
  border-color: var(--workbench-card-hover-border);
  box-shadow: var(--workbench-card-hover-shadow);
  transform: translateY(-2px);
}

.job-type-card--rest {
  --job-accent: #0284c7;
  --job-bg: linear-gradient(160deg, rgba(240, 249, 255, 0.96), rgba(224, 242, 254, 0.78));
}

.job-type-card--command {
  --job-accent: #7c3aed;
  --job-bg: linear-gradient(160deg, rgba(245, 243, 255, 0.96), rgba(237, 233, 254, 0.82));
}

.job-type-card--script {
  --job-accent: #d97706;
  --job-bg: linear-gradient(160deg, rgba(255, 247, 237, 0.96), rgba(254, 243, 199, 0.86));
}

.job-type-card__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.job-type-card__value {
  font-size: 28px;
  line-height: 1;
  color: var(--job-accent);
}

.trend-strip {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(241, 245, 249, 0.72));
}

.trend-strip__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-height: 160px;
  padding: 12px 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.58);
}

.trend-strip__bar-wrap {
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 88px;
  padding: 0 10px;
}

.trend-strip__bar {
  width: 100%;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.92), rgba(20, 184, 166, 0.54));
  box-shadow: 0 12px 20px rgba(15, 118, 110, 0.18);
}

.trend-strip__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.trend-strip__date {
  padding: 3px 8px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 999px;
  background: var(--workbench-muted-bg);
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.cron-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.cron-summary-card {
  --cron-accent: var(--workbench-info);
  --cron-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 252, 0.9));
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 96px;
  padding: 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 18px;
  background: var(--cron-bg);
  overflow: hidden;
}

.cron-summary-card--total {
  --cron-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.9));
}

.cron-summary-card--enabled {
  --cron-accent: var(--workbench-success);
  --cron-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(236, 253, 245, 0.9));
}

.cron-summary-card--disabled {
  --cron-accent: var(--workbench-warning);
  --cron-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 237, 0.9));
}

.cron-summary-card__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.cron-summary-card__value {
  font-size: 24px;
  line-height: 1;
  color: var(--cron-accent);
}

.cron-list,
.run-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cron-list__item,
.run-list__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 14px 18px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 18px;
  background: var(--workbench-card-bg);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.cron-list__item::before,
.run-list__item::before {
  content: '';
  position: absolute;
  inset: 14px auto 14px 0;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--workbench-accent), rgba(15, 118, 110, 0.15));
}

.cron-list__item--enabled::before {
  background: linear-gradient(180deg, var(--workbench-success), rgba(16, 185, 129, 0.18));
}

.run-list__item::before {
  background: linear-gradient(180deg, var(--workbench-danger), rgba(248, 113, 113, 0.18));
}

.cron-list__item:hover,
.run-list__item:hover {
  border-color: var(--workbench-card-hover-border);
  box-shadow: var(--workbench-card-hover-shadow);
  transform: translateY(-1px);
}

.cron-list__content,
.run-list__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cron-list__title,
.run-list__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.cron-list__meta {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  width: fit-content;
  padding: 4px 10px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 999px;
  background: var(--workbench-muted-bg);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-list__meta,
.run-list__user {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.run-list__tail {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.failed-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.failed-summary-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 104px;
  padding: 16px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 18px;
  background: var(--workbench-metric-bg);
  overflow: hidden;
}

.failed-summary-card--danger {
  background: var(--workbench-metric-danger-bg);
}

.failed-summary-card__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.failed-summary-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--workbench-info);
}

.failed-summary-card--danger .failed-summary-card__value {
  color: var(--workbench-danger);
}

@media (max-width: 1080px) {
  .workbench-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .job-type-grid,
  .cron-summary-grid,
  .failed-summary-grid {
    grid-template-columns: 1fr;
  }

  .workbench-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-card__body {
    align-items: flex-start;
    flex-direction: column;
  }

  .trend-strip {
    grid-template-columns: repeat(7, minmax(84px, 1fr));
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .cron-list__item,
  .run-list__item {
    align-items: flex-start;
    flex-direction: column;
  }

  .run-list__tail {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<style lang="scss">
html.dark .automation-workbench {
  --workbench-panel-bg: linear-gradient(180deg, rgba(20, 28, 40, 0.94), rgba(16, 23, 34, 0.9));
  --workbench-panel-border: rgba(71, 85, 105, 0.48);
  --workbench-panel-shadow: 0 22px 40px rgba(0, 0, 0, 0.26);
  --workbench-card-bg: rgba(15, 23, 42, 0.84);
  --workbench-card-border: rgba(71, 85, 105, 0.46);
  --workbench-card-hover-border: rgba(94, 234, 212, 0.36);
  --workbench-card-hover-shadow: 0 18px 30px rgba(0, 0, 0, 0.26);
  --workbench-muted-bg: rgba(30, 41, 59, 0.84);
  --workbench-surface-line: rgba(148, 163, 184, 0.16);
  --workbench-info: #60a5fa;
  --workbench-info-soft: rgba(96, 165, 250, 0.16);
  --workbench-accent: #5eead4;
  --workbench-accent-soft: rgba(45, 212, 191, 0.16);
  --workbench-danger: #f87171;
  --workbench-danger-soft: rgba(248, 113, 113, 0.18);
  --workbench-warning: #fbbf24;
  --workbench-warning-soft: rgba(251, 191, 36, 0.18);
  --workbench-success: #34d399;
  --workbench-success-soft: rgba(52, 211, 153, 0.18);
  --workbench-danger-pill-bg: rgba(127, 29, 29, 0.4);
  --workbench-metric-bg: linear-gradient(160deg, rgba(18, 28, 45, 0.92), rgba(30, 41, 59, 0.84));
  --workbench-metric-danger-bg: linear-gradient(160deg, rgba(30, 18, 24, 0.92), rgba(69, 10, 10, 0.72));
  background:
    radial-gradient(circle at top left, rgba(45, 212, 191, 0.16), transparent 24%),
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.12), transparent 24%),
    transparent;
}

html.dark .automation-workbench .toolbar-icon-btn {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
}

html.dark .automation-workbench .summary-card--default {
  --summary-bg: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(30, 41, 59, 0.84));
}

html.dark .automation-workbench .summary-card--accent {
  --summary-bg: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(6, 78, 59, 0.48));
}

html.dark .automation-workbench .summary-card--danger {
  --summary-bg: linear-gradient(180deg, rgba(30, 20, 27, 0.92), rgba(69, 10, 10, 0.58));
}

html.dark .automation-workbench .summary-card--warning {
  --summary-bg: linear-gradient(180deg, rgba(28, 24, 20, 0.92), rgba(120, 53, 15, 0.46));
}

html.dark .automation-workbench .summary-card--success {
  --summary-bg: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(6, 95, 70, 0.48));
}

html.dark .automation-workbench .job-type-card--rest {
  --job-bg: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(12, 74, 110, 0.34));
}

html.dark .automation-workbench .job-type-card--command {
  --job-bg: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(76, 29, 149, 0.34));
}

html.dark .automation-workbench .job-type-card--script {
  --job-bg: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(146, 64, 14, 0.34));
}

html.dark .automation-workbench .trend-strip {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.64), rgba(15, 23, 42, 0.42));
}

html.dark .automation-workbench .trend-strip__item {
  border-color: rgba(71, 85, 105, 0.36);
  background: rgba(15, 23, 42, 0.78);
}

html.dark .automation-workbench .trend-strip__bar {
  background: linear-gradient(180deg, rgba(45, 212, 191, 0.94), rgba(45, 212, 191, 0.36));
  box-shadow: 0 12px 20px rgba(45, 212, 191, 0.16);
}

html.dark .automation-workbench .cron-summary-card--total {
  --cron-bg: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(30, 41, 59, 0.82));
}

html.dark .automation-workbench .cron-summary-card--enabled {
  --cron-bg: linear-gradient(180deg, rgba(18, 28, 45, 0.92), rgba(6, 95, 70, 0.48));
}

html.dark .automation-workbench .cron-summary-card--disabled {
  --cron-bg: linear-gradient(180deg, rgba(28, 24, 20, 0.92), rgba(120, 53, 15, 0.46));
}

html.dark .automation-workbench .summary-card__badge,
html.dark .automation-workbench .workbench-panel__pill,
html.dark .automation-workbench .trend-strip__date,
html.dark .automation-workbench .cron-list__meta {
  border-color: rgba(71, 85, 105, 0.42);
}
</style>
