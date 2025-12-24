<template>
  <el-dialog
    v-model="visible"
    title="重置密码"
    width="550px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div class="revert-password-content">
      <el-alert
        type="success"
        :closable="false"
        class="info-alert"
      >
        <template #title>
          <div class="alert-text">
            重置密码会根据密码重置策略，使用初始密码或者生成一个随机密码重新设置服务器上的用户密码
          </div>
        </template>
      </el-alert>

      <el-form label-width="100px" label-position="top" class="revert-form">
        <!-- 范围选择 -->
        <el-form-item label="范围">
          <el-radio-group v-model="resetAll" :disabled="submitting">
            <el-radio value="all">全部</el-radio>
            <el-radio value="select" :disabled="!hasSelection">选中服务器</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 已选用户列表 -->
        <el-form-item v-if="resetAll === 'select' && hasSelection" label="已选用户">
          <div class="selected-users" v-html="assestsUsers"></div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="submitting">
          取消
        </el-button>
        <el-button
          type="danger"
          :loading="submitting"
          @click="handleRevert"
        >
          <i class="fa fa-play-circle" v-if="!submitting"></i>
          确认重置密码
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  commaIpStr: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const submitting = ref(false)
const resetAll = ref('select')

const hasSelection = computed(() => {
  return props.commaIpStr && props.commaIpStr.length > 0
})

// 解析并格式化显示已选用户，格式: IP(用户名)
const assestsUsers = computed(() => {
  if (!props.commaIpStr) return ''
  const users = props.commaIpStr.split(',')
  let html = ''
  users.forEach(user => {
    const parts = user.split('@@')
    if (parts.length > 1) {
      html += `${parts[1]}(${parts[2]})<br>`
    }
  })
  return html
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    // 如果有选中的服务器，默认选择 "select"，否则选择 "all"
    resetAll.value = hasSelection.value ? 'select' : 'all'
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

async function handleRevert() {
  submitting.value = true
  try {
    // 调用作业 fk4rJ4
    // resetAll: true = 全部, false = 选中
    await apiService.post(`/jao/api/jao/jobs/fk4rJ4/run?cacheBuster=${Date.now()}`, {
      params: {
        selectedAssests: props.commaIpStr,
        resetAll: resetAll.value === 'all'
      }
    })

    ElMessage.success('密码重置任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to revert password:', error)
    ElMessage.error(error?.message || '密码重置失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.revert-password-content {
  padding: 10px 0;
}

.info-alert {
  margin-bottom: 20px;

  .alert-text {
    font-size: 14px;
    line-height: 1.6;
  }
}

.revert-form {
  padding-top: 10px;
}

.selected-users {
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  max-height: 150px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
