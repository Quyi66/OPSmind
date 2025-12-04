<template>
  <el-dialog
    v-model="visible"
    title="选择基准主机"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="select-base-host-dialog">
      <!-- 选择按钮 -->
      <div class="selector-row">
        <el-button plain @click="openHostSelector">
          <i class="fa fa-list" /> 选择
        </el-button>
        <span v-if="selectedHosts.length > 0" class="selected-text">
          已选择 {{ selectedHosts.length }} 台主机
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="selectedHosts.length === 0"
          @click="handleSubmit"
        >
          <i class="far fa-play-circle" /> 将所选主机设为基准仓库
        </el-button>
      </div>
    </div>

    <!-- 复用主机选择器弹窗 -->
    <HostSelectorDialog
      v-model:visible="hostSelectorVisible"
      v-model="selectedHosts"
      @confirm="handleHostsConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../api'
import HostSelectorDialog from '@/modules/automation/components/command/dialogs/HostSelectorDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)

// 主机选择器弹窗
const hostSelectorVisible = ref(false)
const selectedHosts = ref([])

// 监听 modelValue
watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  }
)

// 监听 visible
watch(visible, (val) => {
  emit('update:modelValue', val)
})

function openHostSelector() {
  hostSelectorVisible.value = true
}

function handleHostsConfirm(hosts) {
  selectedHosts.value = hosts
}

async function handleSubmit() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择主机')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定将选中的主机设置为基准仓库主机吗？',
      '执行作业',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    submitting.value = true

    // 构建 hosts 参数（Map 格式）
    const hostsMap = selectedHosts.value.map(h => ({
      host_id: h.key || h.id,
      host_key: h.value || h.ip || h.host_key
    }))

    await repoApi.setBaseRepoHosts({
      hosts: JSON.stringify(hostsMap)
    })

    ElMessage.success('设置成功')
    emit('success')
    handleClose()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to set base repo hosts:', error)
      ElMessage.error('设置失败')
    }
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  selectedHosts.value = []
}
</script>

<style scoped lang="scss">
.select-base-host-dialog {
  padding: 16px;

  .selector-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .selected-text {
      color: #606266;
      font-size: 14px;
    }
  }

  .action-buttons {
    margin-top: 8px;
  }
}
</style>
