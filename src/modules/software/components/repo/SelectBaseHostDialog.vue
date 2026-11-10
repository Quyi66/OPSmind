<template>
  <AcmDeviceSelectorDialog
    v-model="visible"
    ci-types="[auto]"
    :options="selectorOptions"
    title="选择设备 · 设置基准仓库主机"
    confirm-text="设为基准仓库主机"
    description="点击“设为基准仓库主机”后，将立即为所选主机设置基准仓库。"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleSubmit"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { repoApi } from '../../api'
import AcmDeviceSelectorDialog from '@/modules/automation/components/job/schedule/components/AcmDeviceSelectorDialog.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'success'])
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})
const submitting = ref(false)
const selectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple'
}

async function handleSubmit(selection) {
  if (submitting.value) return
  const hosts = normalizeAcmDeviceJobHosts(selection, 'linux')
  if (!hosts.length) {
    ElMessage.warning('请选择主机')
    return
  }
  submitting.value = true
  try {
    const response = await repoApi.setBaseRepoHosts({ hosts })
    const data = response?.data || response
    const result = Array.isArray(data) ? data[0] : data
    if (['FAILED', 'ERROR'].includes(result?.status)) {
      ElMessage.error(result.error || '设置失败')
      return
    }
    ElMessage.success('设置任务已提交')
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('Failed to set base repo hosts:', error)
    ElMessage.error('设置失败')
  } finally {
    submitting.value = false
  }
}
</script>
