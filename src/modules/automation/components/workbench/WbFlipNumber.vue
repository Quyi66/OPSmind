<template>
  <span class="wb-flip-number" :class="`wb-flip-number--${size}`" :aria-label="displayValue">
    <span
      v-for="(char, index) in displayChars"
      :key="`slot-${index}`"
      class="wb-flip-number__slot"
      :class="{ 'wb-flip-number__slot--separator': isSeparator(char) }"
    >
      <transition
        :name="isSeparator(char) ? 'wb-flip-number__noop' : 'wb-flip-number__digit'"
        mode="out-in"
      >
        <span :key="`${index}-${char}`" class="wb-flip-number__char">{{ char }}</span>
      </transition>
    </span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  size: { type: String, default: 'md' }
})

const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return Number.isFinite(props.value) ? String(Math.trunc(props.value)) : '0'
  }

  if (props.value == null || props.value === '') {
    return '0'
  }

  return String(props.value)
})

const displayChars = computed(() => displayValue.value.split(''))

function isSeparator(char) {
  return /[^\d]/.test(char)
}
</script>

<style scoped lang="scss">
.wb-flip-number {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.03em;
  line-height: 1;
  color: inherit;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';

  &--sm {
    font-size: 0.92em;
  }
}

.wb-flip-number__slot {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 0.62em;
  height: 1.08em;
  overflow: hidden;
}

.wb-flip-number__slot--separator {
  min-width: 0.34em;
  overflow: visible;
}

.wb-flip-number__char {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  min-width: 100%;
  color: inherit;
}

.wb-flip-number__digit-enter-active,
.wb-flip-number__digit-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}

.wb-flip-number__digit-enter-from {
  opacity: 0;
  transform: translateY(68%);
}

.wb-flip-number__digit-leave-to {
  opacity: 0;
  transform: translateY(-68%);
}
</style>
