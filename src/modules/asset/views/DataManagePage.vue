<template>
  <div class="ops-page-layout">
    <!-- 导航标签页 -->
    <div class="type-tabs-wrapper">
      <el-tabs v-model="activeTab" class="modern-tabs" @tab-change="handleTabChange">
        <el-tab-pane name="group">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-folder" style="margin-right: 4px"></i>
              分组
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="tag">
          <template #label>
            <span class="tab-label">
              <i class="fa fa-tags" style="margin-right: 4px"></i>
              标签
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 主体内容 -->
    <div class="main-content-layout">
      <!-- 分组列表 -->
      <template v-if="activeTab === 'group'">
        <div class="content-view-area">
          <!-- 筛选区 -->
          <div class="ops-filter-bar">
            <el-form :inline="true" size="small">
              <el-form-item label="类型">
                <el-select v-model="groupFilter.ciType" style="width: 140px">
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
                  placeholder="搜索分组路径..."
                  style="width: 200px"
                  clearable
                  @keyup.enter="handleGroupSearch"
                />
              </el-form-item>
              <el-form-item class="filter-actions">
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
            <el-button size="small" @click="handleAddGroup" type="primary">
              <i class="fa fa-folder-plus" style="margin-right: 4px"></i>
              新建分组
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
          <div class="ops-table-wrapper card-table">
            <el-table
              v-loading="groupLoading"
              :data="groupList"
              height="100%"
              row-class-name="modern-table-row"
            >
              <el-table-column prop="path" label="分组路径" min-width="220" sortable>
                <template #default="{ row }">
                  <el-link
                    type="primary"
                    :underline="false"
                    class="path-link"
                    @click="handleViewGroup(row)"
                  >
                    <i class="fa fa-folder-open folder-icon-decorator"></i>
                    {{ row.path }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="ci_type" label="适用资产类型" width="160" sortable>
                <template #default="{ row }">
                  <span class="cit-display">{{ row.ci_type || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="total" label="已绑主机数" width="120" align="left" sortable>
                <template #default="{ row }">
                  <el-tag size="small" type="info" round class="count-tag-badge">
                    {{ row.total }} 台
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="left" fixed="right">
                <template #default="{ row }">
                  <div class="action-cell" v-if="row.path !== '/'">
                    <el-button text type="primary" size="small" @click="handleEditGroup(row)">
                      编辑
                    </el-button>
                    <el-button text type="danger" size="small" @click="handleDeleteGroup(row)">
                      删除
                    </el-button>
                  </div>
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
        </div>
      </template>

      <!-- 标签列表 -->
      <template v-if="activeTab === 'tag'">
        <div class="content-view-area">
          <!-- 筛选区 -->
          <div class="ops-filter-bar">
            <el-form :inline="true" size="small">
              <el-form-item label="类型">
                <el-select v-model="tagFilter.ciType" style="width: 140px">
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
                  placeholder="搜索标签名称..."
                  style="width: 200px"
                  clearable
                  @keyup.enter="handleTagSearch"
                />
              </el-form-item>
              <el-form-item class="filter-actions">
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
              新建标签
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
          <div class="ops-table-wrapper card-table">
            <el-table
              v-loading="tagLoading"
              :data="tagList"
              height="100%"
              row-class-name="modern-table-row"
            >
              <el-table-column prop="name" label="标签名称" min-width="220" sortable>
                <template #default="{ row }">
                  <el-link
                    type="primary"
                    :underline="false"
                    class="path-link"
                    @click="handleViewTag(row)"
                  >
                    <el-tag size="small" effect="plain" type="primary" class="visual-badge-tag">
                      <i class="fa fa-tag" style="margin-right: 4px; font-size: 11px"></i>
                      {{ row.name }}
                    </el-tag>
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="ci_type" label="适用资产类型" width="160" sortable>
                <template #default="{ row }">
                  <span class="cit-display">{{ row.ci_type || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="total" label="已绑主机数" width="120" align="left" sortable>
                <template #default="{ row }">
                  <el-tag size="small" type="info" round class="count-tag-badge">
                    {{ row.total }} 台
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="left" fixed="right">
                <template #default="{ row }">
                  <div class="action-cell">
                    <el-button text type="primary" size="small" @click="handleEditTag(row)">
                      编辑
                    </el-button>
                    <el-button text type="danger" size="small" @click="handleDeleteTag(row)">
                      删除
                    </el-button>
                  </div>
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
        </div>
      </template>
    </div>

    <!-- 添加/编辑弹窗组件 -->
    <DataAddGroupDialog v-model="addGroupDialogVisible" @saved="loadGroupList" />
    <DataAddTagDialog v-model="addTagDialogVisible" @saved="loadTagList" />

    <DataEditGroupDialog
      v-model="editGroupDialogVisible"
      :group-data="currentGroup"
      @saved="loadGroupList"
    />

    <DataEditTagDialog v-model="editTagDialogVisible" :tag-data="currentTag" @saved="loadTagList" />

    <GroupAssetDialog v-model="viewGroupDialogVisible" :group-data="currentGroup" />
    <TagAssetDialog v-model="viewTagDialogVisible" :tag-data="currentTag" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshRight } from '@element-plus/icons-vue'
import { dataManageApi } from '../api'
import DataAddGroupDialog from '../components/data/DataAddGroupDialog.vue'
import DataAddTagDialog from '../components/data/DataAddTagDialog.vue'
import DataEditGroupDialog from '../components/data/DataEditGroupDialog.vue'
import DataEditTagDialog from '../components/data/DataEditTagDialog.vue'
import GroupAssetDialog from '../components/data/GroupAssetDialog.vue'
import TagAssetDialog from '../components/data/TagAssetDialog.vue'

const route = useRoute()
const router = useRouter()

// 当前标签页
const activeTab = ref('group')

// 资源类型列表
const resourceTypes = ref([])

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

// 当前操作的数据
const currentGroup = ref(null)
const currentTag = ref(null)

const normalizeTab = tab => (tab === 'tag' ? 'tag' : 'group')

const buildRouteQuery = tab => {
  const currentTab = normalizeTab(tab || activeTab.value)
  const currentFilter = currentTab === 'group' ? groupFilter.value : tagFilter.value
  const query = { tab: currentTab }

  if (currentFilter.ciType && currentFilter.ciType !== 'oplus_all') {
    query.ciType = currentFilter.ciType
  }

  if (currentFilter.keyword?.trim()) {
    query.keyword = currentFilter.keyword.trim()
  }

  return query
}

const isSameQuery = query => JSON.stringify(route.query || {}) === JSON.stringify(query)

const syncRouteQuery = tab => {
  const query = buildRouteQuery(tab)
  if (isSameQuery(query)) {
    applyRouteQuery(query)
    return
  }

  router.replace({
    path: '/acm/data',
    query
  })
}

const applyRouteQuery = query => {
  const currentTab = normalizeTab(query.tab)
  const ciType = typeof query.ciType === 'string' && query.ciType ? query.ciType : 'oplus_all'
  const keyword = typeof query.keyword === 'string' ? query.keyword : ''

  activeTab.value = currentTab

  if (currentTab === 'group') {
    groupFilter.value = { ciType, keyword }
    groupPagination.value.page = 1
    loadGroupList()
    return
  }

  tagFilter.value = { ciType, keyword }
  tagPagination.value.page = 1
  loadTagList()
}

// 加载资源类型
const loadResourceTypes = async () => {
  try {
    const res = await dataManageApi.getResourceTypes()
    resourceTypes.value = res?.records || []
  } catch (error) {
    console.error('加载资源类型失败:', error)
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
  const currentTab = normalizeTab(tab)
  activeTab.value = currentTab
  if (currentTab === 'group') {
    groupPagination.value.page = 1
  } else {
    tagPagination.value.page = 1
  }
  syncRouteQuery(currentTab)
}

// 分组搜索
const handleGroupSearch = () => {
  groupPagination.value.page = 1
  syncRouteQuery('group')
}

// 分组重置
const handleGroupReset = () => {
  groupFilter.value = { ciType: 'oplus_all', keyword: '' }
  groupPagination.value.page = 1
  syncRouteQuery('group')
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
  syncRouteQuery('tag')
}

// 标签重置
const handleTagReset = () => {
  tagFilter.value = { ciType: 'oplus_all', keyword: '' }
  tagPagination.value.page = 1
  syncRouteQuery('tag')
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
  const url = `${window.location.origin}/sjxy-portal/acm/api/acm/cit/template2/${currentTenantId.value}`
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
        ElMessage.error(`删除失败: ${error.response?.data?.message || error.message}`)
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
        ElMessage.error(`删除失败: ${error.response?.data?.message || error.message}`)
      }
    })
    .catch(() => {})
}

// 初始化
onMounted(() => {
  loadResourceTypes()
})

watch(
  () => route.query,
  query => {
    applyRouteQuery(query)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.main-content-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.path-link {
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.folder-icon-decorator {
  color: #e6a23c;
  font-size: 13px;
}

.cit-display {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.count-tag-badge {
  font-weight: 500;
}

.visual-badge-tag {
  border-radius: 4px;
  font-weight: 600;
  height: 22px;
  line-height: 22px;
}
</style>
