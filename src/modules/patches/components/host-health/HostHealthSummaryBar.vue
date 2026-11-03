<template>
  <section v-loading="loading" class="health-overview mb-3" aria-label="主机健康概览">
    <!-- 方案 A：一体化流线型看板 (Unibody Metric Panel) -->
    <div class="overview-unibody-panel">
      <!-- 左侧：综合健康总评与纳管资产基数 -->
      <div class="unibody-left-block">
        <!-- 76x76 精致环形得分仪表（尺寸与三行元信息形成黄金视觉对齐） -->
        <div class="score-dial-wrap" :class="`score-dial-wrap--${scoreGrade.theme}`">
          <svg class="score-dial-svg" viewBox="0 0 76 76" aria-hidden="true">
            <circle class="score-dial-track" cx="38" cy="38" r="31" />
            <circle
              class="score-dial-arc"
              cx="38"
              cy="38"
              r="31"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringDashOffset"
            />
          </svg>
          <div class="score-dial-center">
            <strong class="score-dial-val">{{ hasScore ? summary.avgScore : '—' }}</strong>
            <span v-if="hasScore" class="score-dial-unit">分</span>
          </div>
        </div>

        <!-- 评分描述与纳管基数 -->
        <div class="score-meta-block">
          <div class="meta-row-header">
            <span class="meta-title">参评主机平均健康分</span>
            <el-tooltip
              placement="top"
              effect="dark"
              :content="`平均分仅基于已连通巡检的有效主机计算（当前共 ${scoredHostsCount.toLocaleString()} 台）。不可达（${unreachableCount.toLocaleString()} 台）及未巡检主机不参与平均分计算。`"
            >
              <i class="far fa-question-circle score-rule-tip-icon" aria-hidden="true"></i>
            </el-tooltip>
            <el-tag :type="scoreGrade.tagType" size="small" round effect="light" class="grade-tag">
              {{ scoreGrade.label }}
            </el-tag>
          </div>

          <!-- 明确参评主机与纳管基数，消除 93分 与 5725台不可达 的认知冲突 -->
          <div class="meta-row-total">
            <span class="total-label">评分基数：</span>
            <span class="scored-hosts-badge" :title="`有效参评主机：${scoredHostsCount} 台`">
              参评 <strong>{{ scoredHostsCount.toLocaleString() }}</strong> 台
            </span>
            <span class="total-sep">·</span>
            <button
              type="button"
              class="total-action-btn"
              :class="{ 'is-active': !activeStatus }"
              title="点击查看/重置为全部状态主机"
              @click="emit('select-status', '')"
            >
              纳管共 <strong>{{ totalHostsCount.toLocaleString() }}</strong> 台
            </button>
            <span v-if="!activeStatus" class="total-active-pill">全量</span>
            <button
              v-else
              type="button"
              class="total-reset-btn"
              title="点击重置，查看全部状态主机"
              @click="emit('select-status', '')"
            >
              <i class="fas fa-undo-alt me-1"></i>重置
            </button>
          </div>

          <div class="meta-row-run">
            <template v-if="summary.latestRun">
              <span class="run-status-indicator" :class="`is-${summary.latestRun.status}`">
                <i
                  v-if="summary.latestRun.status === 'RUNNING'"
                  class="fas fa-spinner fa-spin"
                  aria-hidden="true"
                ></i>
                <span v-else class="run-dot"></span>
                {{ latestRunStatusMeta.label }}
              </span>
              <span v-if="latestRunDisplayTime" class="meta-sep">·</span>
              <span v-if="latestRunDisplayTime" class="run-time" :title="`巡检时间：${latestRunDisplayTime}`">
                {{ latestRunDisplayTime }}
              </span>
              <template v-if="summary.latestRun.runId">
                <span class="meta-sep">·</span>
                <el-link
                  type="primary"
                  :underline="false"
                  class="run-link"
                  @click.stop="emit('view-run-detail', summary.latestRun.runId)"
                >
                  作业详情
                </el-link>
              </template>
            </template>
            <template v-else>
              <span class="run-time-empty">尚未执行巡检</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 中间微质感垂直分割线 -->
      <div class="unibody-divider" aria-hidden="true"></div>

      <!-- 右侧：全局资产健康分布连续堆叠条 + 5 个交互式指标筛选项 -->
      <div class="unibody-right-block">
        <!-- 顶部：全局健康分布全景条 -->
        <div class="distribution-header-bar">
          <div class="distrib-info">
            <span class="distrib-title">资产健康分布全景</span>
            <span class="distrib-caption">共 {{ totalHostsCount.toLocaleString() }} 台</span>
          </div>

          <!-- 异常处置态势提示 -->
          <div class="distrib-status-tip">
            <span v-if="riskCount > 0" class="tip-risk-warn">
              <i class="fas fa-exclamation-circle me-1" aria-hidden="true"></i>
              <strong>{{ riskCount }}</strong> 台待处置（严重/告警）
            </span>
            <span v-else class="tip-risk-ok">
              <i class="fas fa-check-circle me-1" aria-hidden="true"></i>
              无严重或告警主机
            </span>
          </div>
        </div>

        <!-- 连续彩色胶囊堆叠比例条 (6px 轻薄流线，柔和高级色系，消除黑灰沉闷感) -->
        <div class="stacked-distribution-bar" aria-label="健康状态占比堆叠条">
          <div
            v-for="seg in distributionSegments"
            :key="seg.value"
            class="stacked-bar-seg"
            :class="`seg--${seg.variant}`"
            :style="{ width: `${seg.renderWidth}%` }"
            :title="`${seg.label}: ${seg.count.toLocaleString()} 台 (${seg.percentText})`"
          ></div>
        </div>

        <!-- 底部：5 个精致中控指标卡（解耦告警态与选中激活态，质感统一） -->
        <div class="status-metrics-row">
          <button
            v-for="item in statusCards"
            :key="item.value"
            type="button"
            class="metric-filter-pill"
            :class="[
              `metric-pill--${item.cardVariant}`,
              {
                'is-active': activeStatus === item.value,
                'has-count': item.count > 0,
                'is-zero': item.count === 0,
                'is-risk-focus': item.isRisk && item.count > 0
              }
            ]"
            :title="`点击${activeStatus === item.value ? '取消筛选' : '按「' + item.label + '」筛选'}`"
            @click="handleCardClick(item.value)"
          >
            <div class="pill-top-row">
              <span class="pill-name-wrap">
                <span class="pill-dot" aria-hidden="true"></span>
                <span class="pill-label">{{ item.label }}</span>
              </span>
              <span class="pill-percent-tag">{{ item.percentText }}</span>
            </div>

            <div class="pill-bottom-row">
              <strong class="pill-count-num">{{ item.count.toLocaleString() }}</strong>
              <span class="pill-unit-text">台</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 运行消息提示 -->
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

// 仪表盘参数（76x76 viewBox 下半径 31，黄金尺寸）
const RING_RADIUS = 31
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

const totalHostsCount = computed(() => Number(props.summary?.totalHosts) || 0)

// 不可达主机数量
const unreachableCount = computed(() => Number(props.summary?.counts?.UNREACHABLE) || 0)

// 实际参与评分的主机总数（健康 + 告警 + 严重，不可达与未巡检不计入平均分）
const scoredHostsCount = computed(() => {
  const counts = props.summary?.counts || {}
  return (
    (Number(counts.HEALTHY) || 0) +
    (Number(counts.WARNING) || 0) +
    (Number(counts.CRITICAL) || 0)
  )
})

// 风险待处置总台数（严重 + 告警）
const riskCount = computed(() => {
  const counts = props.summary?.counts || {}
  return (Number(counts.CRITICAL) || 0) + (Number(counts.WARNING) || 0)
})

/**
 * 格式化百分比显示
 */
function formatPercentText(count, total) {
  if (total <= 0 || count <= 0) return '0%'
  const raw = (count / total) * 100
  if (raw >= 99.95) return '100%'
  if (raw >= 0.1) return `${raw.toFixed(1)}%`
  return '<0.1%'
}

/**
 * 5 类状态卡片核心数据
 */
const statusCards = computed(() => {
  const counts = props.summary?.counts || {}
  const total = totalHostsCount.value

  return HEALTH_STATUS_LIST.map(item => {
    const count = Number(counts[item.value]) || 0
    const percentText = formatPercentText(count, total)
    const isRisk = item.value === 'CRITICAL' || item.value === 'WARNING'

    return {
      ...item,
      count,
      percentText,
      isRisk
    }
  })
})

/**
 * 全局连续色彩堆叠比例条的各段数据
 * 为避免微小比例（如 0.05%）彻底消失，给有计数的段设定保底展示宽度，随后进行归一化
 */
const distributionSegments = computed(() => {
  const total = totalHostsCount.value
  if (total <= 0) {
    return [{ value: 'EMPTY', label: '暂无数据', count: 0, percentText: '0%', renderWidth: 100, variant: 'empty' }]
  }

  const cards = statusCards.value
  const activeSegments = cards.filter(c => c.count > 0)

  if (activeSegments.length === 0) {
    return [{ value: 'EMPTY', label: '暂无数据', count: 0, percentText: '0%', renderWidth: 100, variant: 'empty' }]
  }

  // 计算加权展示宽度（有数值项至少保障 2% 宽度以便直观感知和悬浮交互）
  const minVisualWidth = 2.0
  let rawWidths = activeSegments.map(item => {
    const realPercent = (item.count / total) * 100
    return Math.max(minVisualWidth, realPercent)
  })

  const sumWidths = rawWidths.reduce((acc, cur) => acc + cur, 0)
  // 归一化为 100%
  return activeSegments.map((item, index) => {
    const renderWidth = (rawWidths[index] / sumWidths) * 100
    return {
      value: item.value,
      label: item.label,
      count: item.count,
      percentText: item.percentText,
      renderWidth: Number(renderWidth.toFixed(2)),
      variant: item.cardVariant
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

/**
 * 卡片点击交互：若已选中该项再次点击则切回全部，提升交互灵活性
 */
function handleCardClick(value) {
  if (props.activeStatus === value) {
    emit('select-status', '')
  } else {
    emit('select-status', value)
  }
}
</script>

<style scoped lang="scss">
.health-overview {
  flex-shrink: 0;
}

/* 一体化流线型面板容器 */
.overview-unibody-panel {
  display: grid;
  grid-template-columns: 385px 1px minmax(0, 1fr);
  gap: 22px;
  align-items: center;
  padding: 16px 22px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--el-border-color);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  }
}

/* ================= 左侧健康总评区 ================= */
.unibody-left-block {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

/* 76x76 黄金尺寸仪表盘容器 */
.score-dial-wrap {
  position: relative;
  width: 76px;
  height: 76px;
  flex-shrink: 0;
  user-select: none;

  --dial-accent: var(--el-color-primary);

  &--good {
    --dial-accent: #10b981;
  }
  &--warn {
    --dial-accent: #f59e0b;
  }
  &--danger {
    --dial-accent: #f43f5e;
  }
  &--neutral {
    --dial-accent: #64748b;
  }
}

.score-dial-svg {
  width: 76px;
  height: 76px;
  display: block;
  transform: rotate(-90deg);
}

.score-dial-track {
  fill: none;
  stroke: var(--el-fill-color-dark);
  stroke-width: 5.5;
}

.score-dial-arc {
  fill: none;
  stroke: var(--dial-accent);
  stroke-width: 5.5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-dial-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 24px;

  .score-dial-val {
    font-size: 24px;
    font-weight: 800;
    line-height: 1;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }

  .score-dial-unit {
    font-size: 11px;
    font-weight: 500;
    color: var(--el-text-color-secondary);
    margin-left: 1px;
  }
}

.score-meta-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-row-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.score-rule-tip-icon {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--el-color-primary);
  }
}

.grade-tag {
  font-weight: 600;
  border: none;
  margin-left: 2px;
}

.meta-row-total {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  flex-wrap: nowrap;
}

.total-label {
  color: var(--el-text-color-secondary);
}

.scored-hosts-badge {
  color: var(--el-text-color-primary);
  font-size: 12px;

  strong {
    font-weight: 700;
    color: var(--el-color-primary);
    font-variant-numeric: tabular-nums;
  }
}

.total-sep {
  color: var(--el-border-color-dark);
  margin: 0 1px;
}

.total-action-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-regular);
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  transition: color 0.2s ease;

  strong {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    color: var(--el-color-primary);
    strong {
      color: var(--el-color-primary);
    }
  }
}

.total-active-pill {
  font-size: 10px;
  font-weight: 500;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  line-height: 16px;
  margin-left: 2px;
}

.total-reset-btn {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  padding: 0 7px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 10px;
  color: var(--el-color-primary);
  line-height: 16px;
  display: inline-flex;
  align-items: center;
  margin-left: 2px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--el-color-primary);
    color: #ffffff;
    border-color: var(--el-color-primary);
  }
}

.meta-row-run {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.run-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  color: var(--el-text-color-regular);

  &.is-COMPLETED .run-dot {
    background: #10b981;
  }

  &.is-FAILED .run-dot {
    background: #f43f5e;
  }

  &.is-RUNNING {
    color: var(--el-color-primary);
  }
}

.run-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}

.meta-sep {
  color: var(--el-border-color-dark);
}

.run-time {
  color: var(--el-text-color-secondary);
}

.run-time-empty {
  color: var(--el-text-color-placeholder);
}

.run-link {
  font-size: 11px;
  font-weight: 500;
}

/* ================= 垂直分割线 ================= */
.unibody-divider {
  width: 1px;
  height: 68px;
  background: var(--el-border-color-lighter);
}

/* ================= 右侧分布与筛选区 ================= */
.unibody-right-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  margin-bottom: 1px;
}

.distrib-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.distrib-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.distrib-caption {
  color: var(--el-text-color-secondary);
}

.distrib-status-tip {
  font-size: 11px;
}

.tip-risk-warn {
  color: #d97706;
  font-weight: 500;

  strong {
    font-weight: 700;
  }
}

.tip-risk-ok {
  color: #10b981;
  font-weight: 500;
}

/* 连续堆叠色彩胶囊条（轻薄 6px，温润无生硬感） */
.stacked-distribution-bar {
  height: 6px;
  width: 100%;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  display: flex;
  overflow: hidden;
  gap: 2px;
  padding: 1px;
  margin-bottom: 2px;
}

.stacked-bar-seg {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.seg--danger {
    background: #f43f5e;
  }

  &.seg--warning {
    background: #f59e0b;
  }

  &.seg--success {
    background: #10b981;
  }

  /* 不可达：温和通透的蓝灰色，告别黑沉与脏感 */
  &.seg--info {
    background: #94a3b8;
  }

  /* 未巡检：柔和浅雾灰 */
  &.seg--muted {
    background: #cbd5e1;
  }

  &.seg--empty {
    background: var(--el-fill-color-dark);
  }
}

/* 5 个指标筛选块（网格间距微调为 10px，更显从容） */
.status-metrics-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric-filter-pill {
  --pill-color: #64748b;
  --pill-bg-default: var(--el-fill-color-blank);
  --pill-bg-hover: var(--el-fill-color-light);
  --pill-bg-active: rgba(100, 116, 139, 0.1);
  --pill-border-default: var(--el-border-color-lighter);
  --pill-border-hover: var(--el-border-color);

  position: relative;
  appearance: none;
  /* 统一卡片浅边框与底色，形成整齐有序的控制台按键质感 */
  border: 1px solid var(--pill-border-default);
  background: var(--pill-bg-default);
  border-radius: 8px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
  user-select: none;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &--danger {
    --pill-color: #f43f5e;
    --pill-bg-active: rgba(244, 63, 94, 0.08);
  }

  &--warning {
    --pill-color: #f59e0b;
    --pill-bg-active: rgba(245, 158, 11, 0.08);
  }

  &--success {
    --pill-color: #10b981;
    --pill-bg-active: rgba(16, 185, 129, 0.08);
  }

  /* 不可达状态：石板冷灰深色轮廓，提升辨识度 */
  &--info {
    --pill-color: #475569;
    --pill-bg-active: rgba(71, 85, 105, 0.1);

    .pill-label {
      color: #334155;
      font-weight: 600;
    }

    .pill-dot {
      background: #475569;
      box-shadow: 0 0 0 2px rgba(71, 85, 105, 0.15);
    }
  }

  &--muted {
    --pill-color: #94a3b8;
    --pill-bg-active: rgba(148, 163, 184, 0.12);
  }

  &:hover {
    transform: translateY(-1px);
    background: var(--pill-bg-hover);
    border-color: var(--pill-border-hover);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  }

  /* 只有真正点击激活选中时，才赋予高亮色与底色 */
  &.is-active {
    border-color: var(--pill-color);
    background: var(--pill-bg-active);
    box-shadow: 0 0 0 1px var(--pill-color) inset, 0 2px 8px rgba(15, 23, 42, 0.06);

    .pill-label {
      color: var(--el-text-color-primary);
      font-weight: 700;
    }
  }

  /* 当有告警但【未选中】时：底色保持统一的默认白底，只高亮圆点和数字！绝不伪装成选中框！ */
  &.is-risk-focus:not(.is-active) {
    .pill-dot {
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);
    }
    .pill-count-num {
      color: #d97706;
    }
    .pill-percent-tag {
      color: #d97706;
      font-weight: 600;
    }
  }

  &--danger.has-count:not(.is-active) {
    .pill-dot {
      box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25);
    }
    .pill-count-num {
      color: #e11d48;
    }
    .pill-percent-tag {
      color: #e11d48;
      font-weight: 600;
    }
  }
}

.pill-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.pill-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pill-color);
  flex-shrink: 0;
  transition: box-shadow 0.2s ease;
}

.pill-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  line-height: 1;
}

.pill-percent-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.pill-bottom-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-top: 6px;
}

.pill-count-num {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.metric-filter-pill.is-zero .pill-count-num {
  color: var(--el-text-color-placeholder);
}

.pill-unit-text {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

/* 响应式断点适配 */
@media (max-width: 1320px) {
  .overview-unibody-panel {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .unibody-divider {
    display: none;
  }
}

@media (max-width: 768px) {
  .status-metrics-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .status-metrics-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
