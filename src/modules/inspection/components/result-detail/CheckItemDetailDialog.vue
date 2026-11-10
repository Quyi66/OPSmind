<template>
  <el-dialog
    :model-value="visible"
    :title="item?.hostKey || item?.host_key || '巡检结果'"
    width="740px"
    destroy-on-close
    @close="$emit('close')"
    :close-on-click-modal="true"
  >
    <div v-loading="loading" class="check-item-detail-dialog">
      <div class="meta-summary-card">
        <div class="result-item">
          <span class="result-label">检查项名称</span>
          <strong class="result-value">{{ item?.name || '-' }}</strong>
        </div>
        <div class="result-item">
          <span class="result-label">诊断结果</span>
          <el-tag v-if="item" :type="getKpiStatusTagType(item.status)" size="small" effect="light">
            {{ getKpiStatusLabel(item.status) }}
          </el-tag>
        </div>
      </div>

      <div class="output-section-header">
        <span class="result-label">原始执行输出</span>
      </div>
      <div
        v-if="item?.output !== null && item?.output !== undefined && item?.output !== ''"
        class="output-content"
      >
        <pre>{{ item.output }}</pre>
      </div>
      <div v-else class="output-content">
        <pre class="empty">无输出内容</pre>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <!-- 黑名单操作按钮 -->
          <template v-if="showWhitelistButton">
            <el-button
              v-if="!isInWhitelist"
              type="primary"
              plain
              @click="handleAddToWhitelist"
              :loading="whitelistLoading"
            >
              <i class="fa fa-plus"></i>
              添加黑名单
            </el-button>
            <el-button
              v-else
              type="danger"
              plain
              @click="handleRemoveFromWhitelist"
              :loading="whitelistLoading"
            >
              <i class="fa fa-trash-alt"></i>
              移除黑名单
            </el-button>
          </template>
        </div>
        <div class="footer-right">
          <el-button @click="$emit('close')">关闭</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getKpiStatusTagType, getKpiStatusLabel } from '../../constants/status'
import { whitelistApi } from '../../api'

const props = defineProps({
  visible: Boolean,
  item: Object,
  loading: Boolean,
  templateId: String,
  templateName: String,
  scriptPath: String,
  showWhitelistButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'whitelist-changed'])

const whitelistLoading = ref(false)

// 判断当前项是否在黑名单中（whetherWhiteList 格式为 "y,{id}" 或 "n"）
const isInWhitelist = computed(() => {
  const value = props.item?.whetherWhiteList
  return value && value.startsWith('y')
})

/**
 * 添加到黑名单
 */
async function handleAddToWhitelist() {
  if (!props.item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项添加到黑名单吗？', '确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
    whitelistLoading.value = true

    await whitelistApi.saveWhitelist({
      templateId: props.templateId,
      templateName: props.templateName,
      scriptPath: props.scriptPath,
      hostId: props.item.hostId,
      hostKey: props.item.hostKey,
      checkName: props.item.name
    })

    ElMessage.success('添加黑名单成功')
    emit('whitelist-changed')
    emit('close')
  } catch (e) {
    if (e !== 'cancel') {
      console.error('添加黑名单失败:', e)
      ElMessage.error('添加黑名单失败')
    }
  } finally {
    whitelistLoading.value = false
  }
}

/**
 * 从黑名单移除
 */
async function handleRemoveFromWhitelist() {
  if (!props.item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项从黑名单移除吗？', '确认', {
      closeOnClickModal: false,
      closeOnPressEscape: false
    })
    whitelistLoading.value = true

    // 从 whetherWhiteList 字段解析黑名单ID（格式: "y,{whitelistId}"）
    let whitelistId = ''
    if (props.item.whetherWhiteList && props.item.whetherWhiteList.startsWith('y,')) {
      whitelistId = props.item.whetherWhiteList.split(',')[1]
    }

    if (whitelistId) {
      await whitelistApi.deleteWhitelist(whitelistId)
      ElMessage.success('移除黑名单成功')
      emit('whitelist-changed')
      emit('close')
    } else {
      ElMessage.error('无法获取黑名单ID')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除黑名单失败:', e)
      ElMessage.error('移除黑名单失败')
    }
  } finally {
    whitelistLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.check-item-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .meta-summary-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;

    .result-label {
      color: var(--el-text-color-secondary);
    }

    .result-value {
      color: var(--el-text-color-primary);
      font-weight: 600;
    }
  }

  .output-section-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  .output-content {
    pre {
      margin: 0;
      max-height: 360px;
      padding: 14px 16px;
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #1e293b;
      border-radius: 8px;
      font-size: 12.5px;
      line-height: 1.6;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;

      &.empty {
        background: var(--el-fill-color-lighter);
        color: var(--el-text-color-secondary);
        border-color: var(--el-border-color-lighter);
        font-style: italic;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-left,
  .footer-right {
    display: flex;
    gap: 8px;
  }
}
</style>
