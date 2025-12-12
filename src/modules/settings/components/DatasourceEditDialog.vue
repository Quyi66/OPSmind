<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      label-position="top"
      v-loading="loading"
    >
      <!-- 类型选择（仅新建时显示） -->
      <el-form-item v-if="!isEditing" label="数据源类型" prop="type">
        <el-radio-group v-model="form.type" @change="handleTypeChange">
          <el-radio-button
            v-for="item in datasourceTypes"
            :key="item.type"
            :value="item.type"
          >
            <i :class="item.icon"></i> {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="名称" prop="name">
        <el-input
          v-model="form.name"
          :placeholder="form.type === 'jdbc' ? '仅允许字母、数字、下划线' : '输入数据源名称'"
          :readonly="isEditing"
        />
        <div v-if="form.type === 'jdbc'" class="form-tip">名称用于唯一标识数据源，创建后不可修改</div>
      </el-form-item>

      <!-- JDBC 类型特有字段 -->
      <template v-if="form.type === 'jdbc'">
        <el-form-item label="JDBC 驱动" prop="config.driver">
          <el-select
            v-model="selectedDriverClass"
            style="width: 100%"
            @change="handleDriverChange"
          >
            <el-option
              v-for="driver in jdbcDrivers"
              :key="driver.className"
              :label="driver.dbName"
              :value="driver.className"
            />
          </el-select>
          <div v-if="form.config?.driver" class="form-tip">{{ form.config.driver }}</div>
        </el-form-item>

        <el-form-item v-if="selectedDriver" label="URL 模板参考">
          <el-input :model-value="selectedDriver.urlTemplate" readonly>
            <template #append>
              <el-button @click="copyToClipboard(selectedDriver.urlTemplate)">
                <i class="fa fa-copy"></i>
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="JDBC URL" prop="config.url">
          <el-input v-model="form.config.url" placeholder="如：jdbc:mysql://localhost:3306/dbname" />
        </el-form-item>

        <el-form-item label="验证语句">
          <el-input v-model="form.config.validationQuery" placeholder="如：SELECT 1" />
        </el-form-item>

        <el-form-item label="用户名" prop="config.username">
          <el-input v-model="form.config.username" />
        </el-form-item>

        <el-form-item label="密码" prop="config.password">
          <el-input
            v-model="form.config.password"
            type="password"
            show-password
            :placeholder="isEditing ? '不修改请留空' : '输入密码'"
          />
        </el-form-item>

        <el-form-item label="负责人" prop="config.manager">
          <el-input v-model="form.config.manager" />
        </el-form-item>
      </template>

      <el-form-item label="描述" :prop="form.type === 'jdbc' ? 'description' : undefined">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="输入数据源描述"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        <i class="fa fa-save"></i> 保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { datasourceService } from '@/services/dts/datasource.service'

const props = defineProps({
  modelValue: Boolean,
  datasource: Object
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

// 数据源类型列表
const datasourceTypes = [
  { type: 'jdbc', label: 'JDBC 数据库', icon: 'fa fa-database' },
  { type: 'rest', label: 'REST API', icon: 'fa fa-cloud-download' },
  { type: 'join', label: '多数据源关联', icon: 'fa fa-random' }
]

// 表单数据
const form = reactive({
  type: 'jdbc',
  name: '',
  description: '',
  config: {
    driver: '',
    url: '',
    validationQuery: '',
    username: '',
    password: '',
    manager: ''
  }
})

// 原始密码（用于检测是否修改）
const originalPassword = ref('')

// JDBC 驱动列表
const jdbcDrivers = ref([])
const selectedDriverClass = ref('')

const selectedDriver = computed(() => {
  return jdbcDrivers.value.find(d => d.className === selectedDriverClass.value)
})

const isEditing = computed(() => !!props.datasource?.id)

const dialogTitle = computed(() => {
  if (isEditing.value) {
    return `编辑数据源 - ${props.datasource?.name || ''}`
  }
  return '新建数据源'
})

// 表单验证规则
const rules = computed(() => ({
  type: [{ required: true, message: '请选择数据源类型', trigger: 'change' }],
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    ...(form.type === 'jdbc' && !isEditing.value
      ? [{ pattern: /^[a-zA-Z0-9_]+$/, message: '仅允许字母、数字、下划线', trigger: 'blur' }]
      : [])
  ],
  'config.driver': form.type === 'jdbc' ? [{ required: true, message: '请选择驱动', trigger: 'change' }] : [],
  'config.url': form.type === 'jdbc' ? [{ required: true, message: '请输入 JDBC URL', trigger: 'blur' }] : [],
  'config.username': form.type === 'jdbc' ? [{ required: true, message: '请输入用户名', trigger: 'blur' }] : [],
  'config.password': form.type === 'jdbc' && !isEditing.value ? [{ required: true, message: '请输入密码', trigger: 'blur' }] : [],
  'config.manager': form.type === 'jdbc' ? [{ required: true, message: '请输入负责人', trigger: 'blur' }] : [],
  description: form.type === 'jdbc' ? [{ required: true, message: '请输入描述', trigger: 'blur' }] : []
}))

// 监听对话框打开
watch(visible, (val) => {
  if (val) {
    loadDrivers()
    if (props.datasource) {
      loadDatasource(props.datasource)
    } else {
      resetForm()
    }
  }
})

function loadDrivers() {
  jdbcDrivers.value = datasourceService.getJdbcDrivers()
}

function loadDatasource(ds) {
  form.id = ds.id
  form.type = ds.type || 'jdbc'
  form.name = ds.name || ''
  form.description = ds.description || ''
  form.config = {
    driver: ds.config?.driver || '',
    url: ds.config?.url || '',
    validationQuery: ds.config?.validationQuery || '',
    username: ds.config?.username || '',
    password: ds.config?.password || '',
    manager: ds.config?.manager || ''
  }
  selectedDriverClass.value = form.config.driver || ''
  originalPassword.value = form.config.password || ''
}

function resetForm() {
  form.id = undefined
  form.type = 'jdbc'
  form.name = ''
  form.description = ''
  form.config = {
    driver: '',
    url: '',
    validationQuery: '',
    username: '',
    password: '',
    manager: ''
  }
  selectedDriverClass.value = ''
  originalPassword.value = ''
  formRef.value?.clearValidate()
}

function handleTypeChange() {
  if (form.type !== 'jdbc') {
    form.config = null
  } else {
    form.config = {
      driver: '',
      url: '',
      validationQuery: '',
      username: '',
      password: '',
      manager: ''
    }
  }
  formRef.value?.clearValidate()
}

function handleDriverChange() {
  if (!form.config) return
  form.config.driver = selectedDriverClass.value
  if (selectedDriver.value) {
    form.config.validationQuery = selectedDriver.value.validationQuery
    if (!isEditing.value) {
      form.config.url = selectedDriver.value.urlTemplate
    }
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  try {
    await ElMessageBox.confirm(
      isEditing.value ? '确定要保存修改吗？' : '确定要创建数据源吗？',
      '确认操作',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  saving.value = true
  try {
    // 准备保存数据
    const saveData = {
      ...form,
      config: form.config ? { ...form.config } : null
    }

    // 如果是编辑且密码未修改，删除密码字段
    if (isEditing.value && saveData.config && saveData.config.password === originalPassword.value) {
      delete saveData.config.password
    }

    const result = await datasourceService.saveDatasource(saveData)
    ElMessage.success(isEditing.value ? '保存成功' : '创建成功')
    emit('saved', result)
    visible.value = false
  } catch (error) {
    console.error('Failed to save datasource:', error)
    ElMessage.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-radio-button__inner) {
  i {
    margin-right: 6px;
  }
}
</style>
