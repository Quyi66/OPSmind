<template>
  <section v-loading="loading" class="health-overview mb-3" aria-label="主机健康概览">
    <!-- 主体：左侧健康评分仪表盘卡片 + 右侧资产统计卡片 -->
    <div class="overview-grid">
      <!-- 1. 顶部健康概览卡片 (仅环形仪表盘使用渐变，其余保持纯净白底) -->
      <div class="health-score-card">
        <!-- 环形仪表盘（唯一应用渐变色区域） -->
        <div class="score-dial-wrap">
          <svg class="score-dial-svg" viewBox="0 0 88 88" aria-hidden="true">
            <defs>
              <!-- 良好：葱郁碧绿渐变 -->
              <linearGradient id="score-grad-good" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="100%" stop-color="#059669" />
              </linearGradient>
              <!-- 告警：明亮琥珀橙渐变 -->
              <linearGradient id="score-grad-warn" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#d97706" />
              </linearGradient>
              <!-- 危险：艳丽玫红渐变 -->
              <linearGradient id="score-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fb7185" />
                <stop offset="100%" stop-color="#e11d48" />
              </linearGradient>
              <!-- 未评分：低调高级灰渐变 -->
              <linearGradient id="score-grad-neutral" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#cbd5e1" />
                <stop offset="100%" stop-color="#94a3b8" />
              </linearGradient>
            </defs>

            <!-- 轨道背景圆环 -->
            <circle class="score-dial-track" cx="44" cy="44" r="35" />

            <!-- 渐变动效得分弧线（自正上方起针顺时针旋转） -->
            <circle
              class="score-dial-arc"
              cx="44"
              cy="44"
              r="35"
              transform="rotate(-90 44 44)"
              :stroke="`url(#score-grad-${scoreGrade.theme})`"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringDashOffset"
            />
          </svg>

          <!-- 环心数值与单位（自适应 2 位与 3 位数排版，防止 100 分时拥挤） -->
          <div class="score-dial-center">
            <div class="score-number-group" :class="{ 'is-three-digits': isThreeDigits }">
              <strong class="score-dial-val">{{ hasScore ? summary.avgScore : '—' }}</strong>
              <span v-if="hasScore" class="score-dial-unit">分</span>
            </div>
          </div>
        </div>

        <!-- 评分描述与元信息 -->
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
            <span class="grade-pill-tag" :class="`grade-pill--${scoreGrade.theme}`">
              {{ scoreGrade.label }}
            </span>
          </div>

          <!-- 参评与纳管基数 -->
          <div class="meta-row-hosts">
            <span class="hosts-stat-item" :title="`有效参评主机：${scoredHostsCount} 台`">
              <span class="hosts-label">参评主机:</span>
              <strong class="hosts-val">{{ scoredHostsCount.toLocaleString() }}</strong>
              <span class="hosts-unit">台</span>
            </span>
            <span class="hosts-sep">|</span>
            <button
              type="button"
              class="hosts-stat-btn"
              :class="{ 'is-active': !activeStatus }"
              title="点击查看/重置为全部状态主机"
              @click="emit('select-status', '')"
            >
              <span class="hosts-label">纳管主机:</span>
              <strong class="hosts-val">{{ totalHostsCount.toLocaleString() }}</strong>
              <span class="hosts-unit">台</span>
            </button>
            <span v-if="!activeStatus" class="hosts-all-pill">全量</span>
            <button
              v-else
              type="button"
              class="hosts-reset-btn"
              title="点击重置，查看全部状态主机"
              @click="emit('select-status', '')"
            >
              <i class="fas fa-undo-alt me-1"></i>重置
            </button>
          </div>

          <!-- 最近巡检作业信息 -->
          <div class="meta-row-run">
            <template v-if="summary.latestRun">
              <span class="run-dot" :class="`is-${summary.latestRun.status}`"></span>
              <span class="run-label">最近巡检:</span>
              <span class="run-time" :title="`巡检时间：${latestRunDisplayTime}`">
                {{ latestRunDisplayTime || '—' }}
              </span>
              <template v-if="summary.latestRun.runId">
                <span class="run-sep">|</span>
                <button
                  type="button"
                  class="run-detail-link"
                  @click.stop="emit('view-run-detail', summary.latestRun.runId)"
                >
                  查看详情 <i class="fas fa-chevron-right ms-1"></i>
                </button>
              </template>
            </template>
            <template v-else>
              <span class="run-dot is-empty"></span>
              <span class="run-time-empty">尚未执行巡检</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 2. 资产统计分布卡片 (状态文字在颜色区域以外) -->
      <div class="health-distrib-card">
        <!-- 顶部：健康分布全景与待处置异常提示 -->
        <div class="distrib-header">
          <div class="distrib-title-wrap">
            <span class="distrib-title">资产健康分布</span>
            <span class="distrib-total">共 {{ totalHostsCount.toLocaleString() }} 台</span>
          </div>

          <!-- 待处置异常风险态势提示 -->
          <div class="distrib-badge-wrap">
            <span v-if="riskCount > 0" class="risk-badge">
              <i class="fas fa-exclamation-circle me-1" aria-hidden="true"></i>
              <strong>{{ riskCount }}</strong> 台待处置（严重/告警）
            </span>
            <span v-else class="safe-badge">
              <i class="fas fa-check-circle me-1" aria-hidden="true"></i>
              无严重或告警主机
            </span>
          </div>
        </div>

        <!-- 连续彩色胶囊堆叠比例条 (7px 细条，圆角胶囊段) -->
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

        <!-- 底部：5 个精致中控指标卡（回退到原始统一浅边框白底结构） -->
        <div class="status-metrics-row">
          <button
            v-for="item in statusCards"
            :key="item.value"
            type="button"
            class="metric-filter-pill"
            :class="[
              `metric-filter-pill--${item.cardVariant}`,
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

// 仪表盘参数（88x88 viewBox 下半径 35，圆周长 2*PI*35 ≈ 219.911）
const RING_RADIUS = 35
const ringCircumference = 2 * Math.PI * RING_RADIUS

const hasScore = computed(
  () => props.summary?.avgScore !== null && props.summary?.avgScore !== undefined
)

// 判断是否为 3 位数得分（如 100 分），用于触发紧凑排版适配
const isThreeDigits = computed(() => {
  if (!hasScore.value) return false
  const scoreVal = Math.round(Number(props.summary.avgScore) || 0)
  return scoreVal >= 100 || String(scoreVal).length >= 3
})

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

  // 保障微小比例有基础显示宽度，随后归一化
  const minVisualWidth = 2.5
  let rawWidths = activeSegments.map(item => {
    const realPercent = (item.count / total) * 100
    return Math.max(minVisualWidth, realPercent)
  })

  const sumWidths = rawWidths.reduce((acc, cur) => acc + cur, 0)
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
 * 卡片点击交互：若已选中该项再次点击则切回全部
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

/* 左右双卡片网格布局 */
.overview-grid {
  display: grid;
  grid-template-columns: 385px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

/* ================= 1. 左侧健康总评卡片 (纯净平白卡片，无额外渐变装饰) ================= */
.health-score-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--el-border-color, #cbd5e1);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  }
}

/* 88x88 环形仪表盘容器（渐变仅作用于此处的进度弧线） */
.score-dial-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  user-select: none;
}

.score-dial-svg {
  width: 88px;
  height: 88px;
  display: block;
}

.score-dial-track {
  fill: none;
  stroke: var(--el-fill-color, #f1f5f9);
  stroke-width: 6;
}

.score-dial-arc {
  fill: none;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-dial-center {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-number-group {
  display: flex;
  align-items: baseline;
  justify-content: center;
  max-width: 100%;

  /* 针对 100 分及 3 位数进行专门排版适配，缩小字号并微收字间距，确保安全边距 */
  &.is-three-digits {
    .score-dial-val {
      font-size: 20px;
      letter-spacing: -0.8px;
    }
    .score-dial-unit {
      font-size: 10px;
      margin-left: 1px;
    }
  }
}

.score-dial-val {
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
  color: var(--el-text-color-primary, #0f172a);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
  transition: font-size 0.2s ease, letter-spacing 0.2s ease;
}

.score-dial-unit {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-text-color-secondary, #64748b);
  margin-left: 1.5px;
}

/* 评分右侧元数据区 */
.score-meta-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.meta-row-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary, #0f172a);
  white-space: nowrap;
}

.score-rule-tip-icon {
  font-size: 13px;
  color: var(--el-text-color-placeholder, #94a3b8);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--el-color-primary, #2563eb);
  }
}

.grade-pill-tag {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  padding: 2px 8px;
  border-radius: 999px;
  user-select: none;

  &.grade-pill--good {
    background: #ecfdf5;
    color: #059669;
  }
  &.grade-pill--warn {
    background: #fffbeb;
    color: #d97706;
  }
  &.grade-pill--danger {
    background: #fef2f2;
    color: #e11d48;
  }
  &.grade-pill--neutral {
    background: #f1f5f9;
    color: #64748b;
  }
}

.meta-row-hosts {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular, #64748b);
  white-space: nowrap;

  .hosts-stat-item {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
  }

  .hosts-label {
    color: var(--el-text-color-secondary, #64748b);
  }

  .hosts-val {
    color: var(--el-text-color-primary, #0f172a);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .hosts-unit {
    color: var(--el-text-color-secondary, #64748b);
  }

  .hosts-sep {
    color: var(--el-border-color, #cbd5e1);
    margin: 0 1px;
  }

  .hosts-stat-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 12px;
    color: var(--el-text-color-regular, #64748b);
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    transition: color 0.2s ease;

    &:hover {
      color: var(--el-color-primary, #2563eb);
      .hosts-val {
        color: var(--el-color-primary, #2563eb);
      }
    }
  }

  .hosts-all-pill {
    font-size: 10px;
    font-weight: 500;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--el-color-primary-light-9, rgba(59, 130, 246, 0.08));
    color: var(--el-color-primary, #2563eb);
    line-height: 16px;
    margin-left: 2px;
  }

  .hosts-reset-btn {
    background: var(--el-color-primary-light-9, rgba(59, 130, 246, 0.08));
    border: 1px solid var(--el-color-primary-light-7, rgba(59, 130, 246, 0.2));
    padding: 0 7px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 10px;
    color: var(--el-color-primary, #2563eb);
    line-height: 16px;
    display: inline-flex;
    align-items: center;
    margin-left: 2px;
    transition: all 0.2s ease;

    &:hover {
      background: var(--el-color-primary, #2563eb);
      color: #ffffff;
      border-color: var(--el-color-primary, #2563eb);
    }
  }
}

.meta-row-run {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .run-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--el-text-color-placeholder, #cbd5e1);
    flex-shrink: 0;

    &.is-COMPLETED {
      background: #10b981;
    }
    &.is-FAILED {
      background: #ef4444;
    }
    &.is-RUNNING {
      background: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }
    &.is-empty {
      background: #cbd5e1;
    }
  }

  .run-label {
    color: var(--el-text-color-secondary, #64748b);
  }

  .run-time {
    color: var(--el-text-color-secondary, #64748b);
    font-variant-numeric: tabular-nums;
  }

  .run-time-empty {
    color: var(--el-text-color-placeholder, #94a3b8);
  }

  .run-sep {
    color: var(--el-border-color, #cbd5e1);
    margin: 0 1px;
  }

  .run-detail-link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    color: var(--el-color-primary, #2563eb);
    display: inline-flex;
    align-items: center;
    gap: 2px;
    transition: color 0.2s ease;

    &:hover {
      color: #1d4ed8;
      text-decoration: underline;
    }
  }
}

/* ================= 2. 右侧资产分布与统计卡片 ================= */
.health-distrib-card {
  background: var(--el-bg-color, #ffffff);
  border: 1px solid var(--el-border-color-lighter, #e2e8f0);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--el-border-color, #cbd5e1);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  }
}

.distrib-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.distrib-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.distrib-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-text-color-primary, #0f172a);
}

.distrib-total {
  font-size: 12px;
  color: var(--el-text-color-secondary, #64748b);
}

.distrib-badge-wrap {
  font-size: 11px;
}

.risk-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 10px;
  border-radius: 999px;

  strong {
    font-weight: 700;
  }
}

.safe-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 10px;
  border-radius: 999px;
}

/* 连续堆叠色彩胶囊条 (7px 细条，轻薄圆润) */
.stacked-distribution-bar {
  height: 7px;
  width: 100%;
  border-radius: 999px;
  background: var(--el-fill-color-light, #f1f5f9);
  display: flex;
  overflow: hidden;
  gap: 3px;
  padding: 1px;
}

.stacked-bar-seg {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.seg--danger {
    background: #ef4444;
  }
  &.seg--warning {
    background: #f59e0b;
  }
  &.seg--success {
    background: #10b981;
  }
  &.seg--info {
    background: #94a3b8;
  }
  &.seg--muted {
    background: #cbd5e1;
  }
  &.seg--empty {
    background: var(--el-fill-color, #e2e8f0);
  }
}

/* 5 个指标筛选块（回退到修改前样式：纯净白底、统一浅边框控制台质感） */
.status-metrics-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.metric-filter-pill {
  --pill-color: #64748b;
  --pill-text-color: #475569;
  --pill-bg-default: var(--el-fill-color-blank, #ffffff);
  --pill-bg-hover: var(--el-fill-color-light, #f8fafc);
  --pill-bg-active: rgba(100, 116, 139, 0.08);
  --pill-border-default: var(--el-border-color-lighter, #e2e8f0);
  --pill-border-hover: var(--el-border-color, #cbd5e1);
  --pill-dot-glow: rgba(100, 116, 139, 0.2);

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

  &--danger,
  &.metric-pill--danger {
    --pill-color: #ef4444;
    --pill-text-color: #dc2626;
    --pill-bg-active: rgba(239, 68, 68, 0.08);
    --pill-dot-glow: rgba(239, 68, 68, 0.25);
  }

  &--warning,
  &.metric-pill--warning {
    --pill-color: #f59e0b;
    --pill-text-color: #d97706;
    --pill-bg-active: rgba(245, 158, 11, 0.08);
    --pill-dot-glow: rgba(245, 158, 11, 0.25);
  }

  &--success,
  &.metric-pill--success {
    --pill-color: #10b981;
    --pill-text-color: #059669;
    --pill-bg-active: rgba(16, 185, 129, 0.08);
    --pill-dot-glow: rgba(16, 185, 129, 0.25);
  }

  /* 不可达状态：石板冷灰（与上方堆叠分布条及状态标签保持灰调统一，避免误导为信息蓝） */
  &--info,
  &.metric-pill--info {
    --pill-color: #475569;
    --pill-text-color: #334155;
    --pill-bg-active: rgba(71, 85, 105, 0.1);
    --pill-dot-glow: rgba(71, 85, 105, 0.2);
  }

  /* 未巡检状态：柔和浅雾灰 */
  &--muted,
  &.metric-pill--muted {
    --pill-color: #94a3b8;
    --pill-text-color: #475569;
    --pill-bg-active: rgba(148, 163, 184, 0.1);
    --pill-dot-glow: rgba(148, 163, 184, 0.2);
  }

  &:hover {
    transform: translateY(-1px);
    background: var(--pill-bg-hover);
    border-color: var(--pill-border-hover);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  }

  /* 选中状态使用对应的专属颜色（边框、专属浅底色、圆点及高亮数值） */
  &.is-active {
    border-color: var(--pill-color);
    background: var(--pill-bg-active);
    box-shadow: 0 0 0 1px var(--pill-color) inset, 0 2px 10px rgba(15, 23, 42, 0.06);

    .pill-label {
      color: var(--el-text-color-primary, #0f172a);
      font-weight: 700;
    }

    .pill-dot {
      background: var(--pill-color);
      box-shadow: 0 0 0 2px var(--pill-dot-glow);
    }

    .pill-count-num {
      color: var(--pill-text-color);
    }

    .pill-percent-tag {
      color: var(--pill-text-color);
      font-weight: 600;
    }
  }

  /* 当有告警但【未选中】时：底色保持统一的默认白底，只高亮圆点和数字 */
  &.is-risk-focus:not(.is-active) {
    .pill-dot {
      background: #f59e0b;
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

  &--danger.has-count:not(.is-active),
  &.metric-pill--danger.has-count:not(.is-active) {
    .pill-dot {
      background: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.25);
    }
    .pill-count-num {
      color: #dc2626;
    }
    .pill-percent-tag {
      color: #dc2626;
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
  color: var(--el-text-color-regular, #64748b);
  line-height: 1;
}

.pill-percent-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--el-text-color-secondary, #94a3b8);
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
  color: var(--el-text-color-primary, #0f172a);
  font-variant-numeric: tabular-nums;
}

.metric-filter-pill.is-zero .pill-count-num {
  color: var(--el-text-color-placeholder, #cbd5e1);
}

.metric-filter-pill.is-zero:not(.is-active) .pill-dot {
  background: var(--el-text-color-placeholder, #cbd5e1);
  box-shadow: none;
}

.pill-unit-text {
  font-size: 10px;
  color: var(--el-text-color-secondary, #64748b);
}

/* ================= 深色模式适配 ================= */
:global(html.dark) {
  .health-score-card,
  .health-distrib-card {
    background: var(--el-bg-color-overlay, #1e293b);
    border-color: var(--el-border-color-lighter, #334155);
  }

  .distrib-title,
  .meta-title {
    color: var(--el-text-color-primary, #f1f5f9);
  }
}

/* ================= 响应式断点适配 ================= */
@media (max-width: 1320px) {
  .overview-grid {
    grid-template-columns: 1fr;
    gap: 12px;
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
