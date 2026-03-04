<template>
  <el-dialog
    v-model="visible"
    title="登录错误信息"
    width="1000px"
    :close-on-click-modal="false"
    @open="loadData"
  >
    <div class="login-error-dialog" v-loading="loading">
      <div v-if="errorMessages.length" class="error-list">
        <div v-for="(item, index) in errorMessages" :key="index" class="error-item">
          <pre class="error-message">{{ item.message }}</pre>
        </div>
      </div>
      <div v-else class="empty-tip">暂无登录错误信息</div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dtsApi } from '@/modules/asset/api'

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

// 加载数据
async function loadData() {
  if (!props.userId) {
    errorMessages.value = []
    return
  }

  loading.value = true
  try {
    const response = await dtsApi.queryData('LUPM_GET_USER_LOGIN_FAIL_MESSAGE', {
      id: props.userId
    })
    errorMessages.value = response?.records || []
  } catch (error) {
    console.error('加载登录错误信息失败:', error)
    ElMessage.error('加载登录错误信息失败')
    errorMessages.value = []
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-error-dialog {
  max-height: 400px;
  overflow-y: auto;
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
