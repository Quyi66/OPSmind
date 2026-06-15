<template>
  <el-dialog
    v-model="visible"
    title="自动化资产录入"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="auto-entry">
      <!-- 提示信息 -->
      <el-alert type="success" :closable="false" show-icon class="tip-alert">
        <template #title>
          <span class="tip-alert-text">
            注意：使用自动化设备录入需满足，该资产模型的唯一模型属性有且只能是纳管IP。
            支持文本格式的IP，文本格式支持：逗号分割、空格分割、换行分割中的一种或多种，同时支持网段录入。例如：192.168.1.0/26
          </span>
        </template>
      </el-alert>

      <!-- 表单 -->
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
        class="entry-form"
      >
        <el-form-item label="IP" prop="hostKeys">
          <el-input
            v-model="formData.hostKeys"
            type="textarea"
            :rows="5"
            placeholder="请输入IP地址，支持逗号分割、空格分割、换行分割"
          />
        </el-form-item>

        <el-form-item label="分组" prop="groupId">
          <el-select v-model="formData.groupId" placeholder="请选择分组" style="width: 100%">
            <el-option
              v-for="item in groupOptions"
              :key="item.id"
              :label="item.path"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="模型属性" prop="attr">
          <el-select
            v-model="formData.attr"
            placeholder="请选择模型属性"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="item in attrOptions"
              :key="item.code"
              :label="item.code"
              :value="item.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="属性值" prop="value">
          <el-input v-model="formData.value" type="textarea" :rows="3" placeholder="请输入属性值" />
        </el-form-item>

        <el-form-item label="执行引擎节点(instance group)">
          <el-select
            v-model="formData.instanceGroup"
            placeholder="请选择执行引擎节点"
            style="width: 100%"
          >
            <el-option
              v-for="item in instanceGroupOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
          <div class="form-desc">此为Ansible或者Tower引擎节点</div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi, automationApi } from '../../api'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  assetType: {
    type: String,
    default: 'linux'
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const saving = ref(false)
const formRef = ref(null)

// 表单数据
const formData = ref({
  hostKeys: '',
  groupId: '',
  attr: '',
  value: '',
  instanceGroup: 'default'
})

// 表单校验规则
const formRules = {
  hostKeys: [{ required: true, message: '请输入IP地址', trigger: 'blur' }]
}

// 下拉选项
const groupOptions = ref([])
const attrOptions = ref([])
const instanceGroupOptions = ref(['default'])

// 加载分组列表
const loadGroupOptions = async () => {
  try {
    const res = await assetApi.getGroupByCit(props.assetType)
    groupOptions.value = res.records || []
  } catch (error) {
    console.error('加载分组列表失败:', error)
  }
}

// 加载模型属性列表
const loadAttrOptions = async () => {
  try {
    const res = await assetApi.getModel(props.assetType)
    // 只显示 type != 'group' 且 editable 为 true 的属性
    const attrs = (res.records || []).filter(
      item => item.type !== 'group' && item.editable && item.code
    )
    attrOptions.value = attrs
  } catch (error) {
    console.error('加载模型属性失败:', error)
  }
}

// 加载执行引擎节点列表
const loadInstanceGroupOptions = async () => {
  try {
    const instanceGroups = await automationApi.getInstanceGroupList()
    instanceGroupOptions.value = instanceGroups.length > 0 ? ['none', ...instanceGroups] : ['default']
  } catch (error) {
    console.error('加载执行引擎节点失败:', error)
    instanceGroupOptions.value = ['default']
  }
}

// 加载所有数据
const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([loadGroupOptions(), loadAttrOptions(), loadInstanceGroupOptions()])
  } finally {
    loading.value = false
  }
}

// 保存
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    // 处理 hostKeys，将换行符转换为 \\n
    const hostKeys = formData.value.hostKeys.replace(/\n/g, '\\n')

    // 调用作业执行接口
    await apiService.post(`/jao/api/jao/jobs/0MKtcJ/run?cacheBuster=${Date.now()}`, {
      params: {
        hostKeys,
        ciType: props.assetType,
        instanceGroup: formData.value.instanceGroup || 'default',
        groupId: formData.value.groupId || '/',
        code: formData.value.attr || '',
        value: formData.value.value || '',
        aapInstanceGroup: ''
      }
    })

    ElMessage.success('资产录入任务已提交')
    emit('saved')
    handleClose()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(`保存失败: ${error.message || '未知错误'}`)
  } finally {
    saving.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  formData.value = {
    hostKeys: '',
    groupId: '',
    attr: '',
    value: '',
    instanceGroup: 'default'
  }
}

// 监听弹窗打开
watch(visible, val => {
  if (val) {
    loadData()
  }
})
</script>

<style scoped lang="scss">
.auto-entry {
  .tip-alert {
    margin-bottom: 20px;
  }

  .tip-alert-text {
    font-size: 13px;
    line-height: 1.6;
    display: inline-block;
  }

  .entry-form {
    .form-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      margin-top: 4px;
    }
  }
}
</style>
