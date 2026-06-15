<template>
  <template v-for="(param, index) in params" :key="param.name || index">
    <el-form-item :label="param.label || param.name">
      <template v-if="param.type === 'host'">
        <AcmDeviceSelector
          v-model="param.defaultValue"
          ci-types="[auto]"
          :options="hostSelectorOptions"
        />
      </template>
      <template v-else>
        <el-input
          v-model="param.defaultValue"
          :placeholder="`请输入${param.label || param.name}`"
        />
      </template>
      <div v-if="param.description" class="param-desc">{{ param.description }}</div>
    </el-form-item>
  </template>
</template>

<script setup>
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

defineProps({
  params: {
    type: Array,
    default: () => []
  }
})

const hostSelectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple',
  label: '选择主机'
}
</script>

<style scoped>
.param-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
