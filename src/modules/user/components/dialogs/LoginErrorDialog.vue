<template>
  <el-dialog v-model="visible" title="登录错误信息" width="1000px" :close-on-click-modal="false">
    <div class="login-error-dialog" v-loading="loading">
      <div v-if="readError" class="read-feedback" role="status">
        <el-alert :title="readError" type="warning" :closable="false" show-icon />
        <el-button v-if="!authError && userId" :loading="loading" @click="loadData">
          重试读取
        </el-button>
      </div>
      <div v-else-if="errorMessages.length" class="error-list">
        <div v-for="(item, index) in errorMessages" :key="index" class="error-item">
          <pre class="error-message">{{ item.message }}</pre>
        </div>
      </div>
      <div v-else class="empty-tip">{{ loading ? '正在读取…' : '暂无登录错误信息' }}</div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { getUserLoginFailMessage } from '@/modules/user/api'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible'])

const visible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val)
})

const loading = ref(false)
const errorMessages = ref([])
const readError = ref('')
const authError = ref(false)
let requestVersion = 0
let active = true

function clearRead() {
  requestVersion += 1
  errorMessages.value = []
  readError.value = ''
  authError.value = false
  loading.value = false
}

watch(
  () => [props.visible, props.userId],
  () => {
    clearRead()
    if (props.visible) loadData()
  },
  { immediate: true }
)

onActivated(() => {
  active = true
})
function suspendRead() {
  active = false
  requestVersion += 1
  if (loading.value) {
    errorMessages.value = []
    readError.value = '登录错误信息读取已中断，请重试。'
  }
  loading.value = false
}
onDeactivated(suspendRead)
onBeforeUnmount(suspendRead)

// 加载数据
async function loadData() {
  if (!active || !props.visible) return
  const userId = props.userId
  const version = ++requestVersion
  const isCurrent = () =>
    active && props.visible && props.userId === userId && version === requestVersion
  errorMessages.value = []
  readError.value = ''
  authError.value = false
  if (!props.userId) {
    readError.value = '缺少账号记录标识，无法读取登录错误信息。'
    return
  }

  loading.value = true
  try {
    const response = await getUserLoginFailMessage(userId)
    if (!isCurrent()) return
    const records = response?.data?.records ?? response?.records
    if (!Array.isArray(records)) throw new Error('Invalid login error records')
    errorMessages.value = records
  } catch (error) {
    if (!isCurrent()) return
    console.error('加载登录错误信息失败:', error)
    const status = error?.response?.status
    authError.value =
      status === 401 ||
      status === 403 ||
      ['Authentication expired', 'Access denied'].includes(error?.message)
    readError.value = authError.value
      ? '读取失败：登录已失效或无权访问，请重新登录或联系管理员。'
      : '登录错误信息读取失败，请重试。'
  } finally {
    if (isCurrent()) loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-error-dialog {
  max-height: 400px;
  overflow-y: auto;
}

.read-feedback {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 12px 16px;
}

.error-message {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.empty-tip {
  text-align: center;
  color: var(--el-text-color-regular);
  padding: 40px;
  font-size: 14px;
}
</style>
