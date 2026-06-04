<template>
  <el-dialog
    v-model="visibleModel"
    title="创建安装任务"
    width="680px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="win-patch-dialog-body">
      <el-form label-width="110px" size="small">
        <el-form-item label="目标主机">
          <span>{{ resolveHostKey(hostSummary) }}</span>
        </el-form-item>
        <el-form-item label="补丁数量">
          <span>{{ patchStatusIds.length }} 条</span>
        </el-form-item>
        <el-form-item label="安装后重启">
          <el-switch v-model="form.reboot" />
        </el-form-item>
        <el-form-item label="自动重扫">
          <el-switch v-model="form.rescanAfter" />
        </el-form-item>
      </el-form>

      <div class="win-patch-dialog-preview">
        <el-tag
          v-for="row in selectedRows.slice(0, 12)"
          :key="resolvePatchStatusId(row)"
          type="primary"
          effect="plain"
        >
          {{ pickValue(row, ['kbNumber', 'kb_number'], '-') }}
        </el-tag>
        <span v-if="selectedRows.length > 12" class="win-patch-dialog-preview__more">
          +{{ selectedRows.length - 12 }}
        </span>
      </div>
    </div>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="patchStatusIds.length === 0"
        @click="handleSubmit"
      >
        创建安装任务
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { winPatchApi } from '../../api'
import { pickValue, resolveHostKey, resolvePatchStatusId, unwrapResponse } from '../../utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedRows: {
    type: Array,
    default: () => []
  },
  hostSummary: {
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
const form = reactive({
  reboot: false,
  rescanAfter: false
})

const patchStatusIds = computed(() =>
  Array.from(new Set(props.selectedRows.map(row => resolvePatchStatusId(row)).filter(Boolean)))
)

async function handleSubmit() {
  if (!patchStatusIds.value.length) {
    ElMessage.warning('当前选择中没有可安装的补丁记录')
    return
  }

  submitting.value = true
  try {
    const response = await winPatchApi.createInstallTask({
      patchStatusIds: patchStatusIds.value,
      reboot: form.reboot,
      rescanAfter: form.rescanAfter
    })
    ElMessage.success('安装任务已创建，请在任务详情中继续执行步骤')
    visibleModel.value = false
    emit('submitted', unwrapResponse(response))
  } catch (error) {
    console.error('提交安装任务失败:', error)
    ElMessage.error('提交安装任务失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      form.reboot = false
      form.rescanAfter = false
    }
  }
)
</script>

<style scoped lang="scss">
.win-patch-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-dialog-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 132px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-fill-color-lighter);
}

.win-patch-dialog-preview__more {
  align-self: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
