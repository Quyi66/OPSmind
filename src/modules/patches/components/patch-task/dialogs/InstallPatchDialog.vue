<template>
  <el-dialog :model-value="visible" title="安装补丁" width="600px" @close="handleClose">
    <div class="install-dialog">
      <el-alert
        v-if="patches.length > 0"
        :title="`即将安装 ${patches.length} 个补丁`"
        type="info"
        :closable="false"
        show-icon
      />

      <el-table :data="patches" size="small" max-height="300" style="margin-top: 16px">
        <el-table-column prop="hostname" label="主机" min-width="120" />
        <el-table-column prop="patchName" label="补丁名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="targetVersion" label="目标版本" width="120" />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityStyle(row.severity)" size="small">
              {{ getSeverityLabel(row.severity) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-form style="margin-top: 20px" label-width="100px">
        <el-form-item label="执行选项">
          <el-checkbox v-model="options.autoReboot">安装后自动重启（如需要）</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="options.forceInstall">强制安装（忽略依赖检查）</el-checkbox>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleInstall">开始安装</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { patchInstallApi } from '../../../api'
import { PATCH_SEVERITY_LABELS, PATCH_SEVERITY_STYLES } from '../../../constants'

const props = defineProps({
  visible: { type: Boolean, default: false },
  patches: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'success'])

const loading = ref(false)
const options = reactive({
  autoReboot: false,
  forceInstall: false
})

function getSeverityLabel(s) {
  return PATCH_SEVERITY_LABELS[s] || s
}
function getSeverityStyle(s) {
  return PATCH_SEVERITY_STYLES[s] || ''
}

function handleClose() {
  emit('update:visible', false)
}

async function handleInstall() {
  if (props.patches.length === 0) {
    ElMessage.warning('请选择要安装的补丁')
    return
  }

  loading.value = true
  try {
    // 按主机分组
    const hostMap = {}
    props.patches.forEach(p => {
      if (!hostMap[p.hostname]) {
        hostMap[p.hostname] = []
      }
      hostMap[p.hostname].push(p.patchName)
    })

    await patchInstallApi.install({
      hosts: Object.keys(hostMap),
      packages: [...new Set(props.patches.map(p => p.patchName))],
      versions: props.patches.map(p => p.targetVersion || ''),
      autoReboot: options.autoReboot,
      forceInstall: options.forceInstall
    })

    ElMessage.success('安装任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Install failed:', error)
    ElMessage.error('安装任务提交失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  val => {
    if (val) {
      options.autoReboot = false
      options.forceInstall = false
    }
  }
)
</script>

<style scoped lang="scss">
.install-dialog {
  min-height: 200px;
}
</style>
