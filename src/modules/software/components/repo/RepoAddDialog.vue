<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑仓库' : '添加仓库'"
    width="500px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="repo-add-dialog">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="仓库名称" prop="repoName">
          <el-input v-model="formData.repoName" placeholder="请输入仓库名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="配置文件" prop="repoFile">
          <el-input
            v-model="formData.repoFile"
            placeholder="请输入配置文件名，如 custom.repo"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="仓库描述" prop="repoDesc">
          <el-input
            v-model="formData.repoDesc"
            type="textarea"
            :rows="3"
            placeholder="请输入仓库描述"
          />
        </el-form-item>
        <el-form-item label="仓库地址" prop="repoUrl">
          <el-input
            v-model="formData.repoUrl"
            type="textarea"
            :rows="2"
            placeholder="请输入仓库地址"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { repoApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const formData = ref({
  id: null,
  repoName: '',
  repoFile: '',
  repoDesc: '',
  repoUrl: ''
})

const formRules = {
  repoName: [{ required: true, message: '请输入仓库名称', trigger: 'blur' }],
  repoFile: [{ required: true, message: '请输入配置文件名', trigger: 'blur' }],
  repoUrl: [{ required: true, message: '请输入仓库地址', trigger: 'blur' }]
}

const isEdit = computed(() => !!formData.value.id)

// 监听 modelValue
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.repoData) {
      // 编辑模式，填充数据
      formData.value = {
        id: props.repoData.id || null,
        repoName: props.repoData.repo_name || '',
        repoFile: props.repoData.repo_file || '',
        repoDesc: props.repoData.repo_desc || '',
        repoUrl: props.repoData.repo_url || ''
      }
    }
  }
)

// 监听 visible
watch(visible, val => {
  emit('update:modelValue', val)
})

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    await repoApi.saveCustomRepo({
      id: formData.value.id,
      repoName: formData.value.repoName,
      repoFile: formData.value.repoFile,
      repoDesc: formData.value.repoDesc,
      repoUrl: formData.value.repoUrl
    })

    ElMessage.success(isEdit.value ? '仓库更新成功' : '仓库添加成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to save repo:', error)
    ElMessage.error(isEdit.value ? '仓库更新失败' : '仓库添加失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
  formData.value = {
    id: null,
    repoName: '',
    repoFile: '',
    repoDesc: '',
    repoUrl: ''
  }
  formRef.value?.resetFields()
}
</script>

<style scoped lang="scss">
.repo-add-dialog {
  padding: 0 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
