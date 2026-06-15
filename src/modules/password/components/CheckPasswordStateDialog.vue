<template>
  <el-dialog
    v-model="visible"
    title="检查密码状态"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div class="check-password-content">
      <el-alert type="success" :closable="false" class="info-alert">
        <template #title>
          <div class="alert-text">检查密码状态会验证数据库中的用户密码是否与服务器上的密码一致</div>
        </template>
      </el-alert>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCheck">确认检查</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const submitting = ref(false)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

async function handleCheck() {
  submitting.value = true
  try {
    // 调用作业 v0KKtQ
    await apiService.post(`/jao/api/jao/jobs/v0KKtQ/run?cacheBuster=${Date.now()}`, {
      params: {}
    })

    ElMessage.success('密码状态检查任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to check password state:', error)
    ElMessage.error(error?.message || '检查密码状态失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.check-password-content {
  padding: 10px 0;
}

.info-alert {
  .alert-text {
    font-size: 14px;
    line-height: 1.6;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
