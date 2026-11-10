<template>
  <AcmDeviceSelectorDialog
    v-model="visible"
    ci-types="[auto]"
    :options="selectorOptions"
    title="选择设备 · 配置仓库到主机"
    confirm-text="开始配置"
    :description="configDescription"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleSubmit"
  >
    <template #context="{ selection }">
      <div class="repo-target-summary">
        <strong>待配置仓库（{{ selectedRepos.length }}）</strong>
        <ul>
          <li v-for="(repo, index) in selectedRepos" :key="index">
            {{ repo.repo_name || repo.name || repo.repo_id || repo.id || repo.refid }}
          </li>
        </ul>
        <DeviceSelectionSummary :selection="selection" />
      </div>
    </template>
  </AcmDeviceSelectorDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { repoApi } from '../../api'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import DeviceSelectionSummary from '@/modules/automation/components/job/schedule/components/DeviceSelectionSummary.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  selectedRepos: { type: Array, default: () => [] },
  repoType: {
    type: String,
    default: 'custom',
    validator: value => ['custom', 'base'].includes(value)
  }
})
const emit = defineEmits(['update:modelValue', 'success'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const submitting = ref(false)
const configDescription = computed(
  () => `已选择 ${props.selectedRepos.length} 个仓库配置，点击“开始配置”后将立即配置到所选主机。`
)
const selectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple'
}

async function handleSubmit(selection) {
  if (submitting.value) return
  const hosts = normalizeAcmDeviceJobHosts(selection, 'linux')
  if (!hosts.length) {
    ElMessage.warning('请选择目标主机')
    return
  }
  if (!props.selectedRepos.length) {
    ElMessage.warning('请选择要配置的仓库')
    return
  }
  const apiParams = { hosts }
  if (props.repoType === 'base') {
    apiParams.repoIds = props.selectedRepos.map(r => r.refid || r.repo_id || r.id).join(',')
    apiParams.repoConfigIds = null
  } else {
    apiParams.repoConfigIds = props.selectedRepos.map(r => r.id).join(',')
    apiParams.repoIds = null
  }
  submitting.value = true
  try {
    const response = await repoApi.configRepoToHosts(apiParams)
    const data = response?.data || response
    const result = Array.isArray(data) ? data[0] : data
    if (['FAILED', 'ERROR'].includes(result?.status)) {
      ElMessage.error(result.error || '配置失败，请稍后重试')
      return
    }
    ElMessage.success('配置任务已提交')
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('Failed to config repo to hosts:', error)
    ElMessage.error(error?.message || '配置失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.repo-target-summary {
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
.repo-target-summary ul {
  max-height: 120px;
  overflow: auto;
  padding-left: 20px;
  overflow-wrap: anywhere;
}
</style>
