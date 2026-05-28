<template>
  <el-dialog
    v-model="visibleModel"
    title="触发仓库采集"
    width="620px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="win-patch-dialog-body">
      <el-form label-width="110px">
        <el-form-item label="目标仓库">
          <span>{{ repoLabel }}</span>
        </el-form-item>
        <el-form-item label="仓库地址">
          <span>{{ repoUrl }}</span>
        </el-form-item>
        <el-form-item label="执行方式">
          <span>由 localhost 执行采集，无需选择主机</span>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">开始采集</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { pickValue } from '@/modules/patches/windows-patch/utils.js'
import { yumRepoApi } from '../api'
import { getYumRepoLabel, resolveYumConfigId, unwrapResponse } from '../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const submitting = ref(false)

const repoLabel = computed(() => getYumRepoLabel(props.repo))
const configId = computed(() => resolveYumConfigId(props.repo))
const repoUrl = computed(() =>
  String(pickValue(props.repo, ['repoUrl', 'repo_url', 'baseurl'], '')).trim()
)

async function handleSubmit() {
  const payload = configId.value
    ? { dcDataId: configId.value }
    : repoUrl.value
      ? { baseurl: repoUrl.value }
      : null

  if (!payload) {
    ElMessage.warning('请先选择仓库')
    return
  }

  submitting.value = true
  try {
    const response = await yumRepoApi.collectPackages(payload)

    const data = unwrapResponse(response)
    ElMessage.success(data?.message || '采集任务已提交')
    visibleModel.value = false
    emit('submitted', data)
  } catch (error) {
    console.error('触发 Yum 仓库采集失败:', error)
    ElMessage.error('触发 Yum 仓库采集失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.win-patch-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-form-hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
