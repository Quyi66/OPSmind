<template>
  <section class="automation-workflow-header">
    <div class="automation-workflow-header__top">
      <div class="automation-workflow-header__content">
        <div class="automation-workflow-header__eyebrow">
          自动化管理 / {{ currentContext.moduleLabel }}
        </div>
        <div class="automation-workflow-header__title-row">
          <h1 class="automation-workflow-header__title">{{ currentContext.title }}</h1>
          <el-tag
            v-if="currentContext.tag"
            size="small"
            effect="plain"
            type="info"
          >
            {{ currentContext.tag }}
          </el-tag>
        </div>
      </div>

      <div v-if="pendingCards.length && !currentContext.hidePendingCards" class="automation-workflow-header__stats">
        <button
          v-for="card in pendingCards"
          :key="card.key"
          type="button"
          class="pending-card"
          @click="handleNavigate(card.to)"
        >
          <span class="pending-card__label">{{ card.label }}</span>
          <strong class="pending-card__value">{{ card.value }}</strong>
        </button>
      </div>
    </div>

    <div class="automation-workflow-header__groups">
      <div
        v-for="group in workflowGroups"
        :key="group.key"
        class="workflow-group"
      >
        <span class="workflow-group__label">{{ group.label }}</span>
        <div class="workflow-group__links">
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="workflow-link"
            :class="{ 'is-active': isActive(item) }"
            @click="handleNavigate(item.to)"
          >
            <i :class="item.icon" class="workflow-link__icon" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from '@/core/auth'
import { canAccessMenuCode } from '@/core/auth/permission-policy'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'

const route = useRoute()
const router = useRouter()
const reviewStore = useReviewCountStore()

const checkPermission = permission => authService.hasPermission(permission)

const currentTab = computed(() => {
  if (Array.isArray(route.query.tab)) {
    return route.query.tab[0] || ''
  }

  return String(route.query.tab || '')
})

function canAccess(menuCode) {
  return canAccessMenuCode(checkPermission, menuCode)
}

const shortcuts = computed(() => ({
  automationConfig: {
    key: 'automationConfig',
    label: '自动化配置',
    icon: 'fas fa-cogs',
    to: '/acm/automation',
    visible: canAccess('acm')
  },
  scriptLibrary: {
    key: 'scriptLibrary',
    label: '脚本库',
    icon: 'fas fa-file-code',
    to: '/gfs/scriptLibrary',
    visible: canAccess('gfs')
  },
  fileLibrary: {
    key: 'fileLibrary',
    label: '文件库',
    icon: 'fas fa-folder-open',
    to: '/gfs/fileLibrary',
    visible: canAccess('gfs')
  },
  commandWorkspace: {
    key: 'commandWorkspace',
    label: '命令列表',
    icon: 'fas fa-terminal',
    to: '/cmd/list',
    visible: canAccess('cmd'),
    match: () => route.path.startsWith('/cmd/list') && currentTab.value !== 'job'
  },
  commandJobs: {
    key: 'commandJobs',
    label: '命令作业',
    icon: 'fas fa-layer-group',
    to: '/cmd/list?tab=job',
    visible: canAccess('cmd'),
    match: () => route.path.startsWith('/cmd/list') && currentTab.value === 'job'
  },
  commandReview: {
    key: 'commandReview',
    label: '命令审核',
    icon: 'fas fa-clipboard-check',
    to: '/cmd/review',
    visible: canAccess('cmd'),
    badgeValue: reviewStore.commandCount
  },
  commandConsole: {
    key: 'commandConsole',
    label: '控制台',
    icon: 'fas fa-terminal',
    to: '/cmd/console',
    visible: canAccess('cmd')
  },
  jobList: {
    key: 'jobList',
    label: '作业列表',
    icon: 'fas fa-list-alt',
    to: '/jao/jobs',
    visible: canAccess('jao')
  },
  schedule: {
    key: 'schedule',
    label: '流程编排',
    icon: 'fas fa-network-wired',
    to: '/jao/schedule',
    visible: canAccess('jao')
  },
  taskScheduler: {
    key: 'taskScheduler',
    label: '定时任务',
    icon: 'fas fa-clock',
    to: '/jao/taskScheduler',
    visible: canAccess('jao')
  },
  requests: {
    key: 'requests',
    label: '我的申请',
    icon: 'fas fa-inbox',
    to: '/jao/requests',
    visible: canAccess('jao')
  },
  approvals: {
    key: 'approvals',
    label: '作业审批',
    icon: 'fas fa-user-check',
    to: '/jao/approvals',
    visible: canAccess('jao'),
    badgeValue: reviewStore.approvalCount
  },
  scriptReview: {
    key: 'scriptReview',
    label: '脚本审核',
    icon: 'fas fa-file-signature',
    to: '/gfs/scriptReview',
    visible: canAccess('gfs'),
    badgeValue: reviewStore.scriptCount
  },
  runLogs: {
    key: 'runLogs',
    label: '运行记录',
    icon: 'fas fa-history',
    to: '/run-records/logs',
    visible: canAccess('jao')
  },
  statistics: {
    key: 'statistics',
    label: '统计分析',
    icon: 'fas fa-chart-line',
    to: '/run-records/logs?tab=statistics',
    visible: canAccess('jao'),
    match: () => route.path.startsWith('/run-records/logs') && currentTab.value === 'statistics'
  }
}))

function pickShortcuts(keys) {
  return keys
    .map(key => shortcuts.value[key])
    .filter(item => item?.visible)
}

const contextKey = computed(() => {
  if (route.path.startsWith('/auto-workbench/overview')) return 'workbench'
  if (route.path.startsWith('/jao/jobs')) return 'jobList'
  if (route.path.startsWith('/jao/schedule')) return 'schedule'
  if (route.path.startsWith('/jao/taskScheduler')) return 'taskScheduler'
  if (route.path.startsWith('/jao/requests')) return 'requests'
  if (route.path.startsWith('/jao/approvals')) return 'approvals'
  if (route.path.startsWith('/cmd/review')) return 'commandReview'
  if (route.path.startsWith('/cmd/console')) return 'commandConsole'
  if (route.path.startsWith('/cmd/list')) {
    return currentTab.value === 'job' ? 'commandJobs' : 'commandWorkspace'
  }
  if (route.path.startsWith('/gfs/scriptLibrary')) return 'scriptLibrary'
  if (route.path.startsWith('/gfs/fileLibrary')) return 'fileLibrary'
  if (route.path.startsWith('/gfs/scriptReview')) return 'scriptReview'
  if (route.path.startsWith('/run-records/logs')) {
    return currentTab.value === 'statistics' ? 'statistics' : 'runLogs'
  }

  return 'automation'
})

const contexts = computed(() => ({
  workbench: {
    moduleLabel: '工作台',
    title: '自动化工作台',
    description: '',
    tag: '总览',
    hidePendingCards: true
  },
  automation: {
    moduleLabel: '业务工作区',
    title: '自动化业务流',
    description: '把配置准备、脚本沉淀、命令复用、作业编排、审批治理和运行回看串成一条完整链路。',
    tag: '总览'
  },
  jobList: {
    moduleLabel: '作业中心',
    title: '作业列表',
    description: '集中维护可复用作业模板，并直接串联执行、申请和历史回看。',
    tag: '执行入口'
  },
  schedule: {
    moduleLabel: '作业中心',
    title: '流程编排',
    description: '把多步骤作业编排为流程，适合需要顺序控制、参数编排和实例回看的场景。',
    tag: '编排设计'
  },
  taskScheduler: {
    moduleLabel: '作业中心',
    title: '定时任务',
    description: '把高频重复动作固定为定时执行，减少人工触发和执行遗漏。',
    tag: '定时调度'
  },
  requests: {
    moduleLabel: '作业中心',
    title: '我的申请',
    description: '统一跟踪自己发起的执行申请、有效期和审批结果，避免重复申请。',
    tag: '审批跟踪'
  },
  approvals: {
    moduleLabel: '审批中心',
    title: '作业审批',
    description: '在审批环节直接处理作业执行授权，减少作业创建人与审批人的来回确认。',
    tag: '治理闭环'
  },
  commandWorkspace: {
    moduleLabel: '命令中心',
    title: '命令列表',
    description: '先沉淀标准命令，再按场景选择临时执行或生成命令作业，减少重复维护。',
    tag: '命令沉淀'
  },
  commandJobs: {
    moduleLabel: '命令中心',
    title: '命令作业',
    description: '把复用命令固化为可审批、可回看的命令作业，适合稳定的执行场景。',
    tag: '命令复用'
  },
  commandReview: {
    moduleLabel: '审批中心',
    title: '命令审核',
    description: '集中审核新增和变更中的命令，避免未发布内容散落在编辑流程。',
    tag: '待办处理'
  },
  commandConsole: {
    moduleLabel: '命令中心',
    title: '控制台',
    description: '用于临时排障与即时验证，确认稳定后再回收为命令或命令作业。',
    tag: '临时执行'
  },
  scriptLibrary: {
    moduleLabel: '脚本中心',
    title: '脚本库',
    description: '集中管理可复用脚本，适合沉淀标准执行材料并给作业、流程直接复用。',
    tag: '材料沉淀'
  },
  fileLibrary: {
    moduleLabel: '脚本中心',
    title: '文件库',
    description: '把执行依赖文件、模板和附件集中维护，减少作业和流程里的临时拷贝。',
    tag: '执行材料'
  },
  scriptReview: {
    moduleLabel: '审批中心',
    title: '脚本审核',
    description: '把待发布脚本集中审核，避免执行材料变更绕过标准审核链路。',
    tag: '变更治理'
  },
  runLogs: {
    moduleLabel: '运行记录',
    title: '运行记录',
    description: '统一回看命令、作业和流程的执行结果，把执行闭环从入口页直接串到复盘页。',
    tag: '执行复盘'
  },
  statistics: {
    moduleLabel: '运行记录',
    title: '统计分析',
    description: '用统一统计面板观察自动化执行趋势，辅助回收低效链路和高频问题。',
    tag: '效果分析'
  }
}))

const currentContext = computed(() => contexts.value[contextKey.value] || contexts.value.automation)

const workflowGroups = computed(() => [
  {
    key: 'prepare',
    label: '准备',
    items: pickShortcuts(['automationConfig', 'scriptLibrary', 'fileLibrary'])
  },
  {
    key: 'execute',
    label: '执行',
    items: pickShortcuts(['commandWorkspace', 'commandJobs', 'jobList', 'schedule', 'taskScheduler'])
  },
  {
    key: 'govern',
    label: '治理与回看',
    items: pickShortcuts(['requests', 'approvals', 'commandReview', 'scriptReview', 'runLogs'])
  }
].filter(group => group.items.length > 0))

const pendingCards = computed(() => [
  {
    key: 'approvals',
    label: '作业待审批',
    value: reviewStore.approvalCount,
    to: '/jao/approvals',
    visible: canAccess('jao')
  },
  {
    key: 'commandReview',
    label: '命令待审核',
    value: reviewStore.commandCount,
    to: '/cmd/review',
    visible: canAccess('cmd')
  },
  {
    key: 'scriptReview',
    label: '脚本待审核',
    value: reviewStore.scriptCount,
    to: '/gfs/scriptReview',
    visible: canAccess('gfs')
  }
].filter(item => item.visible && item.value > 0))

function isActive(item) {
  if (typeof item.match === 'function') {
    return item.match()
  }

  const targetPath = String(item.to || '').split('?')[0]
  return route.path === targetPath
}

function handleNavigate(target) {
  if (!target) {
    return
  }

  const resolved = router.resolve(target)
  if (resolved.fullPath === route.fullPath) {
    return
  }

  router.push(target)
}
</script>

<style scoped lang="scss">
.automation-workflow-header {
  --automation-workflow-accent: #0f766e;
  --automation-workflow-bg-top: rgba(15, 118, 110, 0.08);
  --automation-workflow-bg-bottom: rgba(15, 118, 110, 0.02);
  --automation-workflow-card-bg: rgba(255, 255, 255, 0.86);
  --automation-workflow-card-border: rgba(15, 118, 110, 0.14);
  --automation-workflow-card-hover-border: rgba(15, 118, 110, 0.32);
  --automation-workflow-card-hover-shadow: 0 8px 20px rgba(15, 118, 110, 0.08);
  --automation-workflow-link-bg: var(--el-bg-color);
  --automation-workflow-link-border: var(--el-border-color);
  --automation-workflow-link-hover-border: rgba(15, 118, 110, 0.32);
  --automation-workflow-link-active-bg: rgba(15, 118, 110, 0.08);
  --automation-workflow-link-active-border: rgba(15, 118, 110, 0.24);
  --automation-workflow-link-active-text: var(--automation-workflow-accent);
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background:
    linear-gradient(
      180deg,
      var(--automation-workflow-bg-top) 0%,
      var(--automation-workflow-bg-bottom) 100%
    ),
    var(--el-bg-color);
}

.automation-workflow-header__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.automation-workflow-header__content {
  min-width: 280px;
  flex: 1;
}

.automation-workflow-header__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--automation-workflow-accent);
}

.automation-workflow-header__title-row {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.automation-workflow-header__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.automation-workflow-header__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 10px;
  min-width: min(100%, 360px);
}

.pending-card {
  padding: 10px 12px;
  border: 1px solid var(--automation-workflow-card-border);
  border-radius: 10px;
  background: var(--automation-workflow-card-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.pending-card:hover {
  border-color: var(--automation-workflow-card-hover-border);
  box-shadow: var(--automation-workflow-card-hover-shadow);
  transform: translateY(-1px);
}

.pending-card__label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pending-card__value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  line-height: 1;
  color: var(--automation-workflow-accent);
}

.automation-workflow-header__groups {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.workflow-group {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 0;
  flex: 1 1 320px;
}

.workflow-group__label {
  flex-shrink: 0;
  width: 68px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.workflow-group__links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.workflow-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--automation-workflow-link-border);
  border-radius: 999px;
  background: var(--automation-workflow-link-bg);
  color: var(--el-text-color-regular);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.workflow-link:hover {
  border-color: var(--automation-workflow-link-hover-border);
  color: var(--automation-workflow-accent);
}

.workflow-link.is-active {
  border-color: var(--automation-workflow-link-active-border);
  background: var(--automation-workflow-link-active-bg);
  color: var(--automation-workflow-link-active-text);
}

.workflow-link__icon {
  font-size: 12px;
}

@media (max-width: 960px) {
  .automation-workflow-header {
    padding: 16px;
  }

  .automation-workflow-header__stats {
    width: 100%;
    min-width: 0;
  }

  .workflow-group {
    flex-basis: 100%;
  }
}

@media (max-width: 640px) {
  .workflow-group {
    flex-direction: column;
    align-items: flex-start;
  }

  .workflow-group__label {
    width: auto;
  }
}
</style>

<style lang="scss">
html.dark .automation-workflow-header {
  --automation-workflow-accent: #5eead4;
  --automation-workflow-bg-top: rgba(45, 212, 191, 0.16);
  --automation-workflow-bg-bottom: rgba(45, 212, 191, 0.04);
  --automation-workflow-card-bg: linear-gradient(180deg, rgba(20, 28, 40, 0.94), rgba(16, 23, 34, 0.9));
  --automation-workflow-card-border: rgba(71, 85, 105, 0.56);
  --automation-workflow-card-hover-border: rgba(94, 234, 212, 0.4);
  --automation-workflow-card-hover-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
  --automation-workflow-link-bg: rgba(15, 23, 42, 0.84);
  --automation-workflow-link-border: rgba(71, 85, 105, 0.52);
  --automation-workflow-link-hover-border: rgba(94, 234, 212, 0.4);
  --automation-workflow-link-active-bg: rgba(45, 212, 191, 0.16);
  --automation-workflow-link-active-border: rgba(94, 234, 212, 0.34);
  --automation-workflow-link-active-text: #ccfbf1;
}
</style>
