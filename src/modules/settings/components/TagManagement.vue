<template>
  <div class="ops-page-layout">
    <!-- 筛选区 -->
    <div class="ops-filter-bar">
      <el-form :inline="true" size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="标签名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作栏 -->
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleCreate">
        <i class="fa fa-plus"></i> 新建标签
      </el-button>
      <span style="flex: 1;"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="loadTags" title="刷新">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <!-- 表格 -->
    <div class="ops-table-wrapper">
      <el-table
        v-loading="loading"
        :data="paginatedTags"
        stripe
        style="width: 100%"
        max-height="calc(100vh - 360px)"
      >
        <el-table-column prop="name" label="标签名称" min-width="200" />
        <el-table-column prop="count" label="应用数量" width="120" align="left">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.count || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="left">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button text type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              @click="handleDelete(row)"
              :loading="deletingId === row.id"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页器 -->
    <div class="ops-pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredTags.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建标签' : '编辑标签'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入标签名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`标签详情: ${currentTag?.name || ''}`"
      width="900px"
      destroy-on-close
    >
      <div v-loading="loadingDetail">
        <div class="detail-toolbar" v-if="tagApplets?.length">
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedAppletIds.length"
            @click="handleRemoveApplets"
          >
            <i class="fa fa-minus-circle"></i>
            移除选中应用
          </el-button>
        </div>

        <el-table
          v-if="tagApplets?.length"
          :data="tagApplets"
          stripe
          size="small"
          max-height="400"
          @selection-change="handleAppletSelectionChange"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="title" label="标题" min-width="150">
            <template #default="{ row }">
              {{ translateTagTitle(row.title) }}
            </template>
          </el-table-column>
          <el-table-column prop="name" label="Code" width="120" />
          <el-table-column prop="version" label="版本" width="80" />
          <el-table-column prop="status" label="状态" width="80" align="left">
            <template #default="{ row }">
              <el-tag :type="row.status === 'P' ? 'success' : 'danger'" size="small">
                {{ row.status === 'P' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="author" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="160" />
        </el-table>
        <el-empty v-else description="暂无关联应用" />
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import * as tagsApi from '@/modules/settings/api/tags'

const loading = ref(false)
const tags = ref([])
const searchKeyword = ref('')
const appliedSearchKeyword = ref('')
const deletingId = ref(null)

// 分页
const pagination = ref({
  page: 1,
  pageSize: 20
})

// 对话框相关
const dialogVisible = ref(false)
const dialogMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = ref({
  id: null,
  name: ''
})

const formRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' }
  ]
}

// 详情对话框
const detailDialogVisible = ref(false)
const loadingDetail = ref(false)
const currentTag = ref(null)
const tagApplets = ref([])
const selectedAppletIds = ref([])

// 过滤后的标签列表
const filteredTags = computed(() => {
  if (!appliedSearchKeyword.value) return tags.value
  const keyword = appliedSearchKeyword.value.toLowerCase()
  return tags.value.filter(tag =>
    tag.name?.toLowerCase().includes(keyword)
  )
})

// 分页后的数据
const paginatedTags = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredTags.value.slice(start, end)
})

// 搜索
function handleSearch() {
  appliedSearchKeyword.value = searchKeyword.value
  pagination.value.page = 1
}

// 重置
function handleReset() {
  searchKeyword.value = ''
  appliedSearchKeyword.value = ''
  pagination.value.page = 1
}

// 加载标签列表
async function loadTags() {
  loading.value = true
  try {
    const response = await tagsApi.getTags()
    tags.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load tags:', error)
    ElMessage.error('加载标签列表失败')
  } finally {
    loading.value = false
  }
}

// 新建
function handleCreate() {
  dialogMode.value = 'create'
  form.value = { id: null, name: '' }
  dialogVisible.value = true
}

// 编辑
function handleEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type || 'C',
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
  dialogVisible.value = true
}

// 查看
async function handleView(row) {
  currentTag.value = row
  detailDialogVisible.value = true
  loadingDetail.value = true
  selectedAppletIds.value = []

  try {
    const response = await tagsApi.getTagApplets(row.id)
    tagApplets.value = response?.data || response || []
  } catch (error) {
    console.error('Failed to load tag applets:', error)
    tagApplets.value = []
  } finally {
    loadingDetail.value = false
  }
}

// 应用选择变化
function handleAppletSelectionChange(selection) {
  selectedAppletIds.value = selection.map(item => item.id)
}

// 移除选中应用
async function handleRemoveApplets() {
  if (!selectedAppletIds.value.length) return

  try {
    await ElMessageBox.confirm(
      '确定要从该标签移除选中的应用吗？',
      '移除确认',
      {
        type: 'warning',
        confirmButtonText: '移除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  try {
    const param = {
      tagId: currentTag.value.id,
      appletId: selectedAppletIds.value.join(',')
    }
    await tagsApi.removeTagAppletMapper(param)
    ElMessage.success('移除成功')
    // 刷新应用列表
    const response = await tagsApi.getTagApplets(currentTag.value.id)
    tagApplets.value = response?.data || response || []
    selectedAppletIds.value = []
    // 同时刷新主列表
    loadTags()
  } catch (error) {
    console.error('Failed to remove applets:', error)
    ElMessage.error('移除失败')
  }
}

// 翻译标签标题
function translateTagTitle(title) {
  if (!title) return ''
  if (title.startsWith('#{') && title.endsWith('}')) {
    const key = title.slice(2, -1)
    const parts = key.split('.')
    return parts[parts.length - 1] || title
  }
  return title
}

// 保存
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      await tagsApi.createTag({
        name: form.value.name,
        tenantId: null,
        type: 'C',
        id: null
      })
      ElMessage.success('创建成功')
    } else {
      await tagsApi.updateTag({
        id: form.value.id,
        tenantId: form.value.tenantId,
        type: form.value.type || 'C',
        name: form.value.name,
        createdAt: form.value.createdAt,
        updatedAt: form.value.updatedAt
      })
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    loadTags()
  } catch (error) {
    console.error('Failed to save tag:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 删除
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签"${row.name}"吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  deletingId.value = row.id
  try {
    await tagsApi.deleteTag(row.id)
    ElMessage.success('删除成功')
    loadTags()
  } catch (error) {
    console.error('Failed to delete tag:', error)
    ElMessage.error('删除失败')
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped lang="scss">
.detail-toolbar {
  margin-bottom: 12px;
}
</style>
