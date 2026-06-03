<template>
  <div class="win-patch-summary">
    <div
      v-for="(item, index) in items"
      :key="item.label"
      class="win-patch-summary__card"
      :class="{ 'win-patch-summary__card--compact': compact }"
      :style="getCardTheme(index)"
    >
      <div class="win-patch-summary__wash"></div>
      <div class="win-patch-summary__panel"></div>
      <div class="win-patch-summary__glow"></div>
      <div class="win-patch-summary__head">
        <span class="win-patch-summary__badge">{{ resolveBadge(item, index) }}</span>
        <span class="win-patch-summary__index">{{ formatIndex(index) }}</span>
      </div>
      <div class="win-patch-summary__label">{{ item.label }}</div>
      <div class="win-patch-summary__value-row">
        <div class="win-patch-summary__value">{{ item.value }}</div>
        <div class="win-patch-summary__spark"></div>
      </div>
      <div v-if="item.helper" class="win-patch-summary__helper">
        <span class="win-patch-summary__helper-dot"></span>
        <span>{{ item.helper }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const CARD_THEMES = [
  {
    accent: '#2f6fed',
    accentSoft: 'rgba(47, 111, 237, 0.16)',
    accentGlow: 'rgba(47, 111, 237, 0.24)',
    border: 'rgba(47, 111, 237, 0.16)',
    badgeBg: 'rgba(47, 111, 237, 0.12)'
  },
  {
    accent: '#159a7b',
    accentSoft: 'rgba(21, 154, 123, 0.16)',
    accentGlow: 'rgba(21, 154, 123, 0.22)',
    border: 'rgba(21, 154, 123, 0.16)',
    badgeBg: 'rgba(21, 154, 123, 0.12)'
  },
  {
    accent: '#d46b08',
    accentSoft: 'rgba(212, 107, 8, 0.16)',
    accentGlow: 'rgba(212, 107, 8, 0.22)',
    border: 'rgba(212, 107, 8, 0.16)',
    badgeBg: 'rgba(212, 107, 8, 0.12)'
  },
  {
    accent: '#c2418f',
    accentSoft: 'rgba(194, 65, 143, 0.16)',
    accentGlow: 'rgba(194, 65, 143, 0.22)',
    border: 'rgba(194, 65, 143, 0.16)',
    badgeBg: 'rgba(194, 65, 143, 0.12)'
  }
]

function getCardTheme(index) {
  const theme = CARD_THEMES[index % CARD_THEMES.length]
  return {
    '--summary-accent': theme.accent,
    '--summary-accent-soft': theme.accentSoft,
    '--summary-accent-glow': theme.accentGlow,
    '--summary-card-border': theme.border,
    '--summary-badge-bg': theme.badgeBg
  }
}

function resolveBadge(item, index) {
  const label = String(item?.label || '')
  if (label.includes('主机')) return '资产'
  if (label.includes('缺失')) return '风险'
  return ['概览', '统计', '监控', '指标'][index % 4]
}

function formatIndex(index) {
  return String(index + 1).padStart(2, '0')
}
</script>

<style scoped lang="scss">
.win-patch-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
  gap: 16px;
}

.win-patch-summary__card {
  position: relative;
  overflow: hidden;
  min-height: 156px;
  padding: 18px 18px 16px;
  border: 1px solid var(--summary-card-border);
  border-radius: 22px;
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.98) 0%,
    rgba(248, 250, 253, 0.96) 52%,
    rgba(243, 247, 251, 0.98) 100%
  );
  box-shadow:
    0 18px 38px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease;
}

.win-patch-summary__card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 24px 48px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.win-patch-summary__card::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 0;
  height: 5px;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(90deg, var(--summary-accent), rgba(255, 255, 255, 0) 82%);
}

.win-patch-summary__wash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, var(--summary-accent-soft) 0%, transparent 30%),
    radial-gradient(circle at 88% 14%, var(--summary-accent-glow) 0%, transparent 28%);
  opacity: 0.95;
  transition:
    transform 0.24s ease,
    opacity 0.24s ease;
}

.win-patch-summary__card:hover .win-patch-summary__wash {
  transform: scale(1.04);
  opacity: 1;
}

.win-patch-summary__panel {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 122px;
  height: 78px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.14)),
    repeating-linear-gradient(135deg, transparent 0 11px, rgba(255, 255, 255, 0.28) 11px 12px);
  backdrop-filter: blur(8px);
  opacity: 0.75;
  transform: rotate(-8deg);
  transition:
    transform 0.24s ease,
    opacity 0.24s ease;
}

.win-patch-summary__card:hover .win-patch-summary__panel {
  opacity: 0.88;
  transform: rotate(-5deg) translateY(-2px);
}

.win-patch-summary__glow {
  position: absolute;
  top: -28px;
  right: -14px;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--summary-accent-soft) 0%, transparent 72%);
  opacity: 0.9;
  pointer-events: none;
}

.win-patch-summary__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.win-patch-summary__badge {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.68);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.72)),
    var(--summary-badge-bg);
  color: var(--summary-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 18px rgba(255, 255, 255, 0.3);
}

.win-patch-summary__index {
  color: var(--summary-accent);
  font-size: 13px;
  font-weight: 700;
  opacity: 0.8;
  letter-spacing: 0.08em;
}

.win-patch-summary__label {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  font-size: 15px;
  font-weight: 700;
  color: #243144;
}

.win-patch-summary__value-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.win-patch-summary__value {
  font-size: 38px;
  font-weight: 800;
  line-height: 0.96;
  letter-spacing: -0.04em;
  color: #0f172a;
  text-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.win-patch-summary__spark {
  position: relative;
  flex: 0 0 76px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.28)),
    linear-gradient(
      135deg,
      transparent 0 18%,
      var(--summary-accent) 18% 23%,
      transparent 23% 40%,
      var(--summary-accent) 40% 45%,
      transparent 45% 62%,
      var(--summary-accent) 62% 67%,
      transparent 67% 100%
    );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.win-patch-summary__spark::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--summary-accent-soft), rgba(255, 255, 255, 0));
}

.win-patch-summary__helper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 12px;
  line-height: 1.58;
  color: #5d6b7f;
}

.win-patch-summary__helper-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--summary-accent);
  box-shadow: 0 0 0 6px var(--summary-badge-bg);
}

.win-patch-summary__card--compact {
  min-height: 132px;
  padding: 16px 16px 14px;
  border-radius: 20px;
}

.win-patch-summary__card--compact .win-patch-summary__panel {
  top: 12px;
  right: 12px;
  width: 100px;
  height: 64px;
  border-radius: 18px;
}

.win-patch-summary__card--compact .win-patch-summary__badge {
  height: 26px;
  padding: 0 9px;
  font-size: 11px;
}

.win-patch-summary__card--compact .win-patch-summary__index {
  font-size: 12px;
}

.win-patch-summary__card--compact .win-patch-summary__label {
  margin-top: 12px;
  font-size: 13px;
}

.win-patch-summary__card--compact .win-patch-summary__value-row {
  margin-top: 10px;
}

.win-patch-summary__card--compact .win-patch-summary__value {
  font-size: 32px;
}

.win-patch-summary__card--compact .win-patch-summary__spark {
  flex-basis: 64px;
  height: 40px;
}

.win-patch-summary__card--compact .win-patch-summary__helper {
  margin-top: 12px;
  padding-top: 10px;
  font-size: 11px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .win-patch-summary {
    grid-template-columns: 1fr;
  }

  .win-patch-summary__card {
    min-height: 138px;
  }

  .win-patch-summary__value {
    font-size: 30px;
  }

  .win-patch-summary__panel {
    width: 92px;
    height: 58px;
  }

  .win-patch-summary__spark {
    flex-basis: 60px;
    height: 38px;
  }
}
</style>
