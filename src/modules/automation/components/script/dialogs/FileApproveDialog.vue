<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('automation.library.fileReview')"
    width="600px"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
  >
    <div v-if="selectedFiles.length === 0" class="empty-notice">
      <el-alert type="warning" :closable="false" show-icon>{{ t('automation.library.selectFilesFirst') }}</el-alert>
    </div>

    <template v-else>
      <!-- 已选文件列表 -->
      <div class="selected-files-summary">
        <el-tag type="info">{{ t('automation.library.reviewFileCount', { count: selectedFiles.length }) }}</el-tag>
      </div>

      <!-- 审核操作选择 -->
      <div class="action-group">
        <el-button
          :type="form.action === 'PUBLISHED' ? 'success' : ''"
          :plain="form.action !== 'PUBLISHED'"
          @click="form.action = 'PUBLISHED'"
        >
          <!-- <i class="fa fa-check" /> -->
          {{ t('automation.workbench.approve') }}
        </el-button>
        <el-button
          :type="form.action === 'REJECTED' ? 'danger' : ''"
          :plain="form.action !== 'REJECTED'"
          @click="form.action = 'REJECTED'"
        >
          <!-- <i class="fa fa-times" /> -->
          {{ t('automation.workbench.reject') }}
        </el-button>
        <el-button
          :type="form.action === 'REVERT' ? 'warning' : ''"
          :plain="form.action !== 'REVERT'"
          @click="form.action = 'REVERT'"
        >
          <!-- <i class="fa fa-undo" /> -->
          {{ t('automation.library.revoke') }}
        </el-button>
      </div>

      <!-- 备注 -->
      <div class="comment-section">
        <label class="comment-label">{{ t('automation.library.notes') }}</label>
        <el-input
          v-model="form.comment"
          type="textarea"
          :rows="3"
          :placeholder="t('automation.library.optionalNotes')"
        />
      </div>
    </template>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!form.action || selectedFiles.length === 0"
        @click="handleSubmit"
      >
        {{ t('automation.file.confirm') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'

import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'
import { useReviewCountStore } from '@/stores/useReviewCountStore.js'

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
const reviewStore = useReviewCountStore()

// 表单数据
const form = ref({
  action: '',
  comment: ''
})

const submitting = ref(false)

// 已选择的文件
const selectedFiles = computed(() => props.files || [])

// 提交审核
async function handleSubmit() {
  if (!form.value.action) {
    ElMessage.warning(t('automation.library.selectReviewAction'))
    return
  }

  if (selectedFiles.value.length === 0) {
    ElMessage.warning(t('automation.library.selectReviewFiles'))
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
      await gfsApi.changeFileStatus(
        'stage',
        props.repo,
        selectedFiles.value,
        form.value.action,
        form.value.comment
      )
    }

    ElMessage.success(t('automation.approval.operationSucceeded'))
    reviewStore.fetchScriptCount()
    emit('update:modelValue', false)
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.schedule.operationFailed'))
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
watch(
  () => props.modelValue,
  val => {
    if (val) {
      form.value = {
        action: '',
        comment: ''
      }
    }
  }
)
</script>

<style scoped lang="scss">
.empty-notice {
  padding: 20px 0;
}

.selected-files-summary {
  margin-bottom: 16px;
}

.action-group {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-section {
  .comment-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}
</style>
