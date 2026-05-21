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
            <span v-if="item.badgeValue" class="workflow-link__badge">{{ item.badgeValue }}</span>
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
    label: '命令运维工具',
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
    label: '运维工具列表',
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
    label: '运维工具审批',
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
    tag: '总览',
    hidePendingCards: true
  },
  automation: {
    moduleLabel: '业务工作区',
    title: '自动化业务流',
    tag: '总览'
  },
  jobList: {
    moduleLabel: '运维工具箱',
    title: '运维工具列表',
    tag: '执行入口'
  },
  schedule: {
    moduleLabel: '运维工具箱',
    title: '流程编排',
    tag: '编排设计'
  },
  taskScheduler: {
    moduleLabel: '运维工具箱',
    title: '定时任务',
    tag: '定时调度'
  },
  requests: {
    moduleLabel: '运维工具箱',
    title: '我的申请',
    tag: '审批跟踪'
  },
  approvals: {
    moduleLabel: '审批中心',
    title: '运维工具审批',
    tag: '治理闭环'
  },
  commandWorkspace: {
    moduleLabel: '命令执行',
    title: '命令列表',
    tag: '命令沉淀'
  },
  commandJobs: {
    moduleLabel: '命令执行',
    title: '命令运维工具',
    tag: '命令复用'
  },
  commandReview: {
    moduleLabel: '审批中心',
    title: '命令审核',
    tag: '待办处理'
  },
  commandConsole: {
    moduleLabel: '命令执行',
    title: '控制台',
    tag: '临时执行'
  },
  scriptLibrary: {
    moduleLabel: '脚本中心',
    title: '脚本库',
    tag: '材料沉淀'
  },
  fileLibrary: {
    moduleLabel: '脚本中心',
    title: '文件库',
    tag: '执行材料'
  },
  scriptReview: {
    moduleLabel: '审批中心',
    title: '脚本审核',
    tag: '变更治理'
  },
  runLogs: {
    moduleLabel: '运行记录',
    title: '运行记录',
    tag: '执行复盘'
  },
  statistics: {
    moduleLabel: '运行记录',
    title: '统计分析',
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
    items: pickShortcuts(['commandWorkspace', 'commandJobs', 'taskScheduler', 'jobList', 'schedule'])
  },
  {
    key: 'govern',
    label: '申请审批与记录',
    items: pickShortcuts(['requests', 'approvals', 'commandReview', 'scriptReview', 'runLogs'])
  }
].filter(group => group.items.length > 0))

const pendingCards = computed(() => [
  {
    key: 'approvals',
    label: '运维工具待审批',
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
  --automation-workflow-accent: #0d9488;
  --automation-workflow-bg: rgba(255, 255, 255, 0.95);
  --automation-workflow-border: #e2e8f0;
  --automation-workflow-card-bg: #f8fafc;
  --automation-workflow-card-border: #e2e8f0;
  --automation-workflow-card-hover-border: rgba(13, 148, 136, 0.5);
  --automation-workflow-card-hover-shadow: 0 8px 20px -4px rgba(13, 148, 136, 0.18);
  --automation-workflow-link-bg: #ffffff;
  --automation-workflow-link-border: #e2e8f0;
  --automation-workflow-link-hover-border: rgba(13, 148, 136, 0.6);
  --automation-workflow-link-active-bg: linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(13, 148, 136, 0.04));
  --automation-workflow-link-active-border: rgba(13, 148, 136, 0.35);
  --automation-workflow-link-active-text: #0f766e;

  padding: 14px 20px 12px;
  border-bottom: none;
  background: var(--automation-workflow-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: relative;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.automation-workflow-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--automation-workflow-accent) 30%,
    var(--automation-workflow-accent) 70%,
    transparent
  );
  opacity: 0.35;
}

.automation-workflow-header__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.automation-workflow-header__content {
  min-width: 200px;
  flex: 1;
}

.automation-workflow-header__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--automation-workflow-accent);
  text-transform: uppercase;
  margin-bottom: 2px;
}

.automation-workflow-header__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.automation-workflow-header__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary);
  letter-spacing: -0.01em;
}

.automation-workflow-header__stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pending-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 90px;
  padding: 8px 14px;
  border: 1px solid var(--automation-workflow-card-border);
  border-radius: 10px;
  background: var(--automation-workflow-card-bg);
  backdrop-filter: blur(8px);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pending-card:hover {
  border-color: var(--automation-workflow-card-hover-border);
  box-shadow: var(--automation-workflow-card-hover-shadow);
  transform: translateY(-2px) scale(1.02);
  background: rgba(255, 255, 255, 0.9);
}

.pending-card__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.pending-card__value {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  color: var(--automation-workflow-accent);
}

.automation-workflow-header__groups {
  margin-top: 12px;
  display: flex;
  gap: 10px 24px;
  flex-wrap: wrap;
  align-items: center;
}

.workflow-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workflow-group__label {
  position: relative;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  padding-left: 9px;
  white-space: nowrap;
}

.workflow-group__label::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 12px;
  border-radius: 3px;
  background: var(--automation-workflow-accent);
}

.workflow-group__links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.workflow-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--automation-workflow-link-border);
  border-radius: 14px;
  background: var(--automation-workflow-link-bg);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.workflow-link:hover {
  border-color: var(--automation-workflow-link-hover-border);
  color: var(--automation-workflow-accent);
  transform: translateY(-1px);
}

.workflow-link.is-active {
  border-color: var(--automation-workflow-link-active-border);
  background: var(--automation-workflow-link-active-bg);
  color: var(--automation-workflow-link-active-text);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.1);
}

.workflow-link__icon {
  font-size: 12px;
  opacity: 0.8;
}

.workflow-link__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--automation-workflow-accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  margin-left: -2px;
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.3);
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

@media (max-width: 960px) {
  .automation-workflow-header__stats {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .workflow-group {
    border-right: none;
    padding: 8px 0;
    width: 100%;
  }
}
</style>

<style lang="scss">
html.dark .automation-workflow-header {
  --automation-workflow-accent: #2dd4bf;
  --automation-workflow-bg: rgba(15, 23, 42, 0.7);
  --automation-workflow-border: rgba(51, 65, 85, 0.6);
  --automation-workflow-card-bg: rgba(30, 41, 59, 0.5);
  --automation-workflow-card-border: rgba(71, 85, 105, 0.4);
  --automation-workflow-card-hover-border: rgba(45, 212, 191, 0.5);
  --automation-workflow-card-hover-shadow: 0 10px 25px -5px rgba(45, 212, 191, 0.15);
  --automation-workflow-link-bg: rgba(30, 41, 59, 0.4);
  --automation-workflow-link-border: rgba(71, 85, 105, 0.5);
  --automation-workflow-link-hover-border: rgba(45, 212, 191, 0.5);
  --automation-workflow-link-active-bg: linear-gradient(135deg, rgba(45, 212, 191, 0.15), rgba(20, 184, 166, 0.05));
  --automation-workflow-link-active-border: rgba(45, 212, 191, 0.4);
  --automation-workflow-link-active-text: #5eead4;
  box-shadow: none;
}
html.dark .pending-card:hover {
  background: rgba(30, 41, 59, 0.8);
}
html.dark .workflow-link__badge {
  background: #2dd4bf;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(45, 212, 191, 0.4);
}
</style>
