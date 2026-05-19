<template>
  <div class="automation-workbench ops-page-layout">
    <!-- <div class="ops-action-bar workbench-toolbar">
      <span style="flex: 1" />
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="refreshAll" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div> -->

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
  --workbench-panel-bg: #ffffff;
  --workbench-panel-border: #e2e8f0;
  --workbench-panel-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 6px 20px -6px rgba(0, 0, 0, 0.07);
  --workbench-card-bg: #f8fafc;
  --workbench-card-border: #e2e8f0;
  --workbench-card-hover-border: rgba(13, 148, 136, 0.5);
  --workbench-card-hover-shadow: 0 8px 24px -6px rgba(13, 148, 136, 0.2);
  --workbench-muted-bg: #f1f5f9;
  --workbench-surface-line: #e2e8f0;
  --workbench-info: #3b82f6;
  --workbench-accent: #0d9488;
  --workbench-danger: #ef4444;
  --workbench-warning: #f59e0b;
  --workbench-success: #10b981;
  --workbench-danger-pill-bg: rgba(254, 226, 226, 0.9);
  --summary-bg-opacity: 0.8;

  gap: 12px;
  position: relative;
  padding: 16px;
  background:
    radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.08), transparent 40%),
    radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.08), transparent 40%),
    var(--el-bg-color-page);
  min-height: 100%;
}

.workbench-toolbar {
  margin-bottom: 0;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.workbench-toolbar :deep(.toolbar-icon-btn) {
  border-color: var(--workbench-panel-border);
  background: var(--workbench-panel-bg);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  &:hover {
    transform: rotate(90deg) scale(1.1);
    color: var(--workbench-accent);
    border-color: var(--workbench-accent);
  }
}

.workbench-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.summary-card {
  --summary-accent: var(--workbench-info);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 96px;
  padding: 14px 16px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--summary-bg, var(--workbench-panel-bg));
  backdrop-filter: blur(12px);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.4s ease both;
}

.summary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.summary-card::after {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: var(--summary-accent);
  opacity: 0.8;
  transition: height 0.2s ease;
}

.summary-card:hover {
  border-color: var(--workbench-card-hover-border);
  box-shadow: var(--workbench-card-hover-shadow);
  transform: translateY(-3px);
}

.summary-card:hover::before {
  opacity: 1;
}

.summary-card:hover::after {
  height: 6px;
}

.summary-card--accent { --summary-accent: var(--workbench-accent); }
.summary-card--danger { --summary-accent: var(--workbench-danger); }
.summary-card--warning { --summary-accent: var(--workbench-warning); }
.summary-card--success { --summary-accent: var(--workbench-success); }
.summary-card--default { --summary-accent: var(--el-text-color-secondary); }

.summary-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.summary-card__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.summary-card__badge {
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--workbench-muted-bg);
  font-size: 11px;
  font-weight: 600;
  color: var(--summary-accent);
  border: 1px solid rgba(0,0,0,0.05);
}

.summary-card__body {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.summary-card__value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.summary-card__meta {
  font-size: 12px;
  font-weight: 500;
  color: var(--summary-accent);
  opacity: 0.8;
}

.workbench-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr);
  gap: 12px;
}

.workbench-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
  border: 1px solid var(--workbench-panel-border);
  border-radius: 20px;
  background: var(--workbench-panel-bg);
  backdrop-filter: blur(12px);
  box-shadow: var(--workbench-panel-shadow);
  animation: fadeInUp 0.5s ease both;
}

.workbench-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.workbench-panel__header-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workbench-panel__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.workbench-panel__pill {
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--workbench-muted-bg);
  font-size: 12px;
  font-weight: 600;
  color: var(--workbench-accent);
  border: 1px solid var(--workbench-panel-border);
}

.workbench-panel__pill--danger {
  background: var(--workbench-danger-pill-bg);
  color: var(--workbench-danger);
  border-color: rgba(239, 68, 68, 0.2);
}

.job-type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.job-type-card {
  --job-accent: var(--workbench-accent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--job-bg, var(--workbench-card-bg));
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.job-type-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--job-accent);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.job-type-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--workbench-card-hover-shadow);
  border-color: var(--workbench-card-hover-border);
}

.job-type-card:hover::before {
  opacity: 1;
}

.job-type-card--rest { --job-accent: #0ea5e9; }
.job-type-card--command { --job-accent: #8b5cf6; }
.job-type-card--script { --job-accent: #f59e0b; }

.job-type-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.job-type-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--job-accent);
}

.trend-strip {
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--workbench-card-bg);
}

.trend-strip__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 4px;
  border-radius: 10px;
  background: transparent;
  transition: background 0.3s ease;
}

.trend-strip__item:hover {
  background: var(--workbench-muted-bg);
}

.trend-strip__bar-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  flex: 1;
  min-height: 50px;
}

.trend-strip__bar {
  width: 24px;
  border-radius: 6px;
  background: linear-gradient(180deg, var(--workbench-accent), rgba(20, 184, 166, 0.4));
  box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.trend-strip__value {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.trend-strip__date {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.cron-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.cron-summary-card {
  --cron-accent: var(--workbench-info);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 16px;
  background: var(--cron-bg, var(--workbench-card-bg));
  text-align: center;
}

.cron-summary-card--total { --cron-accent: var(--workbench-info); }
.cron-summary-card--enabled { --cron-accent: var(--workbench-success); }
.cron-summary-card--disabled { --cron-accent: var(--workbench-warning); }

.cron-summary-card__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.cron-summary-card__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--cron-accent);
}

.cron-list,
.run-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.cron-list__item,
.run-list__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--workbench-card-border);
  border-radius: 12px;
  background: var(--workbench-card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.cron-list__item::before,
.run-list__item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--workbench-info);
}

.cron-list__item--enabled::before { background: var(--workbench-success); }
.run-list__item::before { background: var(--workbench-danger); }

.cron-list__item:hover,
.run-list__item:hover {
  transform: translateX(4px);
  border-color: var(--workbench-card-hover-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.cron-list__content,
.run-list__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cron-list__title,
.run-list__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: left;
}

.cron-list__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: left;
}

.run-list__meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.run-list__tail {
  display: flex;
  align-items: center;
  gap: 12px;
}

.run-list__user {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.failed-summary-grid {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.failed-summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 12px;
  background: var(--workbench-card-bg);
  border: 1px solid var(--workbench-card-border);
}

.failed-summary-card__label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.failed-summary-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--workbench-info);
}

.failed-summary-card--danger .failed-summary-card__value {
  color: var(--workbench-danger);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-card:nth-child(1) { animation-delay: 0s; }
.summary-card:nth-child(2) { animation-delay: 0.05s; }
.summary-card:nth-child(3) { animation-delay: 0.1s; }
.summary-card:nth-child(4) { animation-delay: 0.15s; }
.summary-card:nth-child(5) { animation-delay: 0.2s; }
.summary-card:nth-child(6) { animation-delay: 0.25s; }

.workbench-main-grid .workbench-panel:nth-child(2) {
  animation-delay: 0.1s;
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
