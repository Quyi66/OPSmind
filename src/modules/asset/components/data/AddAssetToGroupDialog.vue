<template>
  <el-dialog
    v-model="visible"
    title="添加设备到分组"
    width="900px"
    :close-on-click-modal="false"
    append-to-body
    @closed="handleClosed"
  >
    <div class="add-asset-content">
      <!-- 搜索过滤 -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索IP或主机名"
          style="width: 250px"
          clearable
          @keyup.enter="loadAssetList"
        >
          <template #prefix>
            <i class="fa fa-search"></i>
          </template>
        </el-input>
        <el-button type="primary" @click="loadAssetList">搜索</el-button>
      </div>

      <!-- 资产表格 -->
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="assetList"

        max-height="350"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column label="资产状态" width="90" align="left">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small" round>
              {{ row.status === 1 ? '在线' : '下线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="IP" label="纳管IP" width="140" />
        <el-table-column prop="hostname" label="主机名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="os_distro" label="操作系统" width="100" />
        <el-table-column prop="os_version" label="系统版本" width="90" />
        <el-table-column prop="path" label="当前分组" min-width="120" show-overflow-tooltip />
      </el-table>

      <!-- 分页 -->
      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="loadAssetList"
          @current-change="loadAssetList"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="saving"
        :disabled="selectedRows.length === 0"
        @click="handleSave"
      >
        添加 ({{ selectedRows.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { dtsApi } from '../../api'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  groupData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const tableRef = ref()
const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const assetList = ref([])
const selectedRows = ref([])
const pagination = ref({ page: 1, size: 10, total: 0 })

// 加载可添加的资产列表（不在当前分组的资产）
const loadAssetList = async () => {
  if (!props.groupData) return
  loading.value = true
  try {
    // 获取该资产类型下的所有资产
    const res = await dtsApi.queryData('ACM_CI_BY_CIT', {
      assetType: props.groupData.ci_type,
      permission: 'r',
      status: 'all',
      CONN_LATEST_STATUS: '',
      system_name: ' ',
      os_version: ' ',
      hostKeys: '/'  // 获取所有资产
    }, {
      size: pagination.value.size,
      page: pagination.value.page,
      filter: keyword.value || ''
    })
    assetList.value = res?.records || []
    pagination.value.total = res?.total || 0
  } catch (error) {
    console.error('加载设备清单失败:', error)
    ElMessage.error('加载设备清单失败')
  } finally {
    loading.value = false
  }
}

// 选择变化
const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

// 保存
const handleSave = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要添加的资产')
    return
  }

  saving.value = true
  try {
    const ciIds = selectedRows.value.map(row => row.id).join(',')
    // 使用添加分组的 job，operate 为 select，id 为分组id
    await apiService.post(`/jao/api/jao/jobs/a17VXM/run?cacheBuster=${Date.now()}`, {
      params: {
        operate: 'new',
        id: props.groupData.id,
        ids: ciIds,
        assetType: props.groupData.ci_type
      }
    })
    ElMessage.success('添加成功')
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('添加失败:', error)
    ElMessage.error('添加失败: ' + (error.response?.data?.message || error.message))
  } finally {
    saving.value = false
  }
}

// 弹窗关闭时重置
const handleClosed = () => {
  keyword.value = ''
  assetList.value = []
  selectedRows.value = []
  pagination.value = { page: 1, size: 10, total: 0 }
}

// 监听弹窗打开
watch(visible, (val) => {
  if (val) {
    loadAssetList()
  }
})
</script>

<style scoped lang="scss">
.add-asset-content {
  .filter-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .pagination-bar {
    display: flex;
    justify-content: flex-start;
    padding: 16px 0 0;
  }
}
</style>
