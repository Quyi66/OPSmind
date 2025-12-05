<template>
  <div class="data-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <span class="page-title">数据管理</span>
      <div class="page-actions">
        <el-button @click="handleDownloadTemplate">
          <i class="fa fa-download" style="margin-right: 4px"></i>
          资产信息导入模板下载
        </el-button>
        <el-button type="primary" @click="handleImport">
          <i class="fa fa-file-import" style="margin-right: 4px"></i>
          导入资产
        </el-button>
        <el-button type="success" @click="handleExport">
          <i class="fa fa-cloud-download-alt" style="margin-right: 4px"></i>
          资产信息导出
        </el-button>
        <el-button type="primary" @click="handleAddGroup">
          添加分组
        </el-button>
        <el-button type="primary" @click="handleAddTag">
          添加标签
        </el-button>
        <el-button @click="handleDownloadDeleteTemplate">
          资产批量删除模版下载
        </el-button>
        <el-button type="danger" @click="handleDeleteImport">
          <i class="fa fa-trash-alt" style="margin-right: 4px"></i>
          资产删除导入
        </el-button>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="data-content">
      <!-- 导航标签页 -->
      <el-tabs v-model="activeTab" class="nav-tabs">
        <el-tab-pane name="group">
          <template #label>
            <span><i class="fa fa-code-branch" style="margin-right: 4px"></i>分组</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="tag">
          <template #label>
            <span><i class="fa fa-tags" style="margin-right: 4px"></i>标签</span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 分组列表 -->
      <div v-if="activeTab === 'group'" class="tab-content">
        <!-- 筛选 -->
        <div class="filter-bar">
          <div class="filter-left">
            <el-select
              v-model="groupFilter.ciType"
              placeholder="全部"
              style="width: 120px"
              @change="loadGroupList"
            >
              <el-option label="全部" value="oplus_all" />
              <el-option
                v-for="item in resourceTypes"
                :key="item.code"
                :label="item.title"
                :value="item.code"
              />
            </el-select>
          </div>
          <div class="filter-right">
            <el-input
              v-model="groupFilter.keyword"
              placeholder="搜索"
              style="width: 200px"
              clearable
              @keyup.enter="loadGroupList"
            >
              <template #suffix>
                <i class="fa fa-search" style="cursor: pointer" @click="loadGroupList"></i>
              </template>
            </el-input>
          </div>
        </div>

        <!-- 分组表格 -->
        <el-table
          v-loading="groupLoading"
          :data="groupList"
          stripe
        >
          <el-table-column prop="path" label="分组路径" min-width="200" sortable>
            <template #default="{ row }">
              <el-button link type="primary" @click="handleViewGroup(row)">
                {{ row.path }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="ci_type" label="资产代码" width="150" sortable />
          <el-table-column prop="total" label="总计" width="100" align="center" sortable />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <template v-if="row.path !== '/'">
                <el-tooltip content="编辑" placement="top">
                  <el-button link type="primary" @click="handleEditGroup(row)">
                    <i class="fa fa-pen"></i>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button link type="danger" @click="handleDeleteGroup(row)">
                    <i class="fa fa-trash-alt"></i>
                  </el-button>
                </el-tooltip>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="groupPagination.page"
            v-model:page-size="groupPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="groupPagination.total"
            layout="sizes, prev, pager, next, jumper, ->, total"
            @size-change="loadGroupList"
            @current-change="loadGroupList"
          />
        </div>
      </div>

      <!-- 标签列表 -->
      <div v-if="activeTab === 'tag'" class="tab-content">
        <!-- 筛选 -->
        <div class="filter-bar">
          <div class="filter-left">
            <el-select
              v-model="tagFilter.ciType"
              placeholder="全部"
              style="width: 120px"
              @change="loadTagList"
            >
              <el-option label="全部" value="oplus_all" />
              <el-option
                v-for="item in resourceTypes"
                :key="item.code"
                :label="item.title"
                :value="item.code"
              />
            </el-select>
          </div>
          <div class="filter-right">
            <el-input
              v-model="tagFilter.keyword"
              placeholder="搜索"
              style="width: 200px"
              clearable
              @keyup.enter="loadTagList"
            >
              <template #suffix>
                <i class="fa fa-search" style="cursor: pointer" @click="loadTagList"></i>
              </template>
            </el-input>
          </div>
        </div>

        <!-- 标签表格 -->
        <el-table
          v-loading="tagLoading"
          :data="tagList"
          stripe
        >
          <el-table-column prop="name" label="标签名称" min-width="200" sortable>
            <template #default="{ row }">
              <el-button link type="primary" @click="handleViewTag(row)">
                {{ row.name }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="ci_type" label="资产代码" width="150" sortable />
          <el-table-column prop="total" label="总计" width="100" align="center" sortable />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-tooltip content="编辑" placement="top">
                <el-button link type="primary" @click="handleEditTag(row)">
                  <i class="fa fa-pen"></i>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button link type="danger" @click="handleDeleteTag(row)">
                  <i class="fa fa-trash-alt"></i>
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="tagPagination.page"
            v-model:page-size="tagPagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="tagPagination.total"
            layout="sizes, prev, pager, next, jumper, ->, total"
            @size-change="loadTagList"
            @current-change="loadTagList"
          />
        </div>
      </div>
    </div>

    <!-- 添加分组弹窗 -->
    <DataAddGroupDialog
      v-model="addGroupDialogVisible"
      @saved="loadGroupList"
    />

    <!-- 添加标签弹窗 -->
    <DataAddTagDialog
      v-model="addTagDialogVisible"
      @saved="loadTagList"
    />

    <!-- 编辑分组弹窗 -->
    <DataEditGroupDialog
      v-model="editGroupDialogVisible"
      :group-data="currentGroup"
      @saved="loadGroupList"
    />

    <!-- 编辑标签弹窗 -->
    <DataEditTagDialog
      v-model="editTagDialogVisible"
      :tag-data="currentTag"
      @saved="loadTagList"
    />

    <!-- 查看分组资产弹窗 -->
    <GroupAssetDialog
      v-model="viewGroupDialogVisible"
      :group-data="currentGroup"
    />

    <!-- 查看标签资产弹窗 -->
    <TagAssetDialog
      v-model="viewTagDialogVisible"
      :tag-data="currentTag"
    />

    <!-- 导入资产弹窗 -->
    <ImportAssetDialog
      v-model="importDialogVisible"
      @saved="handleImportSaved"
    />

    <!-- 导出资产弹窗 -->
    <ExportAssetDialog
      v-model="exportDialogVisible"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { dataManageApi } from '../api'
import DataAddGroupDialog from '../components/DataAddGroupDialog.vue'
import DataAddTagDialog from '../components/DataAddTagDialog.vue'
import DataEditGroupDialog from '../components/DataEditGroupDialog.vue'
import DataEditTagDialog from '../components/DataEditTagDialog.vue'
import GroupAssetDialog from '../components/GroupAssetDialog.vue'
import TagAssetDialog from '../components/TagAssetDialog.vue'
import ImportAssetDialog from '../components/ImportAssetDialog.vue'
import ExportAssetDialog from '../components/ExportAssetDialog.vue'

// 当前标签页
const activeTab = ref('group')

// 资源类型列表
const resourceTypes = ref([])

// 租户ID（用于下载模板）
const currentTenantId = ref('')

// 分组相关
const groupFilter = ref({ ciType: 'oplus_all', keyword: '' })
const groupList = ref([])
const groupLoading = ref(false)
const groupPagination = ref({ page: 1, size: 10, total: 0 })

// 标签相关
const tagFilter = ref({ ciType: 'oplus_all', keyword: '' })
const tagList = ref([])
const tagLoading = ref(false)
const tagPagination = ref({ page: 1, size: 10, total: 0 })

// 弹窗状态
const addGroupDialogVisible = ref(false)
const addTagDialogVisible = ref(false)
const editGroupDialogVisible = ref(false)
const editTagDialogVisible = ref(false)
const viewGroupDialogVisible = ref(false)
const viewTagDialogVisible = ref(false)
const importDialogVisible = ref(false)
const exportDialogVisible = ref(false)

// 当前操作的数据
const currentGroup = ref(null)
const currentTag = ref(null)

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res?.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
  }
}

// 加载租户ID
const loadTenantId = async () => {
  try {
    currentTenantId.value = await dataManageApi.getCurrentTenantId()
  } catch (error) {
    console.error('加载租户ID失败:', error)
  }
}

// 加载分组列表
const loadGroupList = async () => {
  groupLoading.value = true
  try {
    const res = await dataManageApi.getAllGroups(groupFilter.value.ciType)
    let records = res?.records || []
    // 关键字筛选
    if (groupFilter.value.keyword) {
      const keyword = groupFilter.value.keyword.toLowerCase()
      records = records.filter(item =>
        item.path?.toLowerCase().includes(keyword) ||
        item.ci_type?.toLowerCase().includes(keyword)
      )
    }
    groupPagination.value.total = records.length
    // 前端分页
    const start = (groupPagination.value.page - 1) * groupPagination.value.size
    const end = start + groupPagination.value.size
    groupList.value = records.slice(start, end)
  } catch (error) {
    console.error('加载分组列表失败:', error)
    ElMessage.error('加载分组列表失败')
  } finally {
    groupLoading.value = false
  }
}

// 加载标签列表
const loadTagList = async () => {
  tagLoading.value = true
  try {
    const res = await dataManageApi.getAllTags(tagFilter.value.ciType)
    let records = res?.records || []
    // 关键字筛选
    if (tagFilter.value.keyword) {
      const keyword = tagFilter.value.keyword.toLowerCase()
      records = records.filter(item =>
        item.name?.toLowerCase().includes(keyword) ||
        item.ci_type?.toLowerCase().includes(keyword)
      )
    }
    tagPagination.value.total = records.length
    // 前端分页
    const start = (tagPagination.value.page - 1) * tagPagination.value.size
    const end = start + tagPagination.value.size
    tagList.value = records.slice(start, end)
  } catch (error) {
    console.error('加载标签列表失败:', error)
    ElMessage.error('加载标签列表失败')
  } finally {
    tagLoading.value = false
  }
}

// 下载模板
const handleDownloadTemplate = () => {
  if (!currentTenantId.value) {
    ElMessage.warning('正在获取租户信息，请稍后重试')
    return
  }
  const url = `${window.location.origin}/oplus-portal/acm/api/acm/cit/template2/${currentTenantId.value}`
  window.open(url, '_blank')
}

// 下载删除模板
const handleDownloadDeleteTemplate = () => {
  // TODO: 实现下载删除模板逻辑
  ElMessage.info('功能待实现')
}

// 资产删除导入
const handleDeleteImport = () => {
  // TODO: 实现资产删除导入逻辑
  ElMessage.info('功能待实现')
}

// 导入资产
const handleImport = () => {
  importDialogVisible.value = true
}

// 导入成功后
const handleImportSaved = () => {
  loadGroupList()
  loadTagList()
}

// 导出资产
const handleExport = () => {
  exportDialogVisible.value = true
}

// 添加分组
const handleAddGroup = () => {
  addGroupDialogVisible.value = true
}

// 添加标签
const handleAddTag = () => {
  addTagDialogVisible.value = true
}

// 查看分组
const handleViewGroup = (row) => {
  currentGroup.value = row
  viewGroupDialogVisible.value = true
}

// 编辑分组
const handleEditGroup = (row) => {
  currentGroup.value = row
  editGroupDialogVisible.value = true
}

// 删除分组
const handleDeleteGroup = (row) => {
  ElMessageBox.confirm('确定要删除该分组吗？删除分组会将分组内的资产移动到根分组。', '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await dataManageApi.deleteGroup(row.id)
      ElMessage.success('删除成功')
      loadGroupList()
    } catch (error) {
      console.error('删除分组失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

// 查看标签
const handleViewTag = (row) => {
  currentTag.value = row
  viewTagDialogVisible.value = true
}

// 编辑标签
const handleEditTag = (row) => {
  currentTag.value = row
  editTagDialogVisible.value = true
}

// 删除标签
const handleDeleteTag = (row) => {
  ElMessageBox.confirm('确定要删除该标签吗？', '删除确认', {
    type: 'warning'
  }).then(async () => {
    try {
      await dataManageApi.deleteTag(row.id)
      ElMessage.success('删除成功')
      loadTagList()
    } catch (error) {
      console.error('删除标签失败:', error)
      ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
    }
  }).catch(() => {})
}

// 初始化
onMounted(() => {
  loadResourceTypes()
  loadTenantId()
  loadGroupList()
  loadTagList()
})
</script>

<style scoped lang="scss">
.data-manage {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .page-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.data-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: hidden;
}

.nav-tabs {
  margin-bottom: 16px;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 12px;

  .filter-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.pagination-bar {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0;
  margin-top: auto;
}
</style>
