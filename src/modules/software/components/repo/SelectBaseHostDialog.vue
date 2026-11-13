<template>
  <AcmDeviceSelectorDialog
    v-model="visible"
    ci-types="[auto]"
    :options="selectorOptions"
    :title="t('yumRepo.software.selectBaseHostsTitle')"
    :confirm-text="t('yumRepo.software.setBaseHosts')"
    :description="t('yumRepo.software.setBaseHostsHint')"
    :allow-empty="false"
    :close-on-confirm="false"
    :submitting="submitting"
    @confirm="handleSubmit"
  />
</template>

<script setup>
import { t } from '@/core/i18n'

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
    ElMessage.warning(t('yumRepo.software.selectHosts'))
    return
  }
  submitting.value = true
  try {
    const response = await repoApi.setBaseRepoHosts({ hosts })
    const data = response?.data || response
    const result = Array.isArray(data) ? data[0] : data
    if (['FAILED', 'ERROR'].includes(result?.status)) {
      ElMessage.error(result.error || t('yumRepo.software.settingFailed'))
      return
    }
    ElMessage.success(t('yumRepo.software.settingSubmitted'))
    emit('success')
    visible.value = false
  } catch (error) {
    console.error('Failed to set base repo hosts:', error)
    ElMessage.error(t('yumRepo.software.settingFailed'))
  } finally {
    submitting.value = false
  }
}
</script>
