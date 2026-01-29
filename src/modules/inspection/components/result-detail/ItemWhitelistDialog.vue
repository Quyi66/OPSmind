<template>
  <el-dialog
    :model-value="visible"
    title="白名单列表"
    width="900px"
    destroy-on-close
    @close="$emit('close')"
  >
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索主机、检查项、模板名称..."
        clearable
        style="width: 300px"
        @input="handleSearch"
      >
        <template #prefix>
          <i class="fa fa-search"></i>
        </template>
      </el-input>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="paginatedData"
     
      max-height="350"
    >
      <el-table-column prop="hostKey" label="主机" width="140" />
      <el-table-column prop="checkName" label="检查项" min-width="180" show-overflow-tooltip />
      <el-table-column prop="templateName" label="模板名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="scriptPath" label="脚本路径" min-width="250" show-overflow-tooltip />
      <el-table-column label="操作" width="80" align="left" fixed="right">
        <template #default="{ row }">
          <el-button text type="danger" size="small" @click="$emit('delete', row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="filteredData.length"
        layout="total, sizes, prev, pager, next"
        background
        small
        @size-change="handlePageSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  data: {
    type: Array,
    default: () => []
  },
  loading: Boolean
})

defineEmits(['close', 'delete'])

// 搜索和分页状态
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

// 过滤后的数据
const filteredData = computed(() => {
  if (!searchText.value) {
    return props.data
  }
  const keyword = searchText.value.toLowerCase()
  return props.data.filter(item =>
    item.hostKey?.toLowerCase().includes(keyword) ||
    item.checkName?.toLowerCase().includes(keyword) ||
    item.templateName?.toLowerCase().includes(keyword) ||
    item.scriptPath?.toLowerCase().includes(keyword)
  )
})

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 搜索时重置到第一页
function handleSearch() {
  currentPage.value = 1
}

function handlePageSizeChange() {
  currentPage.value = 1
}

function handlePageChange(page) {
  currentPage.value = page
}

// 监听弹窗打开时重置状态
watch(() => props.visible, (val) => {
  if (val) {
    searchText.value = ''
    currentPage.value = 1
  }
})
</script>

<style scoped>
.search-bar {
  margin-bottom: 12px;
}

.pagination-wrapper {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
