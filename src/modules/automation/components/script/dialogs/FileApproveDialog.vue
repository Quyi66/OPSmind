<template>
  <el-dialog
    :model-value="modelValue"
    title="文件审核"
    width="600px"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <div v-if="selectedFiles.length === 0" class="empty-notice">
      <el-alert type="warning" :closable="false" show-icon>
        请先选择要审核的文件
      </el-alert>
    </div>

    <template v-else>
      <!-- 已选文件列表 -->
      <div class="selected-files-summary">
        <el-tag type="info">已选择 {{ selectedFiles.length }} 个文件</el-tag>
      </div>

      <!-- 审核操作选择 -->
      <div class="action-group">
        <el-radio-group v-model="form.action" class="action-radio-group">
          <el-radio-button
            v-for="action in availableActions"
            :key="action.value"
            :value="action.value"
            :disabled="!action.hasPermission"
          >
            <i :class="action.icon" /> {{ action.text }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <!-- 备注 -->
      <div class="comment-section">
        <label class="comment-label">备注说明</label>
        <el-input
          v-model="form.comment"
          type="textarea"
          :rows="3"
          placeholder="请输入备注说明（可选）"
        />
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!form.action || selectedFiles.length === 0"
        @click="handleSubmit"
      >
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'stage'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  files: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 表单数据
const form = ref({
  action: '',
  comment: ''
})

const submitting = ref(false)

// 已选择的文件
const selectedFiles = computed(() => props.files || [])

// 可用的审核动作
const availableActions = computed(() => {
  // stage 类型的文件审核动作
  // 注意: 'APPROVE' action 发送的 status 是 'PUBLISHED'
  return [
    { value: 'PUBLISHED', text: '通过', icon: 'fa fa-check', hasPermission: true },
    { value: 'REJECTED', text: '拒绝', icon: 'fa fa-times', hasPermission: true },
    { value: 'REVERT', text: '撤销', icon: 'fa fa-undo', hasPermission: true }
  ]
})

// 提交审核
async function handleSubmit() {
  if (!form.value.action) {
    ElMessage.warning('请选择审核操作')
    return
  }

  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请选择要审核的文件')
    return
  }

  submitting.value = true
  try {
    const filePaths = selectedFiles.value.map(f => f.path)

    if (form.value.action === 'REVERT') {
      // 撤销 - 删除暂存区文件
      await gfsApi.deleteFiles('stage', props.repo, filePaths)
    } else {
      // 通过或拒绝
      await gfsApi.changeFileStatus('stage', props.repo, selectedFiles.value, form.value.action, form.value.comment)
    }

    ElMessage.success('操作成功')
    emit('update:modelValue', false)
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    action: '',
    comment: ''
  }
}

// 监听打开
watch(() => props.modelValue, (val) => {
  if (val) {
    form.value = {
      action: '',
      comment: ''
    }
  }
})
</script>

<style scoped lang="scss">
.empty-notice {
  padding: 20px 0;
}

.selected-files-summary {
  margin-bottom: 16px;
}

.action-group {
  margin-bottom: 20px;
}

.action-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  :deep(.el-radio-button__inner) {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.comment-section {
  .comment-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #606266;
  }
}
</style>
