<template>
  <el-dialog
    v-model="visible"
    title="查看密码"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="password-view-content">
      <template v-if="!loading && passwordData">
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">主机IP</span>
            <span class="info-value">{{ passwordData.host_key || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">主机名</span>
            <span class="info-value">{{ passwordData.hostname || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">用户名</span>
            <span class="info-value">{{ passwordData.username || '-' }}</span>
          </div>
          <el-divider />
          <div class="info-row password-row">
            <span class="info-label">密码</span>
            <div class="password-value">
              <span v-if="!showPassword">••••••••</span>
              <span v-else class="password-text">{{ passwordData.password || '-' }}</span>
              <el-button
                :icon="showPassword ? View : Hide"
                text
                type="primary"
                @click="togglePassword"
              />
              <el-button
                :icon="CopyDocument"
                text
                type="primary"
                @click="copyPassword"
                title="复制密码"
              />
            </div>
          </div>
          <div class="info-row">
            <span class="info-label">密码状态</span>
            <el-tag :type="getStatusType(passwordData.check_status)" size="small">
              {{ getStatusText(passwordData.check_status) }}
            </el-tag>
          </div>
          <div class="info-row">
            <span class="info-label">过期时间</span>
            <span class="info-value">{{ formatTime(passwordData.expired_date) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最后修改</span>
            <span class="info-value">{{ formatTime(passwordData.last_setup_time) }}</span>
          </div>
        </div>
      </template>
      <template v-else-if="!loading">
        <el-empty description="暂无数据" />
      </template>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Hide, CopyDocument } from '@element-plus/icons-vue'
import * as pmsApi from '@/modules/password/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  serverId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
const loading = ref(false)
const passwordData = ref(null)
const showPassword = ref(false)

const statusConfig = {
  USABLE: { text: '可用', type: 'success' },
  UNABLE: { text: '不可用', type: 'danger' },
  PROCESSING: { text: '检查中', type: 'primary' },
  UNKNOWN: { text: '未知', type: 'warning' }
}

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.serverId) {
      loadPasswordData()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
  if (!val) {
    showPassword.value = false
    passwordData.value = null
  }
})

async function loadPasswordData() {
  loading.value = true
  try {
    const response = await pmsApi.getServerPassword(props.serverId)
    const result = response?.data || response
    const records = result?.records || []
    passwordData.value = records[0] || null
  } catch (error) {
    console.error('Failed to load password:', error)
    ElMessage.error('加载密码信息失败')
  } finally {
    loading.value = false
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function copyPassword() {
  if (!passwordData.value?.password) {
    ElMessage.warning('无密码可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(passwordData.value.password)
    ElMessage.success('密码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

function getStatusType(status) {
  return statusConfig[status]?.type || 'info'
}

function getStatusText(status) {
  return statusConfig[status]?.text || status || '未知'
}

function formatTime(time) {
  if (!time) return '-'
  try {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return time
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.password-view-content {
  min-height: 200px;
}

.info-section {
  padding: 10px 0;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-light);

  &:last-child {
    border-bottom: none;
  }

  .info-label {
    width: 100px;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    font-size: 14px;
  }

  .info-value {
    flex: 1;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }
}

.password-row {
  .password-value {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .password-text {
      font-family: monospace;
      font-size: 14px;
      background: var(--el-bg-color-page);
      padding: 4px 8px;
      border-radius: 4px;
    }
  }
}

.el-divider {
  margin: 16px 0;
}
</style>
