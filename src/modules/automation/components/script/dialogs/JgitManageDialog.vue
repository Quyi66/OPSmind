<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('automation.library.jgitManage')"
    width="700px"
    :close-on-click-modal="false"
    @closed="handleClosed"
    :close-on-press-escape="false"
  >
    <el-form label-width="100px">
      <el-form-item :label="t('automation.library.jgitInfo')">
        <div class="code-editor-wrapper">
          <div class="code-editor">
            <div class="line-numbers">
              <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
            </div>
            <textarea v-model="jgitInfo" class="code-textarea" readonly :placeholder="t('automation.file.loading')" />
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="danger" :loading="resetting" @click="handleReset">
          <i class="fa fa-undo-alt" />
          {{ t('automation.library.resetJgit') }}
        </el-button>
        <el-button type="warning" :loading="repairing" @click="handleRepair">
          <i class="fa fa-tools" />
          {{ t('automation.library.repair') }}
        </el-button>
        <el-button type="primary" :loading="refreshing" @click="handleRefresh" :title="t('common.refresh')">
          <i class="fa fa-sync-alt" />
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { t } from '@/core/i18n'
import { message, messageRef } from '@/core/i18n/feedback'

import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const dialogVisible = ref(false)
const jgitInfo = messageRef('')
const resetting = ref(false)
const repairing = ref(false)
const refreshing = ref(false)

// 计算行数
const lineCount = computed(() => {
  if (!jgitInfo.value) return 10
  return Math.max(jgitInfo.value.split('\n').length, 10)
})

// 同步 v-model
watch(
  () => props.modelValue,
  val => {
    dialogVisible.value = val
    if (val) {
      loadJgitInfo()
    }
  }
)

watch(dialogVisible, val => {
  emit('update:modelValue', val)
})

// 加载 JGit 信息
async function loadJgitInfo() {
  try {
    const data = await gfsApi.getJgitInfo(props.repoType, props.repo)
    jgitInfo.value = JSON.stringify(data, null, 4)
  } catch (error) {
    jgitInfo.value = message('automation.library.jgitLoadFailed', () => ({ reason: error?.message || t('automation.file.unknownError') }))
  }
}

// 重置 JGit
async function handleReset() {
  try {
    await ElMessageBox.confirm(t('automation.library.resetJgitConfirm'), t('automation.library.resetTitle'), {
      closeOnClickModal: false,
      closeOnPressEscape: false,
      type: 'warning'
    })
  } catch {
    return
  }

  resetting.value = true
  try {
    await gfsApi.resetJgit(props.repoType, props.repo)
    ElMessage.success(t('automation.library.jgitReset'))
    loadJgitInfo()
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.jgitResetFailed'))
  } finally {
    resetting.value = false
  }
}

// 修复 JGit
async function handleRepair() {
  repairing.value = true
  try {
    await gfsApi.repairJgit(props.repo)
    ElMessage.success(t('automation.library.jgitRepaired'))
    loadJgitInfo()
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || t('automation.library.jgitRepairFailed'))
  } finally {
    repairing.value = false
  }
}

// 刷新
async function handleRefresh() {
  refreshing.value = true
  try {
    await loadJgitInfo()
    ElMessage.success(t('automation.library.refreshed'))
  } finally {
    refreshing.value = false
  }
}

// 弹窗关闭
function handleClosed() {
  jgitInfo.value = ''
}
</script>

<style scoped>
.code-editor-wrapper {
  width: 100%;
}

.code-editor {
  display: flex;
  background: #282c34;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow: hidden;
}

.line-numbers {
  padding: 12px 8px;
  background: #21252b;
  color: #636d83;
  text-align: right;
  user-select: none;
  min-width: 40px;
  border-right: 1px solid #181a1f;
}

.line-number {
  height: 20.8px;
}

.code-textarea {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: #abb2bf;
  resize: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  min-height: 300px;
  white-space: pre;
  overflow-x: auto;
}

.code-textarea::placeholder {
  color: #636d83;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
