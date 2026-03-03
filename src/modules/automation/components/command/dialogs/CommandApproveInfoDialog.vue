<template>
  <el-dialog
    v-model="dialogVisible"
    title="审核详情"
    width="600px"
    :close-on-click-modal="true"
    destroy-on-close
    @close="handleClose"
  >
    <div v-if="command" class="approve-info">
      <div class="info-item">
        <label>命令名称</label>
        <div class="value">{{ command.name }}</div>
      </div>

      <div class="info-item">
        <label>语法类型</label>
        <div class="value">
          <el-tag size="small" type="info">{{ command.type || '-' }}</el-tag>
        </div>
      </div>

      <div class="info-item">
        <label>当前状态</label>
        <div class="value">
          <el-tag :type="getStatusType(command.status)" size="default">
            {{ getStatusText(command.status) }}
          </el-tag>
        </div>
      </div>

      <div v-if="command.command" class="info-item">
        <label>已发布内容</label>
        <div class="code-block">
          <pre>{{ command.command }}</pre>
        </div>
      </div>

      <div v-if="command.unapprovedCommand" class="info-item">
        <label>待审核内容</label>
        <div class="code-block pending">
          <pre>{{ command.unapprovedCommand }}</pre>
        </div>
      </div>

      <div v-if="command.unapprovedReason" class="info-item">
        <label>审核原因</label>
        <div class="reason-block">
          {{ command.unapprovedReason }}
        </div>
      </div>

      <div class="info-item">
        <label>创建人</label>
        <div class="value">{{ command.createdBy || '-' }}</div>
      </div>

      <div v-if="command.checkBy" class="info-item">
        <label>审核人</label>
        <div class="value">{{ command.checkBy }}</div>
      </div>

      <div class="info-item">
        <label>创建时间</label>
        <div class="value">{{ formatDate(command.createdAt) }}</div>
      </div>

      <div v-if="command.updatedAt" class="info-item">
        <label>更新时间</label>
        <div class="value">{{ formatDate(command.updatedAt) }}</div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { getCommandStatusInfo } from '@/modules/automation/api/command'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  command: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 获取状态类型
function getStatusType(status) {
  const info = getCommandStatusInfo(status)
  return info.type
}

// 获取状态文本
function getStatusText(status) {
  const info = getCommandStatusInfo(status)
  return info.text
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.approve-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  label {
    display: block;
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 6px;
    font-weight: 500;
  }

  .value {
    font-size: 14px;
    color: var(--el-text-color-primary);
  }
}

.code-block {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  overflow-x: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  &.pending {
    background: #fefce8;
    border: 1px solid #fef08a;
  }
}

.reason-block {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 12px;
  color: var(--el-color-danger);
  font-size: 14px;
}
</style>
