<template>
  <el-dialog
    v-model="visible"
    title="运行参数"
    width="600px"
    destroy-on-close
  >
    <div class="params-container">
      <el-form label-width="120px">
        <el-form-item
          v-for="(param, index) in params"
          :key="index"
          :label="param.label || param.name"
        >
          <template v-if="param.type === 'host'">
            <AcmDeviceSelector
              v-model="param.defaultValue"
              ci-types="[auto]"
              :options="hostSelectorOptions"
            />
            <div v-if="param.description" class="param-desc">{{ param.description }}</div>
          </template>
          <template v-else>
            <el-input
              v-model="param.defaultValue"
              :placeholder="`请输入${param.label || param.name}`"
            />
            <div v-if="param.description" class="param-desc">{{ param.description }}</div>
          </template>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  params: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const hostSelectorOptions = {
  selectMode: 'host,group,tag,input,recently',
  selector: 'multiple',
  label: '选择主机'
}

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<style scoped>
.params-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
}

.param-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}
</style>
