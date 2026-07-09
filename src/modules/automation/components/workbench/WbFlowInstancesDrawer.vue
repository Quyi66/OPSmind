<script setup>
import { formatDateTime as formatDateTimeGlobal } from '../../utils/helpers'
const VALID_TAG_TYPES = new Set(['primary', 'success', 'warning', 'info', 'danger'])

function formatDateTime(value) {
  return formatDateTimeGlobal(value, 'MM-DD HH:mm')
}

defineProps({
  title: { type: String, default: '流程实例' },
  instances: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  link: { type: String, default: '/flow/execution' },
  linkLabel: { type: String, default: '前往执行记录页' }
})

const emit = defineEmits(['navigate', 'view'])
const visible = defineModel('visible', { default: false })

function safeTagType(type) {
  return VALID_TAG_TYPES.has(type) ? type : 'info'
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="title"
    size="560px"
    destroy-on-close
    class="wb-workbench-drawer"
  >
    <template #footer>
      <div class="wb-drawer-footer">
        <span class="wb-drawer-footer__total">共 {{ instances.length }} 条</span>
        <el-button link size="small" @click="emit('navigate', link)">{{ linkLabel }}</el-button>
      </div>
    </template>

    <div class="wb-drawer-body" v-loading="loading">
      <div v-if="instances.length" class="wb-flow-instance-list">
        <div v-for="item in instances" :key="item.id" class="wb-flow-instance-item">
          <div class="wb-flow-instance-item__info">
            <div class="wb-flow-instance-item__top">
              <span class="wb-flow-instance-item__name">{{ item.name }}</span>
              <div class="wb-flow-instance-item__tools">
                <el-tag size="small" :type="safeTagType(item.statusType)" effect="plain">
                  {{ item.statusLabel }}
                </el-tag>
                <el-button
                  class="wb-inline-action"
                  text
                  type="primary"
                  size="small"
                  @click.stop="emit('view', item)"
                >
                  详情
                </el-button>
              </div>
            </div>
            <span class="wb-flow-instance-item__meta">
              {{ formatDateTime(item.createdAt) }}
              <template v-if="item.createdBy">· {{ item.createdBy }}</template>
              · 主机 {{ item.hostCount }} · 步骤 {{ item.stepCount }}
            </span>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无流程实例" :image-size="60" />
    </div>
  </el-drawer>
</template>

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

.wb-flow-instance-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-flow-instance-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  transition:
    background 0.15s,
    border-color 0.15s;

  &:hover {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__tools {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;

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

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: var(--wb-text-primary, #1e293b);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 11px;
    color: var(--wb-text-muted, #94a3b8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.wb-drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  &__total {
    font-size: 12px;
    color: var(--wb-text-muted, #94a3b8);
  }
}
</style>

<style>
html.dark .wb-flow-instance-item:hover {
  background: #273549;
  border-color: #334155;
}
</style>
