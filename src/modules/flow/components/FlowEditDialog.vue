<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="dialog-form">
      <!-- mode: process - 编辑流程基本信息 -->
      <template v-if="mode === 'process'">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="processRules"
          label-width="100px"
          label-position="left"
        >
          <el-form-item label="流程名称" prop="processName">
            <el-input
              v-model="formData.processName"
              placeholder="请输入流程名称"
              maxlength="50"
            />
          </el-form-item>

          <el-form-item label="流程简称" prop="processAbbr">
            <el-input
              v-model="formData.processAbbr"
              placeholder="请输入流程简称"
              maxlength="20"
            />
          </el-form-item>

          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="formData.remarks"
              type="textarea"
              :rows="4"
              placeholder="请输入备注"
              maxlength="200"
            />
          </el-form-item>
        </el-form>
      </template>

      <!-- mode: processDetail - 版本备注 -->
      <template v-else-if="mode === 'processDetail'">
        <el-form
          ref="formRef"
          :model="formData"
          label-width="100px"
          label-position="left"
        >
          <el-form-item label="版本备注">
            <el-input
              v-model="formData.remark"
              type="textarea"
              :rows="4"
              placeholder="请输入版本备注"
            />
          </el-form-item>

          <el-form-item label="复制场景">
            <el-checkbox v-model="formData.copyScenes">
              复制关联场景
            </el-checkbox>
            <div class="help-text">勾选后将同时复制该流程关联的场景配置</div>
          </el-form-item>
        </el-form>
      </template>

      <!-- mode: runDetail - 运行备注 -->
      <template v-else-if="mode === 'runDetail'">
        <el-form
          ref="formRef"
          :model="formData"
          label-width="100px"
          label-position="left"
        >
          <el-form-item label="运行备注">
            <el-input
              v-model="formData.remark"
              type="textarea"
              :rows="4"
              placeholder="请输入运行备注"
            />
          </el-form-item>
        </el-form>
      </template>

      <!-- mode: processClone - 克隆流程 -->
      <template v-else-if="mode === 'processClone'">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="processRules"
          label-width="100px"
          label-position="left"
        >
          <el-form-item label="流程名称" prop="processName">
            <el-input
              v-model="formData.processName"
              placeholder="请输入新流程名称"
              maxlength="50"
            />
          </el-form-item>

          <el-form-item label="流程简称" prop="processAbbr">
            <el-input
              v-model="formData.processAbbr"
              placeholder="请输入流程简称"
              maxlength="20"
            />
          </el-form-item>

          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="formData.remarks"
              type="textarea"
              :rows="4"
              placeholder="请输入备注"
              maxlength="200"
            />
          </el-form-item>

          <el-form-item label="复制场景">
            <el-checkbox v-model="formData.copyScenes">
              复制关联场景
            </el-checkbox>
            <div class="help-text">勾选后将同时复制该流程关联的场景配置</div>
          </el-form-item>
        </el-form>
      </template>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleConfirm">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as flowApi from '@/modules/flow/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 模式: 'process' | 'processDetail' | 'runDetail' | 'processClone'
  mode: {
    type: String,
    default: 'process'
  },
  // 自定义标题
  title: {
    type: String,
    default: ''
  },
  // 初始数据
  flowData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'saved'])

const visible = ref(false)
const formRef = ref(null)
const submitting = ref(false)

const formData = reactive({
  id: '',
  processKey: '',
  processName: '',
  processDetailId: '',
  processAbbr: '',
  processStatus: 1,
  remarks: '',
  createTime: '',
  remark: '',
  copyScenes: false
})

const processRules = {
  processName: [
    { required: true, message: '请输入流程名称', trigger: 'blur' }
  ],
  processAbbr: [
    { required: true, message: '请输入流程简称', trigger: 'blur' }
  ]
}

const dialogTitle = computed(() => {
  if (props.title) return props.title
  switch (props.mode) {
    case 'process': return '编辑流程'
    case 'processDetail': return '版本信息'
    case 'runDetail': return '运行备注'
    case 'processClone': return '克隆流程'
    default: return '编辑'
  }
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetForm()
    if (props.flowData) {
      Object.assign(formData, {
        id: props.flowData.id || '',
        processKey: props.flowData.processKey || '',
        processName: props.flowData.processName || '',
        processDetailId: props.flowData.processDetailId || '',
        processAbbr: props.flowData.processAbbr || '',
        processStatus: props.flowData.processStatus ?? 1,
        remarks: props.flowData.remarks || '',
        createTime: props.flowData.createTime || '',
        remark: props.flowData.remark || '',
        copyScenes: props.flowData.copyScenes || false
      })
    }
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.id = ''
  formData.processKey = ''
  formData.processName = ''
  formData.processDetailId = ''
  formData.processAbbr = ''
  formData.processStatus = 1
  formData.remarks = ''
  formData.createTime = ''
  formData.remark = ''
  formData.copyScenes = false
  formRef.value?.clearValidate()
}

function handleClose() {
  visible.value = false
}

async function handleConfirm() {
  // 验证表单（仅 process 和 processClone 模式需要验证）
  if (props.mode === 'process' || props.mode === 'processClone') {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
  }

  submitting.value = true
  try {
    const resultData = { ...formData }

    if (props.mode === 'process' && formData.id) {
      // 编辑已有流程基本信息 - 调用 API
      await flowApi.updateFlow({
        id: formData.id,
        processKey: formData.processKey,
        processName: formData.processName,
        processDetailId: formData.processDetailId,
        processAbbr: formData.processAbbr,
        processStatus: formData.processStatus,
        remarks: formData.remarks,
        createTime: formData.createTime
      })
      ElMessage.success('更新成功')
      emit('saved')
    } else {
      // 其他模式（包括新建流程）直接返回数据，由调用方处理
      emit('confirm', resultData)
    }

    handleClose()
  } catch (error) {
    console.error('Operation failed:', error)
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-form {
  padding: 0 10px;
}

.help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-form-item__label) {
  color: #606266;
}
</style>
