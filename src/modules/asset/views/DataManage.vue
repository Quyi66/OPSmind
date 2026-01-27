<template>
  <div class="ops-page-layout">
    <!-- 导航标签页 -->
    <el-tabs v-model="activeTab" class="ops-tabs" @tab-change="handleTabChange">
      <el-tab-pane name="group">
        <template #label>
          <span>
            <i class="fa fa-code-branch" style="margin-right: 4px"></i>
            分组
          </span>
        </template>
      </el-tab-pane>
      <el-tab-pane name="tag">
        <template #label>
          <span>
            <i class="fa fa-tags" style="margin-right: 4px"></i>
            标签
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 分组列表 -->
    <template v-if="activeTab === 'group'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="资产类型">
            <el-select v-model="groupFilter.ciType" style="width: 150px">
              <el-option label="全部" value="oplus_all" />
              <el-option
                v-for="item in resourceTypes"
                :key="item.code"
                :label="item.title"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="groupFilter.keyword"
              placeholder="搜索"
              style="width: 180px"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleGroupSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleGroupReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button size="small" @click="handleDownloadTemplate">
          <i class="fa fa-download" style="margin-right: 4px"></i>
          资产信息导入模板下载
        </el-button>
        <el-button type="primary" size="small" @click="handleImport">
          <i class="fa fa-file-import" style="margin-right: 4px"></i>
          导入资产
        </el-button>
        <el-button size="small" @click="handleExport">
          <i class="fa fa-file-export" style="margin-right: 4px"></i>
          资产信息导出
        </el-button>
        <el-button size="small" @click="handleAddGroup">
          <i class="fa fa-folder-plus" style="margin-right: 4px"></i>
          添加分组
        </el-button>
        <!-- <el-button size="small" @click="handleAddTag">
          <i class="fa fa-tag" style="margin-right: 4px"></i>
          添加标签
        </el-button> -->
        <el-button size="small" @click="handleDownloadDeleteTemplate">
          <i class="fa fa-file-download" style="margin-right: 4px"></i>
          资产批量删除模版下载
        </el-button>
        <el-button type="danger" size="small" @click="handleDeleteImport">
          <i class="fa fa-trash-alt" style="margin-right: 4px"></i>
          资产删除导入
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="groupLoading"
          @click="loadGroupList"
          title="刷新"
        >
          <el-icon v-show="!groupLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table
          v-loading="groupLoading"
          :data="groupList"
          stripe
          max-height="calc(100vh - 360px)"
        >
          <el-table-column prop="path" label="分组路径" min-width="200" sortable>
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="handleViewGroup(row)">
                {{ row.path }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="ci_type" label="资产代码" width="150" sortable />
          <el-table-column prop="total" label="总计" width="100" align="left" sortable />
          <el-table-column label="操作" width="100" align="left" fixed="right">
            <template #default="{ row }">
              <template v-if="row.path !== '/'">
                <el-button text type="primary" size="small" @click="handleEditGroup(row)">
                  编辑
                </el-button>
                <el-button text type="danger" size="small" @click="handleDeleteGroup(row)">
                  删除
                </el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="groupPagination.page"
          v-model:page-size="groupPagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="groupPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleGroupPageSizeChange"
          @current-change="handleGroupPageChange"
        />
      </div>
    </template>

    <!-- 标签列表 -->
    <template v-if="activeTab === 'tag'">
      <!-- 筛选区 -->
      <div class="ops-filter-bar">
        <el-form :inline="true" size="small">
          <el-form-item label="资产类型">
            <el-select v-model="tagFilter.ciType" style="width: 150px">
              <el-option label="全部" value="oplus_all" />
              <el-option
                v-for="item in resourceTypes"
                :key="item.code"
                :label="item.title"
                :value="item.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关键词">
            <el-input
              v-model="tagFilter.keyword"
              placeholder="搜索"
              style="width: 180px"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleTagSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleTagReset">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 操作栏 -->
      <div class="ops-action-bar">
        <el-button type="primary" size="small" @click="handleAddTag">
          <i class="fa fa-plus" style="margin-right: 4px"></i>
          添加标签
        </el-button>
        <span style="flex: 1"></span>
        <el-button
          class="toolbar-icon-btn"
          circle
          size="small"
          :loading="tagLoading"
          @click="loadTagList"
          title="刷新"
        >
          <el-icon v-show="!tagLoading"><Refresh /></el-icon>
        </el-button>
      </div>

      <!-- 表格区域 -->
      <div class="ops-table-wrapper">
        <el-table v-loading="tagLoading" :data="tagList" stripe max-height="calc(100vh - 360px)">
          <el-table-column prop="name" label="标签名称" min-width="200" sortable>
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="handleViewTag(row)">
                {{ row.name }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="ci_type" label="资产代码" width="150" sortable />
          <el-table-column prop="total" label="总计" width="100" align="left" sortable />
          <el-table-column label="操作" width="100" align="left" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="handleEditTag(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="handleDeleteTag(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="tagPagination.page"
          v-model:page-size="tagPagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="tagPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleTagPageSizeChange"
          @current-change="handleTagPageChange"
        />
      </div>
    </template>

    <!-- 添加分组弹窗 -->
    <DataAddGroupDialog v-model="addGroupDialogVisible" @saved="loadGroupList" />

    <!-- 添加标签弹窗 -->
    <DataAddTagDialog v-model="addTagDialogVisible" @saved="loadTagList" />

    <!-- 编辑分组弹窗 -->
    <DataEditGroupDialog
      v-model="editGroupDialogVisible"
      :group-data="currentGroup"
      @saved="loadGroupList"
    />

    <!-- 编辑标签弹窗 -->
    <DataEditTagDialog v-model="editTagDialogVisible" :tag-data="currentTag" @saved="loadTagList" />

    <!-- 查看分组资产弹窗 -->
    <GroupAssetDialog v-model="viewGroupDialogVisible" :group-data="currentGroup" />

    <!-- 查看标签资产弹窗 -->
    <TagAssetDialog v-model="viewTagDialogVisible" :tag-data="currentTag" />

    <!-- 导入资产弹窗 -->
    <ImportAssetDialog v-model="importDialogVisible" @saved="handleImportSaved" />

    <!-- 导出资产弹窗 -->
    <ExportAssetDialog v-model="exportDialogVisible" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { dataManageApi } from '../api'
import { apiService } from '@/core/api'
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
      records = records.filter(
        item =>
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
      records = records.filter(
        item =>
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

// Tab 切换
const handleTabChange = tab => {
  if (tab === 'group') {
    loadGroupList()
  } else {
    loadTagList()
  }
}

// 分组搜索
const handleGroupSearch = () => {
  groupPagination.value.page = 1
  loadGroupList()
}

// 分组重置
const handleGroupReset = () => {
  groupFilter.value = { ciType: 'oplus_all', keyword: '' }
  groupPagination.value.page = 1
  loadGroupList()
}

// 分组分页变化
const handleGroupPageChange = () => {
  loadGroupList()
}

const handleGroupPageSizeChange = () => {
  groupPagination.value.page = 1
  loadGroupList()
}

// 标签搜索
const handleTagSearch = () => {
  tagPagination.value.page = 1
  loadTagList()
}

// 标签重置
const handleTagReset = () => {
  tagFilter.value = { ciType: 'oplus_all', keyword: '' }
  tagPagination.value.page = 1
  loadTagList()
}

// 标签分页变化
const handleTagPageChange = () => {
  loadTagList()
}

const handleTagPageSizeChange = () => {
  tagPagination.value.page = 1
  loadTagList()
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
  // 下载静态模板文件
  const link = document.createElement('a')
  link.href = '/templates/batch-delete-template.xlsx'
  link.download = '批量删除资产模板.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 资产删除导入
const handleDeleteImport = () => {
  // 创建文件选择器
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls'
  input.onchange = async e => {
    const file = e.target.files?.[0]
    if (!file) return

    // 创建 FormData
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await apiService.post(
        `/acm/api/acm/ci/batch-delete-by-excel?cacheBuster=${Date.now()}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      const result = response.data

      if (result) {
        // 显示删除结果
        const successCount = result.successCount || 0
        const failedCount = result.failedCount || 0
        const totalCount = result.totalCount || 0
        const successIps = result.successIps || []
        const failedIps = result.failedIps || []
        const errorMessages = result.errorMessages || []

        let message = `处理完成：共 ${totalCount} 条记录`
        if (successCount > 0) {
          message += `\n成功删除 ${successCount} 条`
        }
        if (failedCount > 0) {
          message += `\n删除失败 ${failedCount} 条`
        }

        if (failedCount > 0 && errorMessages.length > 0) {
          ElMessageBox.alert(
            `<div style="max-height: 300px; overflow-y: auto;">
              <p><strong>成功删除:</strong> ${successCount} 条</p>
              ${successIps.length > 0 ? `<p style="color: #67c23a;">${successIps.join(', ')}</p>` : ''}
              <p><strong>删除失败:</strong> ${failedCount} 条</p>
              ${failedIps.length > 0 ? `<p style="color: #f56c6c;">${failedIps.join(', ')}</p>` : ''}
              <p><strong>错误信息:</strong></p>
              <ul style="color: #f56c6c; margin-left: 20px;">
                ${errorMessages.map(msg => `<li>${msg}</li>`).join('')}
              </ul>
            </div>`,
            '删除结果',
            {
              dangerouslyUseHTMLString: true,
              confirmButtonText: '确定'
            }
          )
        } else {
          ElMessage.success(message)
        }

        // 刷新列表
        loadGroupList()
        loadTagList()
      }
    } catch (error) {
      console.error('删除导入失败:', error)
      ElMessage.error('删除导入失败: ' + error.message)
    }
  }
  input.click()
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
const handleViewGroup = row => {
  currentGroup.value = row
  viewGroupDialogVisible.value = true
}

// 编辑分组
const handleEditGroup = row => {
  currentGroup.value = row
  editGroupDialogVisible.value = true
}

// 删除分组
const handleDeleteGroup = row => {
  ElMessageBox.confirm('确定要删除该分组吗？删除分组会将分组内的资产移动到根分组。', '删除确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        await dataManageApi.deleteGroup(row.id)
        ElMessage.success('删除成功')
        loadGroupList()
      } catch (error) {
        console.error('删除分组失败:', error)
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
      }
    })
    .catch(() => {})
}

// 查看标签
const handleViewTag = row => {
  currentTag.value = row
  viewTagDialogVisible.value = true
}

// 编辑标签
const handleEditTag = row => {
  currentTag.value = row
  editTagDialogVisible.value = true
}

// 删除标签
const handleDeleteTag = row => {
  ElMessageBox.confirm('确定要删除该标签吗？', '删除确认', {
    type: 'warning'
  })
    .then(async () => {
      try {
        await dataManageApi.deleteTag(row.id)
        ElMessage.success('删除成功')
        loadTagList()
      } catch (error) {
        console.error('删除标签失败:', error)
        ElMessage.error('删除失败: ' + (error.response?.data?.message || error.message))
      }
    })
    .catch(() => {})
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
    margin-left: 12px;
  }
}

.pagination-bar {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0;
  margin-top: auto;
}
</style>
