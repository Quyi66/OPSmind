<template>
  <el-dialog
    :model-value="visible"
    :title="item?.hostKey || '巡检结果'"
    width="700px"
    destroy-on-close
    @close="$emit('close')"
  >
    <div v-loading="loading" class="check-item-detail-dialog">
      <div class="result-item">
        <span class="result-label">检查项：</span>
        <span class="result-value">{{ item?.name || '-' }}</span>
      </div>
      <div class="result-item">
        <span class="result-label">结果：</span>
        <el-tag v-if="item" :type="getKpiStatusTagType(item.status)" size="small">
          {{ getKpiStatusLabel(item.status) }}
        </el-tag>
      </div>
      <div class="result-item">
        <span class="result-label">结果输出：</span>
      </div>
      <div v-if="item?.output" class="output-content">
        <pre>{{ item.output }}</pre>
      </div>
      <div v-else class="output-content">
        <pre class="empty">无输出内容</pre>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-left">
          <!-- 白名单操作按钮 -->
          <template v-if="showWhitelistButton">
            <el-button
              v-if="!isInWhitelist"
              type="primary"
              @click="handleAddToWhitelist"
              :loading="whitelistLoading"
            >
              <i class="fa fa-plus"></i> 添加白名单
            </el-button>
            <el-button
              v-else
              type="danger"
              @click="handleRemoveFromWhitelist"
              :loading="whitelistLoading"
            >
              <i class="fa fa-trash-alt"></i> 移除白名单
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

// 判断当前项是否在白名单中（whetherWhiteList 格式为 "y,{id}" 或 "n"）
const isInWhitelist = computed(() => {
  const value = props.item?.whetherWhiteList
  return value && value.startsWith('y')
})

/**
 * 添加到白名单
 */
async function handleAddToWhitelist() {
  if (!props.item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项添加到白名单吗？', '确认')
    whitelistLoading.value = true

    await whitelistApi.saveWhitelist({
      templateId: props.templateId,
      templateName: props.templateName,
      scriptPath: props.scriptPath,
      hostId: props.item.hostId,
      hostKey: props.item.hostKey,
      checkName: props.item.name
    })

    ElMessage.success('添加白名单成功')
    emit('whitelist-changed')
    emit('close')
  } catch (e) {
    if (e !== 'cancel') {
      console.error('添加白名单失败:', e)
      ElMessage.error('添加白名单失败')
    }
  } finally {
    whitelistLoading.value = false
  }
}

/**
 * 从白名单移除
 */
async function handleRemoveFromWhitelist() {
  if (!props.item) return

  try {
    await ElMessageBox.confirm('确定要将此检查项从白名单移除吗？', '确认')
    whitelistLoading.value = true

    // 从 whetherWhiteList 字段解析白名单ID（格式: "y,{whitelistId}"）
    let whitelistId = ''
    if (props.item.whetherWhiteList && props.item.whetherWhiteList.startsWith('y,')) {
      whitelistId = props.item.whetherWhiteList.split(',')[1]
    }

    if (whitelistId) {
      await whitelistApi.deleteWhitelist(whitelistId)
      ElMessage.success('移除白名单成功')
      emit('whitelist-changed')
      emit('close')
    } else {
      ElMessage.error('无法获取白名单ID')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除白名单失败:', e)
      ElMessage.error('移除白名单失败')
    }
  } finally {
    whitelistLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.check-item-detail-dialog {
  .result-item {
    margin-bottom: 12px;
    font-size: 14px;
    line-height: 1.8;

    .result-label {
      font-weight: bold;
      color: #303133;
      display: inline-block;
      width: 80px;
    }

    .result-value {
      color: #606266;
    }
  }

  .output-content {
    margin-top: 8px;

    pre {
      max-height: 350px;
      padding: 12px;
      background: #f5f7fa;
      color: #303133;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;

      &.empty {
        color: #909399;
        font-style: italic;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .footer-left {
    display: flex;
    gap: 8px;
  }

  .footer-right {
    display: flex;
    gap: 8px;
  }
}
</style>
