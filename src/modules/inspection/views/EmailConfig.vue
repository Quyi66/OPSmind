<template>
  <div class="ops-page-layout">
    <!-- 操作区 -->
    <div class="ops-action-bar">
      <div>
        <el-switch v-model="emailEnabled" :loading="switchLoading" active-text="启用邮件通知" @change="handleSwitchChange" />
      </div>
      <div class="search-box">
        <el-input v-model="searchKeyword" placeholder="搜索模板名称" clearable size="small" style="width: 200px"
          maxlength="50" @keyup.enter="handleSearch" @clear="handleSearch">
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="pagedTemplates" max-height="calc(100vh - 180px)">
        <el-table-column prop="template_name" label="模板名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="executed_at" label="最后执行时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.executed_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="left" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="showRecipientDialog(row)">
              收件人列表
            </el-button>
            <el-button text type="primary" @click="showCustomContentDialog(row)">
              自定义内容
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 25, 50, 100]"
        :total="templateList.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 收件人列表弹窗 -->
    <el-dialog :model-value="recipientDialogVisible" title="收件人列表" width="800px" destroy-on-close
      @close="recipientDialogVisible = false">
      <div v-loading="recipientLoading" class="recipient-dialog">
        <div class="dialog-header">
          <div class="template-info">
            <span class="label">模板名称：</span>
            <span class="value">{{ currentTemplate?.template_name }}</span>
          </div>
          <el-button type="primary" size="small" @click="showAddRecipientDialog">
            <i class="fa fa-plus"></i> 新增
          </el-button>
        </div>

        <!-- 收件人表格 -->
        <el-table :data="recipientTableData"  max-height="400">
          <el-table-column prop="name" label="姓名" min-width="120" />
          <el-table-column prop="email" label="邮箱" min-width="180" />
          <el-table-column prop="status" label="状态" width="100" align="left">
            <template #default="{ row }">
              <el-tag v-if="row.status === '0'" type="success" size="small">启用</el-tag>
              <el-tag v-else type="danger" size="small">禁用</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remarks" label="备注" min-width="150" />
          <el-table-column label="操作" width="100" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="editRecipient(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="deleteRecipient(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="recipientDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑收件人弹窗 -->
    <el-dialog :model-value="recipientFormVisible" :title="recipientFormData.id ? '编辑收件人' : '新增收件人'" width="500px"
      destroy-on-close @close="recipientFormVisible = false">
      <el-form ref="recipientFormRef" :model="recipientFormData" :rules="recipientFormRules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="recipientFormData.name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="recipientFormData.email" placeholder="请输入邮箱地址" maxlength="100" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="recipientFormData.status">
            <el-radio value="0">启用</el-radio>
            <el-radio value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="recipientFormData.remarks" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="recipientFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="recipientSaving" @click="saveRecipient">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 自定义内容弹窗 -->
    <el-dialog :model-value="customContentDialogVisible" title="自定义内容" width="600px" destroy-on-close
      @close="customContentDialogVisible = false">
      <div v-loading="customContentLoading" class="custom-content-dialog">
        <div class="template-info">
          <span class="label">模板名称：</span>
          <span class="value">{{ currentTemplate?.template_name }}</span>
        </div>

        <el-form label-width="100px">
          <el-form-item label="自定义标题">
            <el-input v-model="customContentData.title" placeholder="请输入自定义邮件标题" clearable />
          </el-form-item>
          <el-form-item label="自定义内容">
            <el-input v-model="customContentData.content" type="textarea" :rows="4" placeholder="请输入自定义邮件内容" />
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="customContentData.state">
              <el-radio value="0">启用</el-radio>
              <el-radio value="1">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="customContentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="customContentSaving" @click="saveCustomContent">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { emailConfigApi } from '../api'
import { formatDateTime } from '../utils/helpers'
import { authService } from '@/core/auth'

// 状态
const loading = ref(false)
const switchLoading = ref(false)
const emailEnabled = ref(false)
const emailConfig = ref({})
const templateList = ref([])
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 收件人列表弹窗
const recipientDialogVisible = ref(false)
const recipientLoading = ref(false)
const recipientTableData = ref([])
const allRecipientData = ref([])
const currentTemplate = ref(null)

// 收件人表单弹窗
const recipientFormVisible = ref(false)
const recipientFormRef = ref(null)
const recipientSaving = ref(false)
const recipientFormData = ref({
  id: null,
  name: '',
  email: '',
  status: '0',
  remarks: ''
})

const recipientFormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

// 自定义内容弹窗
const customContentDialogVisible = ref(false)
const customContentLoading = ref(false)
const customContentSaving = ref(false)
const allCustomContentData = ref([])
const customContentData = ref({
  id: null,
  title: '',
  content: '',
  state: '0'
})

const pagedTemplates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return templateList.value.slice(start, start + pageSize.value)
})

/**
 * 加载邮件开关状态
 */
async function loadEmailSwitch() {
  try {
    const response = await emailConfigApi.getEmailSwitch()
    const data = response?.data || response || {}
    emailConfig.value = data
    emailEnabled.value = data.isTheEmailEnabled === 'yes'
  } catch (error) {
    console.error('加载邮件配置失败:', error)
    ElMessage.error('加载邮件配置失败')
  }
}

/**
 * 加载模板列表
 */
async function loadTemplates() {
  loading.value = true
  try {
    const tenantId = getTenantId()
    // 构建 filter 参数
    const filter = searchKeyword.value ? `template_name:*${searchKeyword.value}*` : ''
    const response = await emailConfigApi.getTemplates(tenantId, filter)
    const data = response?.data || response || {}
    templateList.value = data.records || []
  } catch (error) {
    console.error('加载模板列表失败:', error)
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索处理
 */
function handleSearch() {
  currentPage.value = 1
  loadTemplates()
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

/**
 * 获取租户ID
 */
function getTenantId() {
  const user = authService.getCurrentUser()
  if (user?.tenantId) {
    return user.tenantId
  }
  return authService.getTenantId()
}

/**
 * 处理邮件开关变更
 */
async function handleSwitchChange(value) {
  switchLoading.value = true
  try {
    const data = {
      ...emailConfig.value,
      isTheEmailEnabled: value ? 'yes' : 'no'
    }
    await emailConfigApi.saveEmailSwitch(data)
    emailConfig.value = data
    ElMessage.success(value ? '已启用邮件通知' : '已禁用邮件通知')
  } catch (error) {
    emailEnabled.value = !value
    console.error('保存邮件配置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    switchLoading.value = false
  }
}

/**
 * 加载收件人列表
 */
async function loadRecipientList() {
  recipientLoading.value = true
  try {
    const response = await emailConfigApi.getRecipientList()
    const data = response?.data || response || []
    allRecipientData.value = data

    // 过滤当前模板的收件人
    filterRecipientsByTemplate()
  } catch (error) {
    console.error('加载收件人列表失败:', error)
    ElMessage.error('加载收件人列表失败')
  } finally {
    recipientLoading.value = false
  }
}

/**
 * 按模板过滤收件人
 */
function filterRecipientsByTemplate() {
  const templateId = currentTemplate.value?.template_id

  if (!templateId) {
    recipientTableData.value = []
    return
  }

  recipientTableData.value = allRecipientData.value
    .filter(item => {
      try {
        const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
        return dataJson?.template_id === templateId
      } catch (e) {
        console.error('解析 dataJson 失败:', e)
        return false
      }
    })
    .map(item => {
      const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
      return {
        _dataId: item.id,
        _createTime: item.createTime,
        _updateTime: item.updateTime,
        ...dataJson
      }
    })
}

/**
 * 显示收件人列表弹窗
 */
async function showRecipientDialog(template) {
  currentTemplate.value = template
  recipientDialogVisible.value = true
  await loadRecipientList()
}

/**
 * 显示新增收件人弹窗
 */
function showAddRecipientDialog() {
  recipientFormData.value = {
    id: null,
    name: '',
    email: '',
    status: '0',
    remarks: ''
  }
  recipientFormVisible.value = true
}

/**
 * 编辑收件人
 */
function editRecipient(row) {
  recipientFormData.value = {
    id: row._dataId,
    name: row.name,
    email: row.email,
    status: row.status || '0',
    remarks: row.remarks || ''
  }
  recipientFormVisible.value = true
}

/**
 * 保存收件人
 */
async function saveRecipient() {
  try {
    await recipientFormRef.value.validate()
  } catch {
    return
  }

  recipientSaving.value = true
  try {
    // API 层已经封装了完整的请求格式
    await emailConfigApi.saveRecipient({
      id: recipientFormData.value.id,
      name: recipientFormData.value.name,
      email: recipientFormData.value.email,
      status: recipientFormData.value.status,
      remarks: recipientFormData.value.remarks,
      templateId: currentTemplate.value.template_id
    })
    ElMessage.success('保存成功')
    recipientFormVisible.value = false
    await loadRecipientList()
  } catch (error) {
    console.error('保存收件人失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    recipientSaving.value = false
  }
}

/**
 * 删除收件人
 */
async function deleteRecipient(row) {
  try {
    await ElMessageBox.confirm('确定要删除该收件人吗？', '确认删除', {
      type: 'warning'
    })
    await emailConfigApi.deleteRecipient(row._dataId)
    ElMessage.success('删除成功')
    await loadRecipientList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除收件人失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

/**
 * 加载自定义内容
 */
async function loadCustomContent() {
  customContentLoading.value = true
  try {
    const response = await emailConfigApi.getEmailCustomList()
    const data = response?.data || response || []
    allCustomContentData.value = data

    // 查找当前模板的自定义内容
    const templateId = currentTemplate.value?.template_id
    const customItem = data.find(item => {
      const dataJson = typeof item.dataJson === 'string' ? JSON.parse(item.dataJson) : item.dataJson
      return dataJson.template_id === templateId
    })

    if (customItem) {
      const dataJson = typeof customItem.dataJson === 'string'
        ? JSON.parse(customItem.dataJson)
        : customItem.dataJson
      customContentData.value = {
        id: customItem.id,
        title: dataJson.title || '',
        content: dataJson.content || '',
        state: dataJson.state || '0'
      }
    } else {
      customContentData.value = {
        id: null,
        title: '',
        content: '',
        state: '0'
      }
    }
  } catch (error) {
    console.error('加载自定义内容失败:', error)
    ElMessage.error('加载自定义内容失败')
  } finally {
    customContentLoading.value = false
  }
}

/**
 * 显示自定义内容弹窗
 */
async function showCustomContentDialog(template) {
  currentTemplate.value = template
  customContentDialogVisible.value = true
  await loadCustomContent()
}

/**
 * 保存自定义内容
 */
async function saveCustomContent() {
  customContentSaving.value = true
  try {
    await emailConfigApi.saveEmailCustom({
      id: customContentData.value.id,
      title: customContentData.value.title,
      content: customContentData.value.content,
      state: customContentData.value.state,
      templateId: currentTemplate.value.template_id
    })
    ElMessage.success('保存成功')
    customContentDialogVisible.value = false
  } catch (error) {
    console.error('保存自定义内容失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    customContentSaving.value = false
  }
}

onMounted(() => {
  loadEmailSwitch()
  loadTemplates()
})

watch(templateList, () => {
  const maxPage = Math.max(1, Math.ceil(templateList.value.length / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})
</script>

<style scoped lang="scss">
.ops-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-name {
  font-weight: 500;
  color: #303133;
}

.recipient-dialog {
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
}

.recipient-dialog,
.custom-content-dialog {
  .template-info {
    padding: 12px 16px;
    background: #f5f7fa;
    border-radius: 4px;

    .label {
      color: #909399;
      margin-right: 8px;
    }

    .value {
      font-weight: 500;
      color: #303133;
    }
  }
}

.custom-content-dialog {
  .template-info {
    margin-bottom: 20px;
  }
}
</style>
