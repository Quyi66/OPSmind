<template>
  <label class="language-switcher">
    <span class="sr-only">{{ t('common.language') }}</span>
    <select :value="locale" :aria-label="t('common.language')" :disabled="pending" @change="change">
      <option v-for="option in LANGUAGE_OPTIONS" :key="option.value" :value="option.value" :title="option.label" :aria-label="option.label">
        {{ option.shortLabel || option.label }}
      </option>
    </select>
    <span v-if="error" role="alert" class="language-error">{{ error }}</span>
  </label>
</template>

<script setup>
import { useAppI18n } from '@/core/i18n'
import { LANGUAGE_OPTIONS } from '@/core/i18n/locales'
import { message, messageRef } from '@/core/i18n/feedback'

const { t, locale, pending, setLocale } = useAppI18n()
const error = messageRef('')
async function change(event) {
  const selected = event.target.value
  // A failed load must leave the select and the effective language in agreement.
  event.target.value = locale.value
  error.value = ''
  try {
    await setLocale(selected)
  } catch {
    error.value = message('common.languageLoadFailed')
  }
}
</script>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.language-switcher select {
  min-width: 88px;
  height: 30px;
  padding: 4px 6px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  color: var(--el-text-color-primary, #303133);
  background: var(--el-bg-color, #fff);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.language-switcher select:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
}
.language-error {
  position: absolute;
  right: 0;
  top: 100%;
  width: 240px;
  padding: 8px;
  background: var(--el-bg-color, #fff);
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
  z-index: 1;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
