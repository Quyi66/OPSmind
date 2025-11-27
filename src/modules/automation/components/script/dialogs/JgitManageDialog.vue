<template>
  <el-dialog
    v-model="dialogVisible"
    title="JGit管理"
    width="700px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form label-width="100px">
      <el-form-item label="JGit信息">
        <div class="code-editor-wrapper">
          <div class="code-editor">
            <div class="line-numbers">
              <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
            </div>
            <textarea
              v-model="jgitInfo"
              class="code-textarea"
              readonly
              placeholder="加载中..."
            />
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="danger" :loading="resetting" @click="handleReset">
          <i class="fa fa-undo-alt" /> 重置JGit
        </el-button>
        <el-button type="warning" :loading="repairing" @click="handleRepair">
          <i class="fa fa-tools" /> 修复
        </el-button>
        <el-button type="primary" :loading="refreshing" @click="handleRefresh">
          <i class="fa fa-sync-alt" /> 刷新
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
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
const jgitInfo = ref('')
const resetting = ref(false)
const repairing = ref(false)
const refreshing = ref(false)

// 计算行数
const lineCount = computed(() => {
  if (!jgitInfo.value) return 10
  return Math.max(jgitInfo.value.split('\n').length, 10)
})

// 同步 v-model
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    loadJgitInfo()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 加载 JGit 信息
async function loadJgitInfo() {
  try {
    const data = await gfsApi.getJgitInfo(props.repoType, props.repo)
    jgitInfo.value = JSON.stringify(data, null, 4)
  } catch (error) {
    jgitInfo.value = `加载失败: ${error?.message || '未知错误'}`
  }
}

// 重置 JGit
async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '确定重置JGit存储区吗？该操作将清除本地JGit缓存数据。',
      '重置确认',
      { type: 'warning' }
    )
  } catch {
    return
  }

  resetting.value = true
  try {
    await gfsApi.resetJgit(props.repoType, props.repo)
    ElMessage.success('JGit重置成功')
    loadJgitInfo()
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || 'JGit重置失败')
  } finally {
    resetting.value = false
  }
}

// 修复 JGit
async function handleRepair() {
  repairing.value = true
  try {
    await gfsApi.repairJgit(props.repo)
    ElMessage.success('JGit修复成功')
    loadJgitInfo()
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || 'JGit修复失败')
  } finally {
    repairing.value = false
  }
}

// 刷新
async function handleRefresh() {
  refreshing.value = true
  try {
    await loadJgitInfo()
    ElMessage.success('刷新成功')
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
  gap: 8px;
}
</style>
