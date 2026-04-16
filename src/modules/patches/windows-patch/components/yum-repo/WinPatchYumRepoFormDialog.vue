<template>
  <el-dialog
    v-model="visibleModel"
    :title="currentRepoId ? '编辑仓库' : '登记仓库'"
    width="620px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="仓库地址" prop="repoUrl">
        <el-input v-model="form.repoUrl" placeholder="请输入 yum/dnf 仓库 URL" clearable />
      </el-form-item>
      <el-form-item label="显示名称">
        <el-input
          v-model="form.sourceName"
          placeholder="不填则默认使用仓库地址"
          clearable
        />
      </el-form-item>
      <el-form-item label="仓库 ID">
        <el-input
          v-model="form.repoId"
          placeholder="旧版 yum 环境需要时填写"
          clearable
        />
      </el-form-item>
      <el-form-item label="OS 族">
        <el-select
          v-model="form.osFamily"
          filterable
          allow-create
          default-first-option
          clearable
          placeholder="可选，如 centos、rhel、kylin"
          style="width: 100%"
        >
          <el-option
            v-for="item in YUM_REPO_OS_FAMILY_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="OS 主版本">
        <el-input v-model="form.osMajor" placeholder="可选，如 7、8、10" clearable />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visibleModel = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { pickValue } from '../../utils'
import { YUM_REPO_OS_FAMILY_OPTIONS } from '../../yumRepoConstants'
import { yumRepoApi } from '../../yumRepoApi'
import { buildYumRepoPayload, resolveYumRepoId, unwrapResponse } from '../../yumRepoUtils'

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

const emit = defineEmits(['update:modelValue', 'saved'])

const visibleModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const formRef = ref(null)
const submitting = ref(false)
const currentRepoId = computed(() => resolveYumRepoId(props.repoData))

const form = reactive({
  repoUrl: '',
  sourceName: '',
  repoId: '',
  osFamily: '',
  osMajor: ''
})

const rules = {
  repoUrl: [{ required: true, message: '请输入仓库地址', trigger: 'blur' }]
}

function resetForm(data = null) {
  form.repoUrl = pickValue(data, ['repoUrl', 'repo_url'], '')
  form.sourceName = pickValue(data, ['sourceName', 'source_name'], '')
  form.repoId = pickValue(data, ['repoId', 'repo_id'], '')
  form.osFamily = pickValue(data, ['osFamily', 'os_family'], '')
  form.osMajor = pickValue(data, ['osMajor', 'os_major'], '')
}

async function handleSubmit() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const payload = buildYumRepoPayload(form)
    const response = currentRepoId.value
      ? await yumRepoApi.updateRepo(currentRepoId.value, payload)
      : await yumRepoApi.createRepo(payload)

    ElMessage.success(currentRepoId.value ? '仓库已更新' : '仓库已登记')
    visibleModel.value = false
    emit('saved', unwrapResponse(response))
  } catch (error) {
    console.error('保存 Yum 仓库失败:', error)
    ElMessage.error('保存 Yum 仓库失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  open => {
    if (open) {
      resetForm(props.repoData)
    }
  }
)

watch(
  () => props.repoData,
  value => {
    if (props.modelValue) {
      resetForm(value)
    }
  }
)
</script>
