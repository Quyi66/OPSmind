<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="700px"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
      <!-- 创建作业时需要填写标题和描述 -->
      <template v-if="isCreateJobMode">
        <el-form-item label="作业标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入作业标题"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="作业描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入作业描述（可选）"
          />
        </el-form-item>
      </template>

      <!-- 命令信息 -->
      <el-form-item label="选中命令">
        <div class="selected-commands">
          <el-tag
            v-for="cmd in commandList"
            :key="cmd.id"
            type="info"
            class="command-tag"
          >
            {{ cmd.name }}
          </el-tag>
        </div>
      </el-form-item>

      <!-- 主机选择 -->
      <el-form-item label="目标主机" prop="hosts" required>
        <div class="host-selector">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="mb-3"
          >
            <template #title>
              请选择要执行命令的目标主机
            </template>
          </el-alert>

          <!-- 简化版主机选择器 -->
          <div class="host-input-group">
            <el-input
              v-model="hostInput"
              placeholder="输入主机IP或主机名，多个用逗号分隔"
              @keyup.enter="addHosts"
            >
              <template #append>
                <el-button @click="addHosts">添加</el-button>
              </template>
            </el-input>
          </div>

          <div v-if="formData.hosts.length > 0" class="host-list">
            <el-tag
              v-for="(host, index) in formData.hosts"
              :key="index"
              closable
              type="success"
              class="host-tag"
              @close="removeHost(index)"
            >
              {{ host.value || host }}
            </el-tag>
          </div>
          <div v-else class="no-hosts">
            <span class="text-muted">暂未选择主机</span>
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        v-if="isCreateJobMode"
        type="primary"
        :loading="submitting"
        @click="handleSaveJob"
      >
        保存作业
      </el-button>
      <el-button
        v-else
        type="primary"
        :loading="submitting"
        @click="handleRunCommand"
      >
        执行命令
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { runCommands, saveJob } from '@/modules/automation/api/command'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  command: {
    type: [Object, Array],
    default: null
  },
  mode: {
    type: String,
    default: 'run', // 'run' 或 'createJob'
    validator: (value) => ['run', 'createJob'].includes(value)
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 是否创建作业模式
const isCreateJobMode = computed(() => props.mode === 'createJob')

// 对话框标题
const dialogTitle = computed(() => {
  return isCreateJobMode.value ? '创建命令作业' : '执行命令'
})

// 命令列表（支持单个或多个命令）
const commandList = computed(() => {
  if (!props.command) return []
  return Array.isArray(props.command) ? props.command : [props.command]
})

// 表单引用
const formRef = ref(null)

// 主机输入
const hostInput = ref('')

// 表单数据
const formData = ref({
  title: '',
  description: '',
  hosts: []
})

// 表单验证规则
const formRules = computed(() => ({
  title: isCreateJobMode.value ? [
    { required: true, message: '请输入作业标题', trigger: 'blur' }
  ] : [],
  hosts: [
    {
      validator: (rule, value, callback) => {
        if (!value || value.length === 0) {
          callback(new Error('请至少选择一个目标主机'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}))

// 提交状态
const submitting = ref(false)

// 监听对话框打开
watch(() => props.visible, (val) => {
  if (val) {
    resetForm()
    // 如果是创建作业模式，默认使用命令名称作为标题
    if (isCreateJobMode.value && commandList.value.length === 1) {
      formData.value.title = commandList.value[0].name + ' 作业'
    }
  }
})

// 重置表单
function resetForm() {
  formData.value = {
    title: '',
    description: '',
    hosts: []
  }
  hostInput.value = ''
  formRef.value?.clearValidate()
}

// 添加主机
function addHosts() {
  if (!hostInput.value.trim()) return

  const hosts = hostInput.value.split(',').map(h => h.trim()).filter(h => h)
  hosts.forEach(host => {
    if (!formData.value.hosts.some(h => (h.value || h) === host)) {
      formData.value.hosts.push({
        key: host,
        value: host,
        assetType: 'host'
      })
    }
  })
  hostInput.value = ''
}

// 移除主机
function removeHost(index) {
  formData.value.hosts.splice(index, 1)
}

// 执行命令
async function handleRunCommand() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const request = {
      commands: commandList.value.map(cmd => cmd.id),
      hosts: formData.value.hosts
    }

    const response = await runCommands(request)
    const result = response.data || response

    ElMessage.success('命令已提交执行')
    emit('success', result)
    handleClose()
  } catch (error) {
    console.error('执行命令失败:', error)
    ElMessage.error('执行命令失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 保存作业
async function handleSaveJob() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const commands = commandList.value.map(cmd => ({ id: cmd.id }))
    const configJson = JSON.stringify({
      tasks: [{
        commands: commands,
        hosts: formData.value.hosts
      }]
    })

    const job = {
      title: formData.value.title,
      description: formData.value.description,
      type: 'command',
      configJson: configJson
    }

    const response = await saveJob(job)
    const result = response.data || response

    ElMessage.success('作业创建成功')
    emit('success', result)
    handleClose()
  } catch (error) {
    console.error('创建作业失败:', error)
    ElMessage.error('创建作业失败: ' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

// 关闭对话框
function handleClose() {
  dialogVisible.value = false
  resetForm()
}
</script>

<style scoped lang="scss">
.selected-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.command-tag {
  font-size: 13px;
}

.host-selector {
  width: 100%;
}

.host-input-group {
  margin-bottom: 12px;
}

.host-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  min-height: 60px;
}

.host-tag {
  font-size: 13px;
}

.no-hosts {
  padding: 24px;
  text-align: center;
  background: #f8f9fa;
  border-radius: 6px;

  .text-muted {
    color: #94a3b8;
    font-size: 13px;
  }
}

.mb-3 {
  margin-bottom: 12px;
}
</style>
