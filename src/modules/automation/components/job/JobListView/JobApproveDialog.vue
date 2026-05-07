<template>
  <el-dialog
    v-model="dialogVisible"
    title="作业审批"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" label-width="120px" size="default">
      <el-form-item label="所属应用" v-if="appName">
        <span>{{ appName }}</span>
      </el-form-item>

      <el-form-item label="作业名称">
        <span>{{ jobTitle }}</span>
      </el-form-item>

      <el-form-item label="审批模式" required>
        <el-radio-group v-model="formData.approveMode">
          <el-radio value="noLimitParams">不限定参数执行</el-radio>
          <el-radio value="limitParams" v-if="hasParams">限定参数执行</el-radio>
        </el-radio-group>

        <div v-if="formData.approveMode === 'limitParams' && hasParams" style="margin-top: 12px; padding-left: 20px;">
          <el-tag
            v-for="(param, index) in paramsArray"
            :key="index"
            style="margin-bottom: 8px; max-width: 100%; display: block; white-space: pre-wrap;"
          >
            {{ param.name }} : {{ param.value }}
          </el-tag>
        </div>
      </el-form-item>

      <el-form-item label="脚本路径" v-if="scriptPaths.length > 0">
        <div v-for="(scriptPath, index) in scriptPaths" :key="index" style="margin-bottom: 8px;">
          <el-button type="primary" link @click="handleViewScript(scriptPath)">
            <i class="fa fa-eye" /> {{ scriptPath }}
          </el-button>
        </div>
      </el-form-item>

      <el-form-item label="有效时长" v-if="formData.approveMode !== 'limitParams'">
        <el-input-number
          v-model="formData.validHour"
          :min="1"
          :max="999"
          :step="1"
          controls-position="right"
        />
        <span style="margin-left: 8px;">小时</span>
        <el-tooltip
          content="审批通过后，在有效期内可以执行作业"
          placement="top"
        >
          <i class="fa fa-question-circle text-muted" style="margin-left: 8px; cursor: help;" />
        </el-tooltip>
      </el-form-item>

      <el-form-item label="申请说明">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入申请说明"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交申请
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  visible: { type: Boolean, default: false },
  jobId: { type: String, required: true },
  jobTitle: { type: String, default: '' },
  appletCode: { type: String, default: '' },
  params: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const appName = ref('')
const scriptPaths = ref([])

const formData = reactive({
  jobId: '',
  params: null,
  approveMode: 'noLimitParams',
  validHour: 1,
  description: ''
})

const paramsArray = computed(() => {
  if (!props.params || typeof props.params !== 'object') return []
  return Object.entries(props.params).map(([name, value]) => ({ name, value }))
})

const hasParams = computed(() => paramsArray.value.length > 0)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    initForm()
  }
}, { immediate: true }
)

watch(dialogVisible, (val) => {
  if (!val) {
    emit('update:visible', false)
  }
}, { immediate: true }
)

function initForm() {
  formData.jobId = props.jobId
  formData.params = null
  formData.approveMode = 'noLimitParams'
  formData.validHour = 1
  formData.description = ''

  // 获取脚本路径
  if (props.jobId) {
    jaoApi.getScriptPath(props.jobId)
      .then((data) => {
        scriptPaths.value = data || []
      })
      .catch(() => {
        scriptPaths.value = []
      })
  }

  // 翻译应用名称
  if (props.appletCode) {
    appName.value = translateAppCode(props.appletCode)
  }
}

function translateAppCode(code) {
  const translations = {
    'cac': '系统巡检',
    'acm': '资产管理',
    'pms': '密码管理',
    'sudo': 'sudo权限管理',
    'vap': '补丁管理',
    'spm': 'Yum仓库管理',
    'uim': '用户管理'
  }
  return translations[code] || code
}

function handleViewScript(scriptPath) {
  ElMessage.info('查看脚本功能开发中')
}

async function handleSubmit() {
  if (!formData.approveMode) {
    ElMessage.warning('请选择审批模式')
    return
  }

  submitting.value = true

  try {
    const payload = {
      jobId: props.jobId,
      approveMode: formData.approveMode,
      validHour: formData.validHour,
      description: formData.description
    }

    // 如果是限定参数模式，需要传递参数
    if (formData.approveMode === 'limitParams') {
      payload.params = JSON.stringify(paramsArray.value)
    } else {
      payload.params = null
    }

    await jaoApi.submitApprove(payload)
    emit('success')
    handleClose()
  } catch (error) {
    ElMessage.error(error?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  dialogVisible.value = false
}
</script>

<style scoped lang="scss">
.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
