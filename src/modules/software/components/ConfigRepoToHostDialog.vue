<template>
  <el-dialog
    v-model="visible"
    title="配置仓库到主机"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="config-repo-dialog">
      <!-- 已选仓库信息 -->
      <div class="selected-repos-info">
        <el-alert type="info" :closable="false">
          <template #title>
            <span>
              已选择
              <strong>{{ repoCount }}</strong>
              个仓库配置
            </span>
          </template>
        </el-alert>
      </div>

      <!-- 使用 AcmDeviceSelector 组件选择主机 -->
      <div class="host-selector-wrapper">
        <label class="selector-label">目标主机</label>
        <AcmDeviceSelector
          v-model="selectedHosts"
          ci-types="[auto]"
          :options="{
            selectMode: 'host,group,tag,input,recently',
            selector: 'multiple',
            label: '选择目标主机'
          }"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="selectedHosts.length === 0"
        @click="handleSubmit"
      >
        开始配置
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { repoApi } from '../api'
import AcmDeviceSelector from '@/modules/automation/components/job/schedule/components/AcmDeviceSelector.vue'
import { normalizeAcmDeviceJobHosts } from '@/modules/automation/components/job/schedule/components/acmDeviceSelector.utils'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  /**
   * 选中的仓库配置列表
   * 每个对象需包含 id 属性（自定义仓库）或 refid 属性（基准仓库）
   */
  selectedRepos: {
    type: Array,
    default: () => []
  },
  /**
   * 仓库类型
   * 'custom' - 自定义仓库，使用 repoConfigIds 参数
   * 'base' - 基准仓库，使用 repoIds 参数
   */
  repoType: {
    type: String,
    default: 'custom',
    validator: value => ['custom', 'base'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const selectedHosts = ref([])

// 仓库数量
const repoCount = computed(() => props.selectedRepos?.length || 0)

// 监听 modelValue
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      // 打开时重置状态
      selectedHosts.value = []
    }
  }
)

// 监听 visible
watch(visible, val => {
  emit('update:modelValue', val)
})

async function handleSubmit() {
  if (selectedHosts.value.length === 0) {
    ElMessage.warning('请选择目标主机')
    return
  }

  if (!props.selectedRepos || props.selectedRepos.length === 0) {
    ElMessage.warning('请选择要配置的仓库')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定将 ${props.selectedRepos.length} 个仓库配置到 ${selectedHosts.value.length} 台主机吗？`,
      '执行配置',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    submitting.value = true

    // 构建 hosts 参数 [{key, value, assetType}] 格式
    const hostsArray = normalizeAcmDeviceJobHosts(selectedHosts.value, 'linux')

    // 根据仓库类型构建不同的参数
    let apiParams = { hosts: hostsArray }

    if (props.repoType === 'base') {
      // 基准仓库使用 repoIds 参数（使用 refid 字段）
      apiParams.repoIds = props.selectedRepos.map(r => r.refid || r.repo_id || r.id).join(',')
      apiParams.repoConfigIds = null
    } else {
      // 自定义仓库使用 repoConfigIds 参数
      apiParams.repoConfigIds = props.selectedRepos.map(r => r.id).join(',')
      apiParams.repoIds = null
    }

    const response = await repoApi.configRepoToHosts(apiParams)

    // 检查返回结果
    const result = response?.data || response
    if (Array.isArray(result) && result[0]?.status === 'COMPLETED') {
      ElMessage.success('配置任务已提交成功')
      emit('success')
      handleClose()
    } else if (result?._status === 'ok' || result?.status === 'COMPLETED') {
      ElMessage.success('配置任务已提交成功')
      emit('success')
      handleClose()
    } else {
      ElMessage.success('配置任务已提交')
      emit('success')
      handleClose()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to config repo to hosts:', error)
      ElMessage.error(error?.message || '配置失败，请稍后重试')
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
.config-repo-dialog {
  padding: 8px 0;

  .selected-repos-info {
    margin-bottom: 20px;
  }

  .host-selector-wrapper {
    .selector-label {
      display: block;
      font-size: 14px;
      color: #606266;
      margin-bottom: 8px;
    }
  }
}
</style>
