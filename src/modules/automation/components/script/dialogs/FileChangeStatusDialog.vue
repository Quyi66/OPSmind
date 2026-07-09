<template>
  <el-dialog
    v-model="visible"
    title="更改状态"
    width="500px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="change-status-dialog">
      <el-form label-position="top">
        <el-form-item label="操作">
          <el-radio-group v-model="status">
            <el-radio value="PUBLISHED">
              <i class="fa fa-play-circle text-success me-1"></i>
              启用
            </el-radio>
            <el-radio value="DISABLED">
              <i class="fa fa-stop-circle text-danger me-1"></i>
              停用
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="备注说明">
          <el-input v-model="comment" type="textarea" :rows="3" placeholder="请输入备注说明" />
        </el-form-item>

        <div class="selected-files-info">
          <p>将对以下 {{ files.length }} 个文件/文件夹执行操作：</p>
          <div class="file-list">
            <div v-for="file in files.slice(0, 5)" :key="file.path" class="file-item">
              {{ file.name }}
            </div>
            <div v-if="files.length > 5" class="file-more">... 等 {{ files.length }} 个文件</div>
          </div>
        </div>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit" :disabled="!status">
        确定
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
  files: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const status = ref('PUBLISHED')
const comment = ref('')
const submitting = ref(false)

async function handleSubmit() {
  if (!status.value) {
    ElMessage.warning('请选择操作')
    return
  }

  submitting.value = true
  try {
    await gfsApi.changeFileStatus(
      props.repoType,
      props.repo,
      props.files,
      status.value,
      comment.value
    )
    ElMessage.success('操作成功')
    emit('success')
    visible.value = false
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.change-status-dialog {
  padding: 0 20px;
}

.selected-files-info {
  margin-top: 20px;
  padding: 10px;
  background-color: var(--el-bg-color-page);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.selected-files-info p {
  margin-bottom: 8px;
  font-weight: 500;
}

.file-list {
  max-height: 100px;
  overflow-y: auto;
}

.file-item {
  line-height: 1.6;
}

.file-more {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}
</style>
