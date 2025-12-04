<template>
  <div class="module-page" :class="{ 'no-header': hideHeader }">
    <header v-if="!hideHeader" class="module-page__header">
      <div class="module-page__title">
        <h1>{{ title }}</h1>
        <!-- <p v-if="description" class="module-page__description">{{ description }}</p> -->
      </div>
      <div class="module-page__actions">
        <slot name="actions" />
      </div>
    </header>

    <section v-if="!hideHeader" class="module-page__toolbar">
      <slot name="toolbar" />
    </section>

    <main class="module-page__body" :class="{ 'full-height': hideHeader }">
      <slot />
    </main>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  hideHeader: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped lang="scss">
.module-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.module-page__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 8px 32px 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.03) 0%, rgba(15, 23, 42, 0) 100%);
}

.module-page__title h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}

.module-page__description {
  margin: 8px 0 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
}

.module-page__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-page__toolbar {
  padding: 0 32px 20px;
}

.module-page__body {
  flex: 1;
  padding: 0 32px 32px 0;
  overflow: auto;
  background: linear-gradient(180deg, rgba(241, 245, 249, 0.6) 0%, rgba(248, 250, 252, 0.6) 100%);
  font-size: 13px;

  &.full-height {
    padding: 0;
  }
}

.module-page.no-header {
  .module-page__body {
    padding: 0;
    background: #fff;
  }
}

@media (max-width: 1024px) {
  .module-page {
    border-radius: 0;
  }

  .module-page__header {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px 20px 12px;
    gap: 12px;
  }

  .module-page__toolbar {
    padding: 0 20px 16px;
  }

  .module-page__body {
    padding: 0 20px 24px;
  }
}
</style>
