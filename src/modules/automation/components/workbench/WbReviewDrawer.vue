<template>
  <el-drawer
    v-model="visible"
    :title="title"
    size="540px"
    destroy-on-close
    class="wb-workbench-drawer"
  >
    <div v-loading="loading" class="wb-drawer-body">
      <div v-if="records.length" class="wb-drawer-run-list">
        <div v-for="item in records" :key="item.id" class="wb-drawer-run-item">
          <div class="wb-drawer-run-item__info">
            <strong class="wb-drawer-run-item__name">{{ item.name }}</strong>
            <span
              class="wb-drawer-run-item__meta"
              :class="{ 'wb-drawer-run-item__meta--code': item.metaCode }"
            >
              {{ item.meta }}
            </span>
          </div>
          <div class="wb-drawer-run-item__right">
            <el-tag size="small" :type="safeTagType(item.tagType)" effect="plain">
              {{ item.tagLabel }}
            </el-tag>
            <div
              v-if="drawerType === 'approval' || drawerType === 'command'"
              class="wb-drawer-run-item__actions"
            >
              <el-button
                class="wb-inline-action"
                link
                type="success"
                size="small"
                @click.stop="$emit('approve', item)"
              >
                通过
              </el-button>
              <el-button
                class="wb-inline-action"
                link
                type="danger"
                size="small"
                @click.stop="$emit('reject', item)"
              >
                拒绝
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else :description="emptyText" :image-size="60" />
    </div>
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">共 {{ records.length }} 条</span>
        <el-button size="small" @click="$emit('navigate', link)">{{ linkLabel }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: '待审核列表' },
  records: { type: Array, default: () => [] },
  loading: Boolean,
  link: { type: String, default: '' },
  linkLabel: { type: String, default: '前往审核页面' },
  emptyText: { type: String, default: '暂无待审核记录' },
  drawerType: { type: String, default: '' } // 'approval' | 'command' | 'script'
})

defineEmits(['navigate', 'approve', 'reject'])

const visible = defineModel('visible', { default: false })
const VALID_TAG_TYPES = new Set(['primary', 'success', 'warning', 'info', 'danger'])

function safeTagType(type) {
  return VALID_TAG_TYPES.has(type) ? type : 'info'
}
</script>

<style scoped lang="scss">
:deep(.el-drawer__header) {
  margin-bottom: 4px !important;
  padding: 16px 16px 0 !important;
}

:deep(.el-drawer__footer) {
  padding-top: 8px;
}

.wb-drawer-body {
  padding: 8px 12px 12px;
  min-height: 60px;
}

.wb-drawer-run-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-drawer-run-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  &:hover .wb-drawer-run-item__actions {
    opacity: 1;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0;
    opacity: 0;
    transition: opacity 0.15s;

    :deep(.wb-inline-action.el-button) {
      min-width: auto !important;
      min-height: auto !important;
      height: 22px !important;
      padding: 0 3px !important;
      font-size: 12px !important;
      line-height: 1 !important;
    }

    :deep(.wb-inline-action.el-button + .wb-inline-action.el-button) {
      margin-left: 0 !important;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 11px;
    color: var(--wb-text-muted);

    &--code {
      font-family: monospace;
      font-size: 10px;
    }
  }
}

.wb-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__total {
    font-size: 12px;
    color: var(--wb-text-muted);
  }
}
</style>
