<template>
  <div class="yum-ov">
    <!-- <section v-if="overviewStats.totalSources" class="yum-ov__hero">
      <div class="yum-ov__progress">
        <div class="yum-ov__progress-top">
          <div class="yum-ov__progress-copy">
            <span class="yum-ov__progress-label">仓库状态分布</span>
            <span class="yum-ov__progress-note">{{ overviewProgressNote }}</span>
          </div>
          <strong class="yum-ov__progress-value">{{ overviewCoverageLabel }}</strong>
        </div>

        <div class="yum-ov__progress-track" aria-hidden="true">
          <span
            v-for="segment in overviewProgressSegments"
            :key="segment.key"
            class="yum-ov__progress-segment"
            :class="`yum-ov__progress-segment--${segment.tone}`"
            :style="{ flexGrow: segment.value, opacity: segment.value ? 1 : 0 }"
          />
        </div>

        <div class="yum-ov__progress-meta">
          <span
            v-for="segment in overviewProgressSegments"
            :key="`${segment.key}-meta`"
            class="yum-ov__progress-chip"
            :class="`yum-ov__progress-chip--${segment.tone}`"
          >
            <i class="yum-ov__progress-dot" />
            <span class="yum-ov__progress-chip-label">{{ segment.label }}</span>
            <strong class="yum-ov__progress-chip-value">{{ formatMetricValue(segment.value) }}</strong>
            <span class="yum-ov__progress-chip-rate">{{ segment.rate }}</span>
          </span>
        </div>
      </div>
    </section> -->

    <div v-if="loading" class="yum-ov__placeholder">
      <div class="yum-ov__placeholder-title">正在同步仓库比对状态…</div>
    </div>

    <div v-else-if="!overviewSources.length" class="yum-ov__placeholder yum-ov__placeholder--empty">
      <div class="yum-ov__placeholder-title">暂无仓库数据</div>
    </div>

    <div v-else class="yum-ov__scroller">
      <div class="yum-ov__grid" :style="{ '--yum-card-count': String(overviewSources.length) }">
        <button
          v-for="item in overviewSources"
          :key="resolveYumRepoId(item)"
          type="button"
          class="yum-card"
          :class="[
            `yum-card--${getCardTone(item)}`,
            { 'yum-card--active': isActiveRepo(item) }
          ]"
          :aria-pressed="isActiveRepo(item)"
          :title="getYumRepoLabel(item)"
          @click="emit('update:selectedRepoId', resolveYumRepoId(item))"
        >
          <span class="yum-card__halo" />

          <div class="yum-card__header">
            <div class="yum-card__name-wrap">
              <div class="yum-card__name">{{ getYumRepoLabel(item) }}</div>
              <span v-if="isActiveRepo(item)" class="yum-card__selected-mark">当前</span>
            </div>
            <span class="yum-card__state-pill">{{ getCardHeadline(item) }}</span>
          </div>

          <div
            class="yum-card__hero-metric"
            :class="`yum-card__hero-metric--${getCardHero(item).tone}`"
          >
            <span class="yum-card__hero-label">{{ getCardHero(item).label }}</span>
            <div class="yum-card__hero-value">{{ getCardHero(item).value }}</div>
          </div>

          <div v-if="item.summary" class="yum-card__footnote">
            {{ getCardFootnote(item) }}
          </div>

          <div v-else class="yum-card__empty-hint">
            <span class="yum-card__empty-dot" />
            <span>{{ getOverviewHint(item) }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber, normalizeBoolean, pickValue } from '../../utils'
import {
  getYumRepoLabel,
  resolveYumRepoId,
  unwrapResponse
} from '../../yumRepoUtils'

const props = defineProps({
  overviewData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  selectedRepoId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedRepoId'])

const activeRepoId = computed(() => String(props.selectedRepoId || '').trim())

const overviewSources = computed(() => {
  const data = unwrapResponse(props.overviewData)
  return Array.isArray(data?.sources) ? data.sources : []
})

function formatMetricValue(value) {
  return formatNumber(value)
}

function isActiveRepo(row) {
  return resolveYumRepoId(row) === activeRepoId.value
}

function getCollectStatus(row) {
  return String(pickValue(row, ['collectStatus', 'collect_status'], '')).trim()
}

function getPassedState(row) {
  const summaryPassed = pickValue(row?.summary, ['passed'], null)
  if (summaryPassed !== null && summaryPassed !== undefined && summaryPassed !== '') {
    return normalizeBoolean(summaryPassed)
  }

  const passed = pickValue(row, ['passed'], null)
  if (passed === null || passed === undefined || passed === '') return null

  return normalizeBoolean(passed)
}

function getOverviewHint(row) {
  const status = getCollectStatus(row)
  if (!status || status === 'NOT_COLLECTED' || status === 'UNCOLLECTED') return '尚未采集软件包清单'
  if (status === 'FAILED') return '最近一次采集失败，请重新执行'
  if (status === 'PENDING' || status === 'RUNNING') return '仓库正在采集中，完成后会自动继续比对'
  return '已采集，正在自动生成比对结果；如长时间未出现可手动重试'
}

function getCardTone(row) {
  const status = getCollectStatus(row)
  if (status === 'FAILED') return 'danger'
  if (status === 'PENDING' || status === 'RUNNING') return 'pending'

  const passed = getPassedState(row)
  if (passed === true) return 'success'
  if (passed === false && row?.summary) return 'danger'
  if (status === 'SUCCESS') return 'ready'
  return 'idle'
}

function getCardHeadline(row) {
  const tone = getCardTone(row)
  if (tone === 'success') return '比对通过'
  if (tone === 'danger') return getCollectStatus(row) === 'FAILED' ? '采集失败' : '比对不通过'
  if (tone === 'pending') return '采集中'
  if (tone === 'ready') return '待比对'
  return '未采集'
}

function getCardHero(row) {
  const status = getCollectStatus(row)
  const summary = row?.summary

  if (status === 'PENDING' || status === 'RUNNING') {
    return {
      value: '...',
      label: '采集中',
      tone: 'idle'
    }
  }

  if (!summary) {
    if (status === 'FAILED') {
      return {
        value: '!',
        label: '采集失败',
        tone: 'danger'
      }
    }

    if (status === 'SUCCESS') {
      return {
        value: '0',
        label: '待自动比对',
        tone: 'ready'
      }
    }

    return {
      value: '--',
      label: '未采集',
      tone: 'idle'
    }
  }

  const missingPackages = pickValue(summary, ['missingPackages', 'missing_packages'], 0)

  return {
    value: formatMetricValue(missingPackages),
    label: '缺失包',
    tone: getPassedState(row) ? 'success' : 'danger'
  }
}

function getCardFootnote(row) {
  const packageCount = Number(pickValue(row, ['packageCount', 'package_count'], 0) || 0)
  const groupByOs = Array.isArray(row?.groupByOs) ? row.groupByOs.length : 0

  if (packageCount > 0) {
    return `已采集 ${formatMetricValue(packageCount)} 个软件包`
  }

  if (groupByOs > 1) {
    return `已按 ${formatMetricValue(groupByOs)} 个 OS 维度汇总`
  }

  return '已完成最近一次补丁比对'
}
</script>

<style scoped lang="scss">
.yum-ov {
  --yum-border: color-mix(in srgb, var(--el-border-color) 84%, var(--el-text-color-primary) 16%);
  --yum-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  --yum-card-min-width: 282px;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.yum-ov__hero {
  position: relative;
  padding: 14px 16px;
  border: 1px solid var(--yum-border);
  border-radius: 14px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--el-color-primary-light-8) 72%, transparent 28%), transparent 38%),
    linear-gradient(135deg, color-mix(in srgb, var(--el-bg-color) 92%, var(--el-color-primary-light-9) 8%), color-mix(in srgb, var(--el-bg-color) 90%, var(--el-fill-color-light) 10%));
  box-shadow: var(--yum-shadow);
}

.yum-ov__hero::after {
  content: '';
  position: absolute;
  right: -28px;
  top: -48px;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-color-success-light-8) 68%, transparent 32%);
  filter: blur(8px);
  opacity: 0.45;
  pointer-events: none;
}

.yum-ov__progress {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
}

.yum-ov__progress-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.yum-ov__progress-copy {
  display: grid;
  gap: 3px;
}

.yum-ov__progress-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.yum-ov__progress-note {
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.yum-ov__progress-value {
  font-size: 22px;
  line-height: 1;
  font-weight: 700;
  color: var(--el-color-primary);
  white-space: nowrap;
}

.yum-ov__progress-track {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
}

.yum-ov__progress-segment {
  min-width: 0;
  border-radius: 999px;
}

.yum-ov__progress-segment--success { background: var(--el-color-success); }
.yum-ov__progress-segment--danger { background: var(--el-color-danger); }
.yum-ov__progress-segment--idle { background: color-mix(in srgb, var(--el-color-info) 70%, var(--el-border-color) 30%); }

.yum-ov__progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.yum-ov__progress-chip {
  --chip-accent: var(--el-text-color-regular);

  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 600;
  color: color-mix(in srgb, var(--chip-accent) 72%, var(--el-text-color-primary) 28%);
}

.yum-ov__progress-chip--success { --chip-accent: var(--el-color-success); }
.yum-ov__progress-chip--danger { --chip-accent: var(--el-color-danger); }
.yum-ov__progress-chip--idle { --chip-accent: var(--el-color-info); }

.yum-ov__progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.yum-ov__progress-chip-value {
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.yum-ov__progress-chip-rate {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

.yum-ov__placeholder {
  position: relative;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--el-border-color) 75%, var(--el-color-primary) 25%);
  flex-shrink: 0;
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-fill-color-light) 70%, var(--el-bg-color) 30%), color-mix(in srgb, var(--el-fill-color-lighter) 78%, var(--el-bg-color) 22%));
  overflow: hidden;
}

.yum-ov__placeholder::before {
  content: '';
  position: absolute;
  inset: auto -32px -32px auto;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--el-color-primary-light-8) 70%, transparent 30%);
  opacity: 0.55;
}

.yum-ov__placeholder--empty::before {
  background: color-mix(in srgb, var(--el-color-info-light-7) 72%, transparent 28%);
}

.yum-ov__placeholder-title {
  position: relative;
  z-index: 1;
}

.yum-ov__placeholder-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.yum-ov__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 14px;
  scrollbar-width: none;
  scrollbar-color: transparent transparent;
}

.yum-ov__scroller:hover,
.yum-ov__scroller:focus-within {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--el-border-color-dark) 70%, var(--el-text-color-secondary) 30%) transparent;
}

.yum-ov__scroller::-webkit-scrollbar {
  height: 0;
}

.yum-ov__scroller:hover::-webkit-scrollbar,
.yum-ov__scroller:focus-within::-webkit-scrollbar {
  height: 10px;
}

.yum-ov__scroller::-webkit-scrollbar-track {
  background: transparent;
}

.yum-ov__scroller::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 999px;
}

.yum-ov__scroller:hover::-webkit-scrollbar-thumb,
.yum-ov__scroller:focus-within::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--el-border-color-dark) 70%, var(--el-text-color-secondary) 30%);
}

.yum-ov__scroller:hover::-webkit-scrollbar-thumb:hover,
.yum-ov__scroller:focus-within::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--el-text-color-secondary) 78%, var(--el-text-color-primary) 22%);
}

.yum-ov__grid {
  --yum-card-count: 1;
  --yum-card-gap: 12px;

  display: grid;
  grid-template-columns: repeat(var(--yum-card-count), minmax(var(--yum-card-min-width), 1fr));
  gap: var(--yum-card-gap);
  width: max(
    100%,
    calc(
      var(--yum-card-count) * var(--yum-card-min-width) +
      (var(--yum-card-count) - 1) * var(--yum-card-gap)
    )
  );
}

.yum-card {
  --card-accent: var(--el-text-color-placeholder);
  --card-surface: linear-gradient(180deg, color-mix(in srgb, var(--card-accent) 6%, var(--el-bg-color) 94%), color-mix(in srgb, var(--card-accent) 10%, var(--el-bg-color) 90%));
  --card-border: color-mix(in srgb, var(--card-accent) 22%, var(--el-border-color) 78%);
  --card-pill-bg: color-mix(in srgb, var(--card-accent) 12%, transparent 88%);
  --card-shadow: 0 8px 18px rgba(15, 23, 42, 0.05), 0 2px 6px rgba(15, 23, 42, 0.04);
  --card-shadow-hover: 0 14px 28px rgba(15, 23, 42, 0.08), 0 4px 10px rgba(15, 23, 42, 0.05);
  --card-shadow-active: 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 68%, transparent 32%), 0 16px 30px rgba(15, 23, 42, 0.1), 0 5px 12px rgba(15, 23, 42, 0.06);

  position: relative;
  appearance: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  height: 100%;
  padding: 14px;
  border: 1px solid var(--card-border);
  border-radius: 16px;
  background: var(--card-surface);
  box-shadow: var(--card-shadow);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.yum-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.yum-card:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.yum-card--idle { --card-accent: var(--el-color-info); }
.yum-card--pending { --card-accent: var(--el-color-warning); }
.yum-card--ready { --card-accent: var(--el-color-primary); }
.yum-card--success { --card-accent: var(--el-color-success); }
.yum-card--danger { --card-accent: var(--el-color-danger); }

.yum-card--active {
  border-color: color-mix(in srgb, var(--el-color-primary) 58%, var(--card-accent) 42%);
  box-shadow: var(--card-shadow-active);
}

.yum-card__halo {
  position: absolute;
  right: -22px;
  top: -22px;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--card-accent) 20%, transparent 80%);
  filter: blur(10px);
  opacity: 0.48;
  pointer-events: none;
}

.yum-card__header,
.yum-card__name,
.yum-card__hero-metric,
.yum-card__footnote,
.yum-card__empty-hint {
  position: relative;
  z-index: 1;
}

.yum-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.yum-card__name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.yum-card__state-pill,
.yum-card__selected-mark {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.yum-card__state-pill {
  background: var(--card-pill-bg);
  border: 1px solid color-mix(in srgb, var(--card-accent) 18%, transparent 82%);
  color: color-mix(in srgb, var(--card-accent) 72%, var(--el-text-color-primary) 28%);
}

.yum-card__selected-mark {
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent 86%);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 22%, transparent 78%);
  color: var(--el-color-primary-dark-2);
}

.yum-card__name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-clamp: 1;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.yum-card__hero-metric {
  --hero-accent: var(--card-accent);

  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 13px;
  border-radius: 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hero-accent) 11%, transparent 89%), color-mix(in srgb, var(--hero-accent) 5%, var(--el-bg-color) 95%));
  border: 1px solid color-mix(in srgb, var(--hero-accent) 18%, transparent 82%);
}

.yum-card__hero-metric--idle { --hero-accent: var(--el-color-info); }
.yum-card__hero-metric--ready { --hero-accent: var(--el-color-primary); }
.yum-card__hero-metric--success { --hero-accent: var(--el-color-success); }
.yum-card__hero-metric--warning { --hero-accent: #f08c2e; }
.yum-card__hero-metric--danger { --hero-accent: var(--el-color-danger); }

.yum-card__hero-value {
  font-size: clamp(24px, 2.2vw, 32px);
  line-height: 1;
  font-weight: 700;
  color: color-mix(in srgb, var(--hero-accent) 82%, var(--el-text-color-primary) 18%);
}

.yum-card__hero-label {
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--hero-accent) 72%, var(--el-text-color-primary) 28%);
}

.yum-card__footnote {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  margin-top: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.yum-card__empty-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  min-height: 40px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--card-accent) 22%, transparent 78%);
  background: color-mix(in srgb, var(--card-accent) 6%, transparent 94%);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 1.5;
}

.yum-card__empty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--card-accent);
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .yum-ov__progress-top {
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .yum-ov {
    --yum-card-min-width: 220px;
  }

  .yum-ov__hero,
  .yum-ov__placeholder,
  .yum-card {
    border-radius: 14px;
  }

  .yum-ov__hero {
    padding: 10px 12px;
  }

  .yum-ov__progress-value {
    font-size: 18px;
  }

  .yum-ov__progress-meta {
    gap: 6px 12px;
  }

  .yum-card__hero-metric {
    align-items: center;
  }
}
</style>
