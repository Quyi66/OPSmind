<template>
  <el-dialog
    v-model="visible"
    title="补丁修复确认"
    width="720px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="fix-dialog" v-loading="loading">
      <el-alert
        type="success"
        :closable="false"
        class="fix-dialog__alert"
        title="Windows漏洞需要更新后重启才能生效，在更新漏洞前选择是否需要自动重启，默认为不重启主机"
        show-icon
      />

      <div class="fix-dialog__card">
        <div class="fix-dialog__card-header">
          <i class="fa fa-desktop text-muted" />
          <span class="fix-dialog__card-title">更新主机</span>
        </div>
        <div class="fix-dialog__card-body">
          <div v-if="hosts.length" class="fix-dialog__list">
            <div v-for="host in hosts" :key="host" class="fix-dialog__item">{{ host }}</div>
          </div>
          <el-empty v-else description="暂无主机" />
        </div>
      </div>

      <div class="fix-dialog__card">
        <div class="fix-dialog__card-header">
          <i class="fa fa-briefcase-medical text-muted" />
          <span class="fix-dialog__card-title">更新补丁</span>
        </div>
        <div class="fix-dialog__card-body">
          <div v-if="patches.length" class="fix-dialog__list">
            <div v-for="kb in patches" :key="kb" class="fix-dialog__item">{{ kb }}</div>
          </div>
          <el-empty v-else description="暂无补丁" />
        </div>
      </div>

      <div class="fix-dialog__card">
        <div class="fix-dialog__card-header">
          <i class="fa fa-power-off text-muted" />
          <span class="fix-dialog__card-title">重启主机</span>
        </div>
        <div class="fix-dialog__card-body">
          <el-radio-group v-model="reboot">
            <el-radio label="yes">YES</el-radio>
            <el-radio label="no">NO</el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!ids.length" @click="handleSubmit">
        开始修复
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { windowsVulnerabilityApi } from '../../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  ids: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'submitted'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const loading = ref(false)
const submitting = ref(false)
const hosts = ref([])
const patches = ref([])
const reboot = ref('no')

watch(
  () => [visible.value, props.ids],
  ([open, ids]) => {
    if (!open) return
    if (!ids || ids.length === 0) {
      hosts.value = []
      patches.value = []
      return
    }
    reboot.value = 'no'
    loadData(ids)
  },
  { deep: true }
)

async function loadData(ids) {
  loading.value = true
  try {
    const [hostRes, patchRes] = await Promise.all([
      windowsVulnerabilityApi.getWinPatchStatusInfo(ids),
      windowsVulnerabilityApi.getWinPatchPatchInfo(ids)
    ])
    const hostRecords = hostRes?.records || hostRes?.data?.records || []
    hosts.value = hostRecords.map(r => r.host_key).filter(Boolean)
    const patchRecords = patchRes?.records || patchRes?.data?.records || []
    const kbList = patchRecords.map(r => r.kb_number).filter(Boolean)
    patches.value = Array.from(new Set(kbList))
  } catch (error) {
    console.error('Failed to load fix dialog data:', error)
    ElMessage.error('加载修复数据失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!props.ids || props.ids.length === 0) {
    ElMessage.warning('请选择要修复的漏洞')
    return
  }
  submitting.value = true
  try {
    await windowsVulnerabilityApi.executeWinPatchFix({
      winPatchStatusIds: props.ids,
      reboot: reboot.value
    })
    ElMessage.success('修复任务已提交')
    emit('submitted')
    emit('update:modelValue', false)
  } catch (error) {
    console.error('Failed to start fix job:', error)
    ElMessage.error('修复任务提交失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.fix-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fix-dialog__alert {
  margin-bottom: 4px;
}

.fix-dialog__card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.fix-dialog__card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 0;
  font-weight: 600;
  color: #303133;
}

.fix-dialog__card-title {
  font-size: 14px;
}

.fix-dialog__card-body {
  padding: 8px 16px 14px;
}

.fix-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fix-dialog__item {
  font-size: 14px;
  color: #303133;
}
</style>
