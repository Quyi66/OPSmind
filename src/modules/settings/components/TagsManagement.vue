<template>
  <div class="tags-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar__left">
        <el-button type="primary" size="small" @click="handleCreate">
          <i class="fa fa-plus"></i> 新建标签
        </el-button>
        <el-button size="small" @click="loadTags" :loading="loading">
          <i class="fa fa-refresh"></i> 刷新
        </el-button>
      </div>
      <div class="toolbar__right">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索标签名称"
          clearable
          style="width: 200px"
          @input="handleSearch"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="filteredTags"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column prop="name" label="标签名称" min-width="200" />
      <el-table-column prop="count" label="应用数量" width="120" align="left">
        <template #default="{ row }">
          <el-tag type="info" size="small">{{ row.count || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right" align="left">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleView(row)">
            查看
          </el-button>
          <el-button link type="primary" size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            link
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
      title="标签详情"
      width="700px"
      destroy-on-close
    >
      <div v-loading="loadingDetail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="标签名称">{{ currentTag?.name }}</el-descriptions-item>
          <el-descriptions-item label="关联应用数量">{{ tagApplets?.length || 0 }}</el-descriptions-item>
        </el-descriptions>

        <div class="mt-4" v-if="tagApplets?.length">
          <h4>关联应用列表</h4>
          <el-table :data="tagApplets" stripe size="small" max-height="300">
            <el-table-column prop="name" label="Code" width="120" />
            <el-table-column prop="title" label="标题" min-width="150" />
            <el-table-column prop="status" label="状态" width="80" align="left">
              <template #default="{ row }">
                <el-tag :type="row.status === 'P' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'P' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-empty v-else description="暂无关联应用" />
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as tagsApi from '@/modules/settings/api/tags'

const loading = ref(false)
const tags = ref([])
const searchKeyword = ref('')
const deletingId = ref(null)

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

// 过滤后的标签列表
const filteredTags = computed(() => {
  if (!searchKeyword.value) return tags.value
  const keyword = searchKeyword.value.toLowerCase()
  return tags.value.filter(tag =>
    tag.name?.toLowerCase().includes(keyword)
  )
})

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

// 搜索
function handleSearch() {
  // 直接通过 computed 过滤
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
  form.value = { id: row.id, name: row.name }
  dialogVisible.value = true
}

// 查看
async function handleView(row) {
  currentTag.value = row
  detailDialogVisible.value = true
  loadingDetail.value = true

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
      await tagsApi.createTag({ name: form.value.name })
      ElMessage.success('创建成功')
    } else {
      await tagsApi.updateTag(form.value)
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
.tags-management {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  &__left {
    display: flex;
    gap: 8px;
  }

  &__right {
    display: flex;
    gap: 8px;
  }
}

.mt-4 {
  margin-top: 16px;
}

h4 {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
</style>
