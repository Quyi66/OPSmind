<template>
  <el-dialog
    v-model="visible"
    :title="`仓库详情 - ${repoId}`"
    width="min(900px, calc(100vw - 32px))"
    class="repo-detail-shell"
    destroy-on-close
    @close="handleClose"
  >
    <div class="repo-detail-dialog">
      <!-- 操作按钮在表格上方 -->
      <div class="ops-action-bar">
        <div class="action-left">
          <el-tooltip
            content="当前页面暂不支持移除主机配置"
            placement="top"
            :trigger="['hover', 'focus']"
          >
            <span class="unavailable-action" tabindex="0" aria-label="移除主机配置暂不可用">
              <el-button type="danger" plain disabled @click="handleRemoveRepoFromHost">
                <i class="fa fa-calendar-minus" />
                移除主机配置
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </div>

      <div class="ops-table-wrapper">
        <el-table
          v-loading="loading"
          :data="tableData"
          max-height="450px"
          style="width: 100%"
          size="small"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" />
          <el-table-column prop="host_key" label="主机" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link
                class="software-cell-link"
                :title="row.host_key"
                type="primary"
                @click="handleViewHost(row)"
              >
                {{ row.host_key }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="os_distro" label="OS" width="120" show-overflow-tooltip />
          <el-table-column prop="os_version" label="OS版本" width="120" show-overflow-tooltip />
          <el-table-column prop="scan_date" label="最后扫描时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.scan_date) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="ops-pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { repoApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  repoId: {
    type: String,
    default: ''
  },
  refid: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const visible = ref(false)
const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedRows = ref([])
const repoInfo = ref(null)

// 监听 modelValue
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.refid) {
      loadRepoInfo()
      loadData()
    }
  }
)

// 监听 visible
watch(visible, val => {
  emit('update:modelValue', val)
})

function formatDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 加载仓库信息
async function loadRepoInfo() {
  try {
    const response = await repoApi.getRepoInfoByRefid(props.refid)
    const data = response?.data || response
    repoInfo.value = data?.records?.[0] || null
  } catch (error) {
    console.error('Failed to load repo info:', error)
    repoInfo.value = null
  }
}

// 加载已配置主机列表
async function loadData() {
  if (!props.refid) return

  loading.value = true
  try {
    const response = await repoApi.getPackageMachineList({
      refid: props.refid,
      page: currentPage.value,
      size: pageSize.value
    })
    const data = response?.data || response
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('Failed to load package machines:', error)
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSelectionChange(selection) {
  selectedRows.value = selection
}

function handleViewHost(row) {
  ElMessage.info(`查看主机详情: ${row.host_key}`)
  // TODO: 跳转到主机详情页面
}

function handleRemoveRepoFromHost() {
  // refid 与删除作业 repo_name 的语义尚未核实，保留未接通状态。
  ElMessage.warning('当前页面暂不支持移除主机配置，未移除任何配置')
}

function handleClose() {
  selectedRows.value = []
  tableData.value = []
  currentPage.value = 1
}
</script>

<style lang="scss">
@use '../../styles/layout' as software-layout;

.repo-detail-shell.el-dialog {
  @include software-layout.detail-shell;
}
</style>

<style scoped lang="scss">
@use '../../styles/layout' as software-layout;

.repo-detail-shell {
  @include software-layout.detail-dialog;
}

.unavailable-action {
  display: inline-flex;
}
</style>
