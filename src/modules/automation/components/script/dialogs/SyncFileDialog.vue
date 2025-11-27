<template>
  <el-dialog
    v-model="visible"
    title="同步脚本文件"
    width="600px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div class="sync-form">
      <p class="help-info">
        <strong>说明：用于快速部署同步文件，无需上传审批，在下方填写需要同步文件服务器文件地址即可。</strong>
      </p>

      <div class="form-group">
        <label class="control-label">
          同步脚本文件路径
          <el-tooltip content="填写对应服务器上文件的绝对路径，支持文件夹同步以及压缩文件同步自动解压" placement="top">
            <i class="fa fa-info-circle text-muted" />
          </el-tooltip>
        </label>
        <div class="form-control-wrapper">
          <el-input v-model="form.path" class="code-input" placeholder="/path/to/file" />
        </div>
      </div>

      <div v-if="form.path" class="form-group">
        <label class="control-label">同步文件选项</label>
        <div class="form-control-wrapper">
          <el-radio-group v-model="form.syncMode">
            <el-radio value="ExtractToDir">同步到子目录</el-radio>
            <el-radio value="ExtractWithoutDir">同步到当前目录</el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button
        type="primary"
        :disabled="!form.path || !form.syncMode"
        :loading="syncing"
        @click="handleSubmit"
      >
        <i class="fa fa-check me-1" /> 确定
      </el-button>
      <el-button @click="visible = false">
        <i class="fa fa-reply me-1" /> 取消
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as gfsApi from '@/modules/automation/api/gfs'

const props = defineProps({
  modelValue: Boolean,
  repoType: {
    type: String,
    default: 'git'
  },
  repo: {
    type: String,
    default: '$tnt'
  },
  dir: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const form = ref({
  path: '',
  syncMode: ''
})

const syncing = ref(false)

// 提交
async function handleSubmit() {
  if (!form.value.path) {
    ElMessage.warning('请输入同步文件路径')
    return
  }
  if (!form.value.syncMode) {
    ElMessage.warning('请选择同步文件选项')
    return
  }

  syncing.value = true
  try {
    await gfsApi.syncFile(props.repoType, props.repo, {
      path: form.value.path,
      dir: props.dir,
      syncMode: form.value.syncMode
    })
    ElMessage.success('同步成功')
    visible.value = false
    emit('success')
  } catch (error) {
    ElMessage.error(error?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

// 关闭时重置表单
function handleClosed() {
  form.value = {
    path: '',
    syncMode: ''
  }
}
</script>

<style scoped>
.sync-form {
  padding: 0 12px;
}

.sync-form .form-group {
  margin-bottom: 16px;
}

.sync-form .control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
}

.sync-form .control-label i {
  margin-left: 4px;
  cursor: help;
}

.sync-form .form-control-wrapper {
  width: 100%;
}

.help-info {
  background-color: #f4f4f5;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #909399;
}

.help-info strong {
  color: #606266;
}

.code-input :deep(.el-input__inner) {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
