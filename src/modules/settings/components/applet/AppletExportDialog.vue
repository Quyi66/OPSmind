<template>
  <el-dialog
    v-model="visible"
    title="导出应用"
    width="400px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px" size="small">
      <el-form-item label="是否包含脚本">
        <el-select v-model="containsScript" style="width: 100%">
          <el-option label="是" value="true" />
          <el-option label="否" value="false" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="exporting" @click="handleExport">
        <i class="fa fa-download" style="margin-right: 4px"></i>
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  appletIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)
const exporting = ref(false)
const containsScript = ref('false')

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function handleClose() {
  visible.value = false
  containsScript.value = 'false'
}

async function handleExport() {
  if (!props.appletIds || props.appletIds.length === 0) {
    ElMessage.warning('请选择要导出的应用')
    return
  }

  exporting.value = true
  try {
    const response = await apiService.post(
      `/adm/api/adm/applet/export/relation?cacheBuster=${Date.now()}`,
      {
        appletIds: props.appletIds,
        containsScript: containsScript.value
      },
      {
        responseType: 'blob'
      }
    )

    // 生成文件名
    const now = new Date()
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0')
    const filename = `applet-manager-${timestamp}.zip`

    // 创建下载链接
    const blob = new Blob([response.data], { type: 'application/zip' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
    handleClose()
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}
</script>
