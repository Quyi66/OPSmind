<template>
  <el-dialog
    :model-value="modelValue"
    title="主机健康巡检检查项与评分规则"
    width="720px"
    destroy-on-close
    :close-on-click-modal="true"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <el-alert
      title="计分说明：满分 100 分，最终分数 = 100 − 扣分（最低 0 分）；主机整体状态取最差检查项等级。不可达主机计 0 分且不计入平台平均分。"
      type="info"
      show-icon
      :closable="false"
      class="mb-3"
    />

    <div class="ops-table-wrapper">
      <el-table :data="HEALTH_SCORING_RULES" max-height="440" style="width: 100%">
        <el-table-column type="index" label="#" width="52" />
        <el-table-column prop="name" label="检查项" min-width="240" show-overflow-tooltip />
        <el-table-column prop="threshold" label="告警 / 严重阈值" min-width="160" />
        <el-table-column prop="deduction" label="扣分（告警 / 严重）" width="160" />
      </el-table>
    </div>

    <template #footer>
      <el-button type="primary" @click="emit('update:modelValue', false)">我知道了</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { HEALTH_SCORING_RULES } from '../../constants/hostHealth'

defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
</script>
