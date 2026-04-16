<template>
  <el-dialog
    v-model="visibleModel"
    title="触发仓库采集"
    width="720px"
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
        <el-form-item label="采集主机" required>
          <AcmDeviceSelector
            v-model="selection"
            ci-types="[auto]"
            :options="selectorOptions"
          />
          <div class="win-patch-form-hint">请选择 1 台可以访问该仓库的管控机。</div>
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
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { extractHostIds, pickValue } from '../../utils'
import { yumRepoApi } from '../../yumRepoApi'
import { getYumRepoLabel, resolveYumRepoId, unwrapResponse } from '../../yumRepoUtils'

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

const selectorOptions = {
  selectMode: 'host,input,recently',
  selector: 'single',
  label: '选择采集主机'
}

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const selection = ref([])
const submitting = ref(false)

const repoId = computed(() => resolveYumRepoId(props.repo))
const repoLabel = computed(() => getYumRepoLabel(props.repo))
const repoUrl = computed(() => pickValue(props.repo, ['repoUrl', 'repo_url'], '-'))
const hostIds = computed(() => extractHostIds(selection.value))

async function handleSubmit() {
  if (!repoId.value) {
    ElMessage.warning('请先选择仓库')
    return
  }

  if (hostIds.value.length !== 1) {
    ElMessage.warning('请选择 1 台采集主机')
    return
  }

  submitting.value = true
  try {
    const response = await yumRepoApi.collectPackages({
      sourceId: repoId.value,
      hostId: hostIds.value[0]
    })

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
