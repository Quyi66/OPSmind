<template>
  <el-dialog
    v-model="visible"
    title="选择修改密码"
    width="650px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    @close="handleClose"
  >
    <div v-loading="loading" class="select-modify-content">
      <!-- 选中的服务器信息 -->
      <el-alert type="info" :closable="false" class="info-alert">
        <template #title>
          已选择
          <strong>{{ selectedCount }}</strong>
          台服务器进行密码修改
        </template>
      </el-alert>

      <!-- 选中服务器列表 -->
      <div class="selected-servers" v-if="parsedServers.length > 0">
        <div class="servers-header">
          <span>选中服务器</span>
          <el-button text type="primary" size="small" @click="toggleServerList">
            {{ showServerList ? '收起' : '展开' }}
          </el-button>
        </div>
        <div class="servers-list" v-show="showServerList">
          <el-tag
            v-for="(server, index) in parsedServers"
            :key="index"
            type="info"
            size="small"
            class="server-tag"
          >
            {{ server.hostKey }} ({{ server.username }})
          </el-tag>
        </div>
      </div>

      <el-divider />

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="modify-form"
      >
        <!-- 生成方式 -->
        <el-form-item label="生成方式" prop="passwordType">
          <el-radio-group v-model="formData.passwordType" :disabled="submitting">
            <el-radio value="random">随机生成</el-radio>
            <el-radio value="manual">手工输入</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 手工输入密码 -->
        <el-form-item v-if="formData.passwordType === 'manual'" label="新密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入新密码"
            show-password
            autocomplete="new-password"
            :disabled="submitting"
          />
          <div class="hint-text">密码长度8-16位，由数字、大小写字母、~!@$%&_组成</div>
        </el-form-item>

        <!-- 密码有效期 -->
        <el-form-item label="有效期(小时)" prop="expireHours">
          <el-input-number
            v-model="formData.expireHours"
            :min="0"
            :max="8760"
            placeholder="0表示永久有效"
            style="width: 200px"
            :disabled="submitting"
          />
          <div class="hint-text">密码修改成功后的有效时间，0表示永久有效</div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose" :disabled="submitting">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="parsedServers.length === 0"
        @click="handleSubmit"
      >
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as pmsApi from '@/modules/password/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  commaIpStr: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const showServerList = ref(true)

const formData = reactive({
  passwordType: 'random',
  password: '',
  expireHours: 720
})

const formRules = {
  passwordType: [{ required: true, message: '请选择生成方式', trigger: 'change' }],
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 16, message: '密码长度需要8-16位', trigger: 'blur' }
  ]
}

// 解析 commaIpStr，格式: assests_id@@host_key@@username
const parsedServers = computed(() => {
  if (!props.commaIpStr) return []
  return props.commaIpStr
    .split(',')
    .map(item => {
      const parts = item.split('@@')
      return {
        assetsId: parts[0] || '',
        hostKey: parts[1] || parts[0] || '',
        username: parts[2] || ''
      }
    })
    .filter(s => s.hostKey)
})

const selectedCount = computed(() => parsedServers.value.length)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      resetForm()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

function resetForm() {
  formData.passwordType = 'random'
  formData.password = ''
  formData.expireHours = 720
  showServerList.value = parsedServers.value.length <= 10
}

function toggleServerList() {
  showServerList.value = !showServerList.value
}

async function handleSubmit() {
  if (!formRef.value) return
  if (parsedServers.value.length === 0) {
    ElMessage.warning('请先选择服务器')
    return
  }

  try {
    const fieldsToValidate = ['passwordType']
    if (formData.passwordType === 'manual') {
      fieldsToValidate.push('password')
    }
    await formRef.value.validateField(fieldsToValidate)
  } catch {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要修改选中的 ${selectedCount.value} 台服务器的密码吗？`,
      '确认修改密码',
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  submitting.value = true
  try {
    await pmsApi.selectModifyPassword({
      commaIpStr: props.commaIpStr,
      passwordType: formData.passwordType,
      password: formData.passwordType === 'manual' ? formData.password : '',
      expireHours: formData.expireHours
    })

    ElMessage.success('密码修改任务已提交')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('Failed to modify password:', error)
    ElMessage.error('密码修改失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  visible.value = false
}
</script>

<style scoped lang="scss">
.select-modify-content {
  min-height: 200px;
}

.info-alert {
  margin-bottom: 16px;
}

.selected-servers {
  margin-bottom: 16px;

  .servers-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .servers-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 120px;
    overflow-y: auto;
    padding: 12px;
    background: var(--el-bg-color-page);
    border-radius: 6px;
  }

  .server-tag {
    margin: 0;
  }
}

.modify-form {
  padding-top: 10px;
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
