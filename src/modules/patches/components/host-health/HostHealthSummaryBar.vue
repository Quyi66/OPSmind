<template>
  <section v-loading="loading" class="health-overview mb-3" aria-label="主机健康概览">
    <div class="health-overview-row">
      <!-- 左侧：综合健康总览主卡（融合平均分、纳管总数与最近巡检时间） -->
      <div
        class="overview-main-card"
        :class="[`overview-main-card--${scoreGrade.theme}`, { 'is-active': !activeStatus }]"
        role="button"
        tabindex="0"
        title="点击查看全部状态主机"
        @click="emit('select-status', '')"
        @keydown.enter.prevent="emit('select-status', '')"
      >
        <!-- 分数与仪表环 -->
        <div class="main-score-block">
          <div class="score-dial">
            <svg class="score-dial-svg" viewBox="0 0 72 72" aria-hidden="true">
              <circle class="score-dial-track" cx="36" cy="36" r="30" />
              <circle
                class="score-dial-arc"
                cx="36"
                cy="36"
                r="30"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringDashOffset"
              />
            </svg>
            <div class="score-dial-value">
              <strong>{{ hasScore ? summary.avgScore : '—' }}</strong>
              <span v-if="hasScore">分</span>
            </div>
          </div>
        </div>

        <!-- 右侧关键摘要与巡检元数据 -->
        <div class="main-info-block">
          <div class="main-info-head">
            <span class="main-info-title">平台平均健康分</span>
            <el-tag :type="scoreGrade.tagType" size="small" round>
              {{ scoreGrade.label }}
            </el-tag>
            <span class="main-total-badge">
              共 <strong>{{ summary.totalHosts.toLocaleString() }}</strong> 台
            </span>
          </div>

          <div class="main-run-meta">
            <template v-if="summary.latestRun">
              <span class="run-meta-status" :class="`is-${summary.latestRun.status}`">
                <i
                  v-if="summary.latestRun.status === 'RUNNING'"
                  class="fas fa-spinner fa-spin"
                  aria-hidden="true"
                ></i>
                <span v-else class="run-status-dot"></span>
                {{ latestRunStatusMeta.label }}
              </span>
              <span class="meta-sep">·</span>
              <span>已检 {{ summary.latestRun.hostChecked }}/{{ summary.latestRun.hostTotal }} 台</span>
              <template v-if="latestRunDisplayTime">
                <span class="meta-sep">·</span>
                <span :title="`巡检时间：${latestRunDisplayTime}`">{{ latestRunDisplayTime }}</span>
              </template>
              <template v-if="summary.latestRun.runId">
                <span class="meta-sep">·</span>
                <el-link
                  type="primary"
                  :underline="false"
                  class="run-detail-link"
                  @click.stop="emit('view-run-detail', summary.latestRun.runId)"
                >
                  作业详情
                </el-link>
              </template>
            </template>
            <template v-else>
              <span class="run-meta-status">尚未执行过巡检</span>
            </template>
          </div>

          <div class="main-schedule-note">
            <i class="far fa-clock" aria-hidden="true"></i>
            <span>每日 02:00 自动全量巡检</span>
          </div>
        </div>
      </div>

      <!-- 右侧：5 类健康状态精简卡片 -->
      <div class="status-card-list">
        <button
          v-for="item in statusCards"
          :key="item.value"
          type="button"
          class="status-card"
          :class="[
            `status-card--${item.cardVariant}`,
            {
              'is-active': activeStatus === item.value,
              'has-count': item.count > 0
            }
          ]"
          :title="`点击按「${item.label}」状态筛选主机`"
          @click="emit('select-status', item.value)"
        >
          <div class="status-card-head">
            <span class="status-label-wrap">
              <span class="status-dot" aria-hidden="true"></span>
              <span class="status-name">{{ item.label }}</span>
            </span>
            <i :class="[item.icon, 'status-watermark-icon']" aria-hidden="true"></i>
          </div>

          <div class="status-card-body">
            <strong class="status-count">{{ item.count.toLocaleString() }}</strong>
            <span class="status-unit">台</span>
          </div>

          <!-- 底部微缩占比进度条 -->
          <div class="status-bar-track" aria-hidden="true">
            <div class="status-bar-fill" :style="{ width: `${item.barWidth}%` }"></div>
          </div>
        </button>
      </div>
    </div>

    <!-- 部分批次未带回结果提示 -->
    <el-alert
      v-if="summary.latestRun?.message"
      :title="summary.latestRun.message"
      type="warning"
      show-icon
      :closable="false"
      class="mt-2"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { HEALTH_STATUS_LIST } from '../../constants/hostHealth'
import { getLatestRunStatusMeta, formatHealthDateTime } from '../../utils/hostHealth'

const props = defineProps({
  summary: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  activeStatus: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select-status', 'view-run-detail'])

const RING_RADIUS = 30
const ringCircumference = 2 * Math.PI * RING_RADIUS

const hasScore = computed(
  () => props.summary?.avgScore !== null && props.summary?.avgScore !== undefined
)

const normalizedScore = computed(() => {
  if (!hasScore.value) return 0
  return Math.max(0, Math.min(100, Number(props.summary.avgScore) || 0))
})

const ringDashOffset = computed(() => {
  const ratio = normalizedScore.value / 100
  return ringCircumference * (1 - ratio)
})

const scoreGrade = computed(() => {
  if (!hasScore.value) {
    return { label: '未评分', tagType: 'info', theme: 'neutral' }
  }
  const s = normalizedScore.value
  if (s >= 90) return { label: '健康良好', tagType: 'success', theme: 'good' }
  if (s >= 75) return { label: '存在告警', tagType: 'warning', theme: 'warn' }
  return { label: '高危风险', tagType: 'danger', theme: 'danger' }
})

const statusCards = computed(() => {
  const counts = props.summary?.counts || {}
  const total = Number(props.summary?.totalHosts) || 0

  return HEALTH_STATUS_LIST.map(item => {
    const count = Number(counts[item.value]) || 0
    const rawPercent = total > 0 ? (count / total) * 100 : 0
    const barWidth = count > 0 ? Math.max(8, Math.min(100, rawPercent)) : 0
    return {
      ...item,
      count,
      barWidth
    }
  })
})

const latestRunStatusMeta = computed(() =>
  getLatestRunStatusMeta(props.summary?.latestRun?.status)
)

const latestRunDisplayTime = computed(() => {
  const run = props.summary?.latestRun
  if (!run) return ''
  return formatHealthDateTime(run.finishedAt || run.startedAt)
})
</script>

<style scoped lang="scss">
.health-overview {
  flex-shrink: 0;
}

.health-overview-row {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

/* 左侧综合健康主卡 */
.overview-main-card {
  --main-accent: #165dff;
  --main-tint: rgba(22, 93, 255, 0.04);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(135deg, var(--main-tint) 0%, var(--el-bg-color) 70%);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;

  &--good {
    --main-accent: #10b981;
    --main-tint: rgba(16, 185, 129, 0.05);
  }

  &--warn {
    --main-accent: #f59e0b;
    --main-tint: rgba(245, 158, 11, 0.05);
  }

  &--danger {
    --main-accent: #ef4444;
    --main-tint: rgba(239, 68, 68, 0.05);
  }

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  }

  &.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary) inset;
  }
}

.main-score-block {
  flex-shrink: 0;
}

.score-dial {
  position: relative;
  width: 68px;
  height: 68px;
}

.score-dial-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-dial-track {
  fill: none;
  stroke: var(--el-fill-color-dark);
  stroke-width: 5.5;
}

.score-dial-arc {
  fill: none;
  stroke: var(--main-accent);
  stroke-width: 5.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.4s ease;
}

.score-dial-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 21px;

  strong {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }

  span {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-left: 1px;
  }
}

.main-info-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.main-info-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.main-info-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.main-total-badge {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-regular);

  strong {
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.main-run-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-meta-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  color: var(--el-text-color-primary);

  &.is-COMPLETED .run-status-dot {
    background: #10b981;
  }

  &.is-FAILED .run-status-dot {
    background: #ef4444;
  }
}

.run-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-text-color-secondary);
}

.meta-sep {
  color: var(--el-border-color-dark);
}

.run-detail-link {
  font-size: 12px;
  font-weight: 500;
}

.main-schedule-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 右侧 5 个状态卡片 */
.status-card-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.status-card {
  --state-color: #64748b;
  --state-ring: rgba(100, 116, 139, 0.16);
  --state-bg-active: rgba(100, 116, 139, 0.05);
  position: relative;
  appearance: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    background-color 0.2s ease;

  &--danger {
    --state-color: #f53f3f;
    --state-ring: rgba(245, 63, 63, 0.16);
    --state-bg-active: rgba(245, 63, 63, 0.04);
  }

  &--warning {
    --state-color: #ff7d00;
    --state-ring: rgba(255, 125, 0, 0.16);
    --state-bg-active: rgba(255, 125, 0, 0.04);
  }

  &--success {
    --state-color: #10b981;
    --state-ring: rgba(16, 185, 129, 0.16);
    --state-bg-active: rgba(16, 185, 129, 0.04);
  }

  &--info {
    --state-color: #64748b;
    --state-ring: rgba(100, 116, 139, 0.16);
    --state-bg-active: rgba(100, 116, 139, 0.04);
  }

  &--muted {
    --state-color: #94a3b8;
    --state-ring: rgba(148, 163, 184, 0.18);
    --state-bg-active: rgba(148, 163, 184, 0.05);
  }

  &:hover {
    transform: translateY(-1px);
    border-color: var(--state-color);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  }

  &.is-active {
    border-color: var(--state-color);
    background: var(--state-bg-active);
    box-shadow: 0 0 0 1px var(--state-color) inset;
  }
}

.status-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.status-label-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--state-color);
  box-shadow: 0 0 0 3px var(--state-ring);
  flex-shrink: 0;
}

.status-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.status-watermark-icon {
  font-size: 15px;
  color: var(--state-color);
  opacity: 0.28;
  transition: opacity 0.2s ease;
}

.status-card:hover .status-watermark-icon,
.status-card.is-active .status-watermark-icon {
  opacity: 0.65;
}

.status-card-body {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 8px 0 10px;
}

.status-count {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.status-card--danger.has-count .status-count {
  color: #f53f3f;
}

.status-card--warning.has-count .status-count {
  color: #ff7d00;
}

.status-card--success.has-count .status-count {
  color: #10b981;
}

.status-unit {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-bar-track {
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: var(--el-fill-color);
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--state-color);
  transition: width 0.3s ease;
}

@media (max-width: 1360px) {
  .health-overview-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .status-card-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .status-card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
