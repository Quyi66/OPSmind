<template>
  <el-dialog
    v-model="visible"
    :title="isEditMode ? '编辑资产类型' : '新建资产类型'"
    width="560px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    destroy-on-close
    @closed="handleClosed"
  >
    <div v-loading="loading" class="model-form-dialog">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        :disabled="saving || loading"
        label-width="120px"
      >
        <el-form-item label="类型编码" prop="code">
          <el-input
            v-model="formData.code"
            placeholder="请输入类型编码，如 linux、windows、switch"
            :disabled="isEditMode"
            maxlength="50"
          />
          <div class="form-tip">
            {{
              isEditMode
                ? '类型编码作为唯一标识，创建后不可修改'
                : '仅支持英文字母开头，包含字母、数字和下划线'
            }}
          </div>
        </el-form-item>

        <el-form-item label="类型名称" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入类型名称，如 Linux服务器、网络交换机"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="自动化纳管" prop="isAuto">
          <el-radio-group v-model="formData.isAuto">
            <el-radio :value="1">支持自动化管理</el-radio>
            <el-radio :value="0">不支持</el-radio>
          </el-radio-group>
          <div class="form-tip">开启后可对该类型的设备执行自动化连接检测、巡检及脚本下发</div>
        </el-form-item>

        <el-form-item v-if="!isEditMode" label="复用类型模板" prop="templateId">
          <el-select
            v-model="formData.templateId"
            placeholder="请选择要复用的类型模板"
            :loading="templateLoading"
            :disabled="templateLoading || saving"
            style="width: 100%"
          >
            <el-option
              v-for="tpl in templateList"
              :key="tpl.id"
              :label="`${tpl.title} (${tpl.code})`"
              :value="tpl.id"
            />
          </el-select>
          <div v-if="templateError" class="form-tip form-tip--error" role="alert">
            {{ templateError }}
            <el-button
              link
              type="primary"
              size="small"
              :disabled="templateLoading"
              @click="loadTemplateList()"
            >
              重试
            </el-button>
          </div>
          <div v-else-if="!templateLoading" class="form-tip">
            沿用所选类型的基础字段与列表展示结构，快速完成创建
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="saveDisabled"
        @click="handleSave"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  modelData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const modelId = computed(
  () => props.modelData?.id || props.modelData?.cit_id || props.modelData?.citId || null
)
const isEditMode = computed(() => Boolean(modelId.value))

const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const originalData = ref(null)

const templateList = ref([])
const templateLoading = ref(false)
const templateError = ref('')
let loadRequestId = 0

function createDefaultAttrs() {
  return [
    {
      code: null,
      title: 'Default',
      type: 'group',
      unique: false,
      required: false,
      editable: true,
      importable: true,
      display: {},
      input: {}
    }
  ]
}

function createDefaultViews() {
  return [
    { type: 'list', config: { columns: [] } },
    { type: 'selector', config: { columns: [] } },
    { type: 'detail', config: {} },
    { type: 'editor', config: {} }
  ]
}

const formData = ref({
  title: '',
  code: '',
  icon: 'fa-server',
  isAuto: 1,
  templateId: '',
  attrs: createDefaultAttrs()
})

const formRules = computed(() => {
  const rules = {
    title: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
    code: [
      { required: true, message: '请输入类型编码', trigger: 'blur' },
      {
        pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
        message: '编码必须以英文字母开头，只能包含字母、数字和下划线',
        trigger: 'blur'
      }
    ]
  }
  if (!isEditMode.value) {
    rules.templateId = [{ required: true, message: '请选择要复用的类型模板', trigger: 'change' }]
  }
  return rules
})

const saveDisabled = computed(
  () =>
    saving.value ||
    loading.value ||
    (!isEditMode.value &&
      (templateLoading.value || Boolean(templateError.value) || !formData.value.templateId))
)

// 加载模板列表（新建模式下使用）
const loadTemplateList = async (requestId = loadRequestId) => {
  if (requestId !== loadRequestId || isEditMode.value || templateLoading.value) return
  templateLoading.value = true
  templateError.value = ''
  try {
    const url = `/cmdb/api/cmdb/cit?cacheBuster=${Date.now()}`
    const response = await apiService.get(url)
    const list = response?.data || response || []
    if (requestId !== loadRequestId || isEditMode.value) return
    if (!Array.isArray(list)) throw new Error('模板列表格式不正确')
    templateList.value = list
    const defaultTemplate =
      list.find(
        template => template.code === 'linux' && template.id != null && template.id !== ''
      ) || list.find(template => template.id != null && template.id !== '')
    if (!formData.value.templateId && defaultTemplate) {
      formData.value.templateId = defaultTemplate.id
    }
  } catch (error) {
    if (requestId !== loadRequestId || isEditMode.value) return
    console.error('加载类型模板失败:', error)
    templateList.value = []
    templateError.value = '类型模板加载失败，请重试'
  } finally {
    if (requestId === loadRequestId) {
      templateLoading.value = false
    }
  }
}

// 加载类型详情（编辑模式下保持原有 attrs 和 views 完整）
const loadModelDetail = async () => {
  const requestId = ++loadRequestId
  templateList.value = []
  templateError.value = ''
  templateLoading.value = false
  loading.value = false

  if (!isEditMode.value) {
    originalData.value = null
    formData.value = {
      title: '',
      code: '',
      icon: 'fa-server',
      isAuto: 1,
      templateId: '',
      attrs: createDefaultAttrs()
    }
    loadTemplateList(requestId)
    return
  }

  // 先用行数据做即时回显
  formData.value = {
    title: props.modelData?.title || '',
    code: props.modelData?.code || '',
    icon: props.modelData?.icon || 'fa-server',
    isAuto: props.modelData?.is_auto ?? props.modelData?.isAuto ?? 0,
    templateId: '',
    attrs: createDefaultAttrs()
  }

  loading.value = true
  try {
    const url = `/cmdb/api/cmdb/cit/vo/citid/${modelId.value}?cacheBuster=${Date.now()}`
    const response = await apiService.get(url)
    if (requestId !== loadRequestId) return
    const res = response?.data || response || {}
    originalData.value = res

    formData.value = {
      title: res.title || props.modelData?.title || '',
      code: res.code || props.modelData?.code || '',
      icon: res.icon || props.modelData?.icon || 'fa-server',
      isAuto: res.isAuto ?? props.modelData?.is_auto ?? 0,
      templateId: '',
      attrs: Array.isArray(res.attrs) && res.attrs.length > 0 ? res.attrs : createDefaultAttrs()
    }
  } catch (error) {
    if (requestId !== loadRequestId) return
    console.error('加载资产类型详情失败:', error)
    ElMessage.error('加载资产类型详情失败')
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false
    }
  }
}

// 保存
const handleSave = async () => {
  if (saveDisabled.value) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const processedAttrs = (formData.value.attrs || []).map(attr => {
      const { _id, ...rest } = attr
      return {
        code: rest.code || null,
        title: rest.title || '',
        type: rest.type || null,
        unique: rest.unique ?? false,
        required: rest.required ?? false,
        editable: rest.editable ?? true,
        importable: rest.importable ?? true,
        display: rest.display || {},
        input: rest.input || {}
      }
    })

    const preservedViews =
      !isEditMode.value || !Array.isArray(originalData.value?.views) || !originalData.value.views.length
        ? createDefaultViews()
        : originalData.value.views

    const saveData = {
      code: formData.value.code.trim(),
      title: formData.value.title.trim(),
      icon: formData.value.icon || '',
      isAuto: formData.value.isAuto,
      attrs: processedAttrs,
      views: preservedViews,
      template_id: !isEditMode.value
        ? formData.value.templateId || '0'
        : originalData.value?.template_id || '0'
    }

    if (isEditMode.value) {
      saveData.id = modelId.value
      saveData.tenantId = originalData.value?.tenantId || null
      saveData.actions = originalData.value?.actions || []
    }

    const url = `/cmdb/api/cmdb/cit/modify/batch?cacheBuster=${Date.now()}`
    await apiService.post(url, saveData)

    ElMessage.success(isEditMode.value ? '修改成功' : '新建成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('保存资产类型失败:', error)
    ElMessage.error(`保存失败: ${error.response?.data?.message || error.message}`)
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  loadRequestId += 1
  formRef.value?.resetFields()
  originalData.value = null
  templateList.value = []
  templateError.value = ''
  templateLoading.value = false
  formData.value = {
    title: '',
    code: '',
    icon: 'fa-server',
    isAuto: 1,
    templateId: '',
    attrs: createDefaultAttrs()
  }
}

// 监听弹窗打开
watch(
  () => props.modelValue,
  val => {
    if (val) {
      loadModelDetail()
    }
  }
)
</script>

<style scoped lang="scss">
.model-form-dialog {
  padding: 4px 8px 0 0;

  :deep(.el-form-item__label) {
    white-space: nowrap;
  }
}

.form-tip {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin-top: 4px;

  &--error {
    color: var(--el-color-danger);
  }
}
</style>
