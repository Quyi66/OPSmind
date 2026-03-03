<template>
  <div class="template-edit">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="navbar-left">
        <el-button text @click="goBack">
          <i class="fa fa-arrow-left"></i>
        </el-button>
        <span class="navbar-title">{{ isEdit ? '编辑模板' : '新增模板' }}</span>
      </div>
      <div class="navbar-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTemplate">
          保存
        </el-button>
      </div>
    </nav>

    <!-- 表单区域 -->
    <div class="form-wrapper" v-loading="loading">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="template-form"
      >
        <el-form-item label="模板名称" prop="templateName">
          <el-input
            v-model="formData.templateName"
            placeholder="请输入模板名称"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
            maxlength="500"
          />
        </el-form-item>

        <el-form-item label="图标" prop="icon">
          <el-input
            v-model="formData.icon"
            placeholder="Font Awesome 图标类名，如 fas fa-server"
          />
        </el-form-item>

        <el-divider content-position="left">审计参数配置</el-divider>

        <div class="audit-params-section">
          <div
            v-for="(param, index) in formData.auditParams"
            :key="index"
            class="audit-param-card"
          >
            <div class="param-header">
              <span class="param-title">参数组 {{ index + 1 }}</span>
              <el-button
                v-if="formData.auditParams.length > 1"
                text
                type="danger"
                size="small"
                @click="removeAuditParam(index)"
              >
                <i class="fa fa-trash-alt"></i> 删除
              </el-button>
            </div>

            <el-form-item label="主机列表">
              <el-select
                v-model="param.hosts"
                multiple
                filterable
                remote
                reserve-keyword
                placeholder="请选择主机"
                style="width: 100%"
              >
                <el-option
                  v-for="host in hostOptions"
                  :key="host.id"
                  :label="host.hostname || host.ip"
                  :value="host"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="巡检脚本">
              <el-select
                v-model="param.scripts"
                multiple
                filterable
                placeholder="请选择脚本"
                style="width: 100%"
              >
                <el-option
                  v-for="script in scriptOptions"
                  :key="script.id"
                  :label="script.name"
                  :value="script"
                />
              </el-select>
            </el-form-item>
          </div>

          <el-button class="add-param-btn" @click="addAuditParam">
            <i class="fa fa-plus"></i> 添加参数组
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { templateApi } from '../api'

const router = useRouter()
const route = useRoute()

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

const templateId = computed(() => route.params.templateId)
const isEdit = computed(() => !!templateId.value)

const formData = ref({
  templateName: '',
  description: '',
  icon: 'fas fa-server',
  auditParams: [
    {
      hosts: [],
      scripts: [],
      ruleExpressions: []
    }
  ]
})

const formRules = {
  templateName: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ]
}

const hostOptions = ref([])
const scriptOptions = ref([])

/**
 * 加载模板详情
 */
async function loadTemplate() {
  if (!templateId.value) return

  loading.value = true
  try {
    const response = await templateApi.getTemplateById(templateId.value)
    const data = response?.data || response

    formData.value = {
      templateName: data.templateName || '',
      description: data.description || '',
      icon: data.icon || 'fas fa-server',
      auditParams: []
    }

    // 解析 auditParams
    let auditParams = []
    try {
      auditParams = typeof data.auditParams === 'string'
        ? JSON.parse(data.auditParams)
        : (data.auditParams || [])
    } catch {
      auditParams = []
    }

    if (auditParams.length > 0) {
      formData.value.auditParams = auditParams
    } else {
      formData.value.auditParams = [{ hosts: [], scripts: [], ruleExpressions: [] }]
    }
  } catch (error) {
    console.error('Failed to load template:', error)
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载主机列表
 */
async function loadHosts() {
  // TODO: 从 CM 模块加载主机列表
  hostOptions.value = []
}

/**
 * 加载脚本列表
 */
async function loadScripts() {
  // TODO: 从 CAC 模块加载脚本列表
  scriptOptions.value = []
}

/**
 * 添加审计参数组
 */
function addAuditParam() {
  formData.value.auditParams.push({
    hosts: [],
    scripts: [],
    ruleExpressions: []
  })
}

/**
 * 移除审计参数组
 */
function removeAuditParam(index) {
  formData.value.auditParams.splice(index, 1)
}

/**
 * 保存模板
 */
async function saveTemplate() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const templateData = {
      templateName: formData.value.templateName,
      description: formData.value.description,
      icon: formData.value.icon,
      auditParams: JSON.stringify(formData.value.auditParams)
    }

    if (isEdit.value) {
      templateData.id = templateId.value
    }

    await templateApi.createTemplate(templateData)
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    goBack()
  } catch (error) {
    console.error('Failed to save template:', error)
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    saving.value = false
  }
}

/**
 * 获取当前模块基础路径
 */
function getBasePath() {
  const path = route.path
  const match = path.match(/^\/([^/]+)/)
  return match ? `/${match[1]}` : '/cac'
}

/**
 * 返回上一页
 */
function goBack() {
  router.push(`${getBasePath()}/templates`)
}

onMounted(() => {
  loadTemplate()
  loadHosts()
  loadScripts()
})
</script>

<style scoped lang="scss">
.template-edit {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid var(--el-border-color-light);

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .navbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .navbar-actions {
    display: flex;
    gap: 8px;
  }
}

.form-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.template-form {
  max-width: 800px;
}

.audit-params-section {
  padding-left: 100px;
}

.audit-param-card {
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  .param-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .param-title {
      font-weight: 600;
      color: #303133;
    }
  }
}

.add-param-btn {
  width: 100%;
  border-style: dashed;
}
</style>
