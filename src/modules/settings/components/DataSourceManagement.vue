<template>
  <div class="ops-page-layout">
    <div class="layout-container">
      <!-- 左侧边栏 - 数据源树 -->
      <div class="ops-sidebar-nav ops-sidebar-nav--wide" style="width: 280px;">
        <div class="ops-sidebar-header">
          <span class="ops-sidebar-title" style="padding: 0;">数据源</span>
          <el-button type="primary" size="small" @click="handleCreate">
            <i class="fa fa-plus"></i>
          </el-button>
        </div>
        <div class="ops-sidebar-content">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
            @node-contextmenu="handleContextMenu"
            v-loading="loading"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <i :class="getNodeIcon(data)"></i>
                <span class="tree-node-label">{{ node.label }}</span>
                <span v-if="data.isFolder" class="tree-node-count">({{ data.children?.length || 0 }})</span>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 主内容区 - 编辑表单 -->
      <div class="main-content" v-loading="formLoading">
        <template v-if="selectedDatasource || isCreating">
          <!-- 面包屑导航 -->
          <nav class="breadcrumb-nav">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>数据源</el-breadcrumb-item>
              <el-breadcrumb-item>{{ isCreating ? '新建数据源' : '编辑数据源' }}</el-breadcrumb-item>
            </el-breadcrumb>
          </nav>

          <!-- 类型选择（仅新建时显示） -->
          <el-card v-if="isCreating && !form.type" class="type-selection-card">
            <template #header>
              <span>请选择数据源类型</span>
            </template>
            <div class="type-grid">
              <div
                v-for="item in datasourceTypes"
                :key="item.type"
                class="type-card"
                @click="selectType(item.type)"
              >
                <div class="type-icon">
                  <i :class="item.icon"></i>
                </div>
                <h4>{{ item.label }}</h4>
              </div>
            </div>
          </el-card>

          <!-- 编辑表单 -->
          <el-card v-else class="edit-card">
            <template #header>
              <div class="card-header">
                <span>
                  <span v-if="form.type === 'jdbc'">JDBC 数据源</span>
                  <span v-else-if="form.type === 'rest'">RESTful API 数据源</span>
                  <span v-else-if="form.type === 'join'">多数据源关联</span>
                  <el-tag size="small" style="margin-left: 8px;">{{ form.type }}</el-tag>
                </span>
              </div>
            </template>

            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="140px"
              label-position="left"
            >
              <el-form-item label="名称（唯一标识）" prop="name">
                <el-input
                  v-model="form.name"
                  :placeholder="form.type === 'jdbc' ? '不允许中文和空格' : '输入数据源名称'"
                  :readonly="!isCreating"
                  class="form-input-md"
                />
              </el-form-item>

              <!-- JDBC 类型特有字段 -->
              <template v-if="form.type === 'jdbc'">
                <el-form-item label="JDBC 驱动">
                  <el-select
                    v-model="selectedDriverClass"
                    class="form-input-md"
                    @change="handleDriverChange"
                  >
                    <el-option
                      v-for="driver in jdbcDrivers"
                      :key="driver.className"
                      :label="driver.dbName"
                      :value="driver.className"
                    />
                  </el-select>
                  <div class="form-help">{{ form.config?.driver }}</div>
                </el-form-item>

                <el-form-item v-if="selectedDriver" label="">
                  <div class="url-template">
                    <span class="url-template-label">JDBC URL 示例：</span>
                    <el-input :model-value="selectedDriver.urlTemplate" readonly class="form-input-lg">
                      <template #append>
                        <el-button @click="copyToClipboard(selectedDriver.urlTemplate)">
                          <i class="fa fa-copy"></i>
                        </el-button>
                      </template>
                    </el-input>
                  </div>
                </el-form-item>

                <el-form-item label="JDBC URL" prop="config.url">
                  <el-input v-model="form.config.url" class="form-input-lg" />
                </el-form-item>

                <el-form-item label="验证语句">
                  <el-input v-model="form.config.validationQuery" class="form-input-lg code-input" />
                </el-form-item>

                <el-form-item label="用户名" prop="config.username">
                  <el-input v-model="form.config.username" class="form-input-md" />
                </el-form-item>

                <el-form-item label="密码" prop="config.password">
                  <el-input
                    v-model="form.config.password"
                    type="password"
                    show-password
                    class="form-input-md"
                  />
                </el-form-item>

                <el-form-item label="负责人" prop="config.manager">
                  <el-input v-model="form.config.manager" class="form-input-md" />
                </el-form-item>
              </template>

              <!-- 描述字段（仅 JDBC 类型显示） -->
              <el-form-item v-if="form.type === 'jdbc'" label="描述" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="3"
                  placeholder="输入数据源描述"
                />
              </el-form-item>

              <el-form-item class="form-actions">
                <el-button
                  v-if="form.type === 'jdbc' && !isCreating"
                  @click="handleTestConnectivity"
                  :loading="testing"
                >
                  测试连接
                </el-button>
                <el-button type="primary" @click="handleSave" :loading="saving">
                  保存
                </el-button>
              </el-form-item>
            </el-form>

            <!-- 测试结果展示 -->
            <el-card v-if="testResult" class="test-result-card">
              <template #header>
                <span>测试结果</span>
              </template>
              <pre class="test-result-content">{{ JSON.stringify(testResult, null, 2) }}</pre>
            </el-card>
          </el-card>
        </template>
        <template v-else>
          <el-empty description="请从左侧选择数据源进行编辑，或点击 + 新建数据源" />
        </template>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click="contextMenuVisible = false"
    >
      <div class="context-menu-item" @click="handleEdit(contextMenuNode)">
        <i class="fa fa-edit"></i> 编辑
      </div>
      <div class="context-menu-item danger" @click="handleDelete(contextMenuNode)">
        <i class="fa fa-trash"></i> 删除
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { datasourceService } from '@/services/dts/datasource.service'

const loading = ref(false)
const formLoading = ref(false)
const saving = ref(false)
const testing = ref(false)
const datasources = ref([])
const selectedDatasource = ref(null)
const isCreating = ref(false)
const treeRef = ref()
const formRef = ref(null)
const testResult = ref(null)

// 右键菜单
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNode = ref(null)

// 数据源类型配置
const typeConfig = {
  jdbc: { name: 'JDBC 数据库', icon: 'fa fa-database', tagType: '' },
  rest: { name: 'REST API', icon: 'fa fa-cloud', tagType: 'success' },
  join: { name: '多数据源关联', icon: 'fa fa-random', tagType: 'warning' },
  es: { name: 'ElasticSearch', icon: 'fa fa-search', tagType: 'info' },
  file: { name: '文件', icon: 'fa fa-file', tagType: 'info' },
  mongo: { name: 'MongoDB', icon: 'fa fa-leaf', tagType: 'info' },
  hbase: { name: 'HBase', icon: 'fa fa-th', tagType: 'info' },
  orientdb: { name: 'OrientDB', icon: 'fa fa-cube', tagType: 'info' }
}

// 数据源类型列表（用于创建时选择）
const datasourceTypes = [
  { type: 'jdbc', label: 'JDBC 数据库', icon: 'fad fa-database fa-5x' },
  { type: 'rest', label: 'REST API', icon: 'fad fa-cloud-download fa-5x' },
  { type: 'join', label: '多数据源关联', icon: 'fad fa-random fa-5x' }
]

const treeProps = {
  children: 'children',
  label: 'label'
}

// 表单数据（包含所有字段，保存时需要传递完整对象）
const form = reactive({
  id: undefined,
  tenantId: undefined,
  type: '',
  name: '',
  status: '0',
  description: '',
  config: {
    driver: '',
    url: '',
    validationQuery: '',
    username: '',
    password: '',
    manager: ''
  },
  createdBy: undefined,
  creatorName: undefined,
  createdAt: undefined,
  modifiedBy: undefined,
  modifierName: undefined,
  modifiedAt: undefined,
  datasetDTOList: [],
  accessControl: null,
  action: null
})

// 原始密码（用于检测是否修改）
const originalPassword = ref('')

// JDBC 驱动列表
const jdbcDrivers = ref([])
const selectedDriverClass = ref('')

const selectedDriver = computed(() => {
  return jdbcDrivers.value.find(d => d.className === selectedDriverClass.value)
})

// 表单验证规则
const rules = computed(() => ({
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    ...(form.type === 'jdbc' && isCreating.value
      ? [{ pattern: /^[a-zA-Z0-9_]+$/, message: '仅允许字母、数字、下划线', trigger: 'blur' }]
      : [])
  ],
  'config.url': form.type === 'jdbc' ? [{ required: true, message: '请输入 JDBC URL', trigger: 'blur' }] : [],
  'config.username': form.type === 'jdbc' ? [{ required: true, message: '请输入用户名', trigger: 'blur' }] : [],
  'config.password': form.type === 'jdbc' && isCreating.value ? [{ required: true, message: '请输入密码', trigger: 'blur' }] : [],
  'config.manager': form.type === 'jdbc' ? [{ required: true, message: '请输入负责人', trigger: 'blur' }] : [],
  description: form.type === 'jdbc' ? [{ required: true, message: '请输入描述', trigger: 'blur' }] : []
}))

// 构建树形数据
const treeData = computed(() => {
  const groups = {}

  // 按类型分组
  for (const ds of datasources.value) {
    const type = ds.type || 'jdbc'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(ds)
  }

  // 转换为树形结构
  return Object.entries(groups).map(([type, items]) => ({
    id: `type-${type}`,
    label: typeConfig[type]?.name || type,
    type,
    isFolder: true,
    children: items.map(ds => ({
      id: ds.id,
      label: ds.name || ds.id,
      type: ds.type,
      isFolder: false,
      data: ds
    }))
  }))
})

function getNodeIcon(node) {
  if (node.isFolder) {
    const type = node.type
    return typeConfig[type]?.icon || 'fa fa-folder'
  }
  return 'fa fa-table'
}

async function loadDatasources() {
  loading.value = true
  try {
    datasources.value = await datasourceService.findAllDatasources()
  } catch (error) {
    console.error('Failed to load datasources:', error)
    ElMessage.error('加载数据源列表失败')
  } finally {
    loading.value = false
  }
}

async function loadDatasourceDetail(id) {
  formLoading.value = true
  testResult.value = null
  try {
    const ds = await datasourceService.findDatasource(id)
    if (ds) {
      selectedDatasource.value = ds
      loadFormData(ds)
    }
  } catch (error) {
    console.error('Failed to load datasource detail:', error)
    ElMessage.error('加载数据源详情失败')
  } finally {
    formLoading.value = false
  }
}

function loadFormData(ds) {
  // 加载所有字段
  form.id = ds.id
  form.tenantId = ds.tenantId
  form.type = ds.type || 'jdbc'
  form.name = ds.name || ''
  form.status = ds.status || '0'
  form.description = ds.description || ''
  form.createdBy = ds.createdBy
  form.creatorName = ds.creatorName
  form.createdAt = ds.createdAt
  form.modifiedBy = ds.modifiedBy
  form.modifierName = ds.modifierName
  form.modifiedAt = ds.modifiedAt
  form.datasetDTOList = ds.datasetDTOList || []
  form.accessControl = ds.accessControl
  form.action = ds.action

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

  // 加载驱动列表
  jdbcDrivers.value = datasourceService.getJdbcDrivers()
}

function resetForm() {
  form.id = undefined
  form.tenantId = undefined
  form.type = ''
  form.name = ''
  form.status = '0'
  form.description = ''
  form.createdBy = undefined
  form.creatorName = undefined
  form.createdAt = undefined
  form.modifiedBy = undefined
  form.modifierName = undefined
  form.modifiedAt = undefined
  form.datasetDTOList = []
  form.accessControl = null
  form.action = null
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
  testResult.value = null
  formRef.value?.clearValidate()
}

function handleNodeClick(data) {
  if (!data.isFolder && data.data) {
    isCreating.value = false
    loadDatasourceDetail(data.data.id)
  }
}

function handleContextMenu(event, data) {
  if (data.isFolder) return

  event.preventDefault()
  contextMenuVisible.value = true
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuNode.value = data.data || null
}

function handleCreate() {
  isCreating.value = true
  selectedDatasource.value = null
  resetForm()
  jdbcDrivers.value = datasourceService.getJdbcDrivers()
}

function selectType(type) {
  form.type = type
  if (type === 'jdbc') {
    form.config = {
      driver: '',
      url: '',
      validationQuery: '',
      username: '',
      password: '',
      manager: ''
    }
  } else {
    form.config = null
  }
}

function handleEdit(datasource) {
  if (!datasource) return
  isCreating.value = false
  loadDatasourceDetail(datasource.id)
}

async function handleDelete(datasource) {
  if (!datasource || !datasource.id) return

  try {
    await ElMessageBox.confirm(
      `确定要删除数据源 "${datasource.name}" 吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  try {
    await datasourceService.deleteDatasource(datasource.id)
    ElMessage.success('删除成功')
    if (selectedDatasource.value?.id === datasource.id) {
      selectedDatasource.value = null
      resetForm()
    }
    await loadDatasources()
  } catch (error) {
    console.error('Failed to delete datasource:', error)
    ElMessage.error(error?.message || '删除失败')
  }
}

function handleDriverChange() {
  if (!form.config) return
  form.config.driver = selectedDriverClass.value
  if (selectedDriver.value) {
    form.config.validationQuery = selectedDriver.value.validationQuery
    if (isCreating.value) {
      form.config.url = selectedDriver.value.urlTemplate
    }
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

async function handleTestConnectivity() {
  if (!form.id) {
    ElMessage.info('请先保存数据源后再进行测试')
    return
  }

  testing.value = true
  testResult.value = null
  try {
    const result = await datasourceService.testConnectivity(form)
    testResult.value = result
    ElMessage.success('连接测试成功')
  } catch (error) {
    console.error('Test connectivity failed:', error)
    ElMessage.error(error?.message || '连接测试失败')
  } finally {
    testing.value = false
  }
}

async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
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
    if (!isCreating.value && saveData.config && saveData.config.password === originalPassword.value) {
      delete saveData.config.password
    }

    const result = await datasourceService.saveDatasource(saveData)
    ElMessage.success('保存成功')

    // 更新当前数据
    isCreating.value = false
    selectedDatasource.value = result
    loadFormData(result)

    // 刷新列表
    await loadDatasources()
  } catch (error) {
    console.error('Failed to save datasource:', error)
    ElMessage.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function handleClickOutside() {
  contextMenuVisible.value = false
}

onMounted(() => {
  loadDatasources()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听 JDBC 名称格式（仅新建时）
watch(() => form.name, (newVal, oldVal) => {
  if (isCreating.value && form.type === 'jdbc' && newVal) {
    const regex = /^[a-zA-Z0-9_]*$/
    if (!regex.test(newVal)) {
      form.name = oldVal || ''
    }
  }
})
</script>

<style scoped lang="scss">
.datasource-management {
  height: 100%;
  padding: 16px;
}

.layout-container {
  display: flex;
  height: 100%;
  gap: 16px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;

  i {
    width: 16px;
    text-align: center;
    color: #909399;
  }
}

.tree-node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-count {
  font-size: 12px;
  color: #909399;
}

.main-content {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
  overflow: auto;
}

.breadcrumb-nav {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.type-selection-card {
  max-width: 800px;
}

.type-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.type-card {
  width: 180px;
  padding: 24px;
  text-align: center;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
  }

  .type-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 32px;
      color: #fff;
    }
  }

  h4 {
    margin: 0;
    font-size: 14px;
    color: #303133;
  }
}

.edit-card {
  max-width: 900px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.form-input-md {
  width: 300px;
}

.form-input-lg {
  width: 500px;
}

.code-input {
  font-family: monospace;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.url-template {
  display: flex;
  align-items: center;
  gap: 12px;
}

.url-template-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.form-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;

  :deep(.el-form-item__content) {
    justify-content: flex-end !important;
  }
}

.test-result-card {
  margin-top: 16px;
}

.test-result-content {
  max-height: 400px;
  overflow: auto;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  margin: 0;
}

.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  min-width: 120px;
}

.context-menu-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #f5f7fa;
  }

  &.danger {
    color: #f56c6c;
  }

  i {
    width: 14px;
    text-align: center;
  }
}
</style>
