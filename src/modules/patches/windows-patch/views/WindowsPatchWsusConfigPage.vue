<template>
  <div class="ops-page-layout win-patch-page">
    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="openCreateDialog">新建配置</el-button>
      <span style="flex: 1"></span>
      <el-button
        class="toolbar-icon-btn"
        circle
        size="small"
        :loading="loading"
        @click="loadConfigs()"
      >
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="configList" max-height="calc(100vh - 220px)">
        <el-table-column label="WSUS 地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['wsusUrl', 'wsus_url'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="端口" width="90" align="center">
          <template #default="{ row }">
            {{ pickValue(row, ['wsusPort', 'wsus_port'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="HTTPS" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="
                normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false)) ? 'success' : 'info'
              "
              size="small"
            >
              {{ normalizeBoolean(pickValue(row, ['useSsl', 'use_ssl'], false)) ? '启用' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            {{ pickValue(row, ['description'], '-') }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="190" class-name="win-patch-table__time-column">
          <template #default="{ row }">
            {{
              formatDateTime(
                pickValue(row, ['updatedDate', 'updated_date', 'createdDate', 'created_date'], '')
              )
            }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <WinPatchWsusConfigDialog
      v-model="dialogVisible"
      :config-data="editingConfig"
      @saved="loadConfigs"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import WinPatchWsusConfigDialog from '../components/wsus/WinPatchWsusConfigDialog.vue'
import { winPatchApi } from '../api'
import { formatDateTime, normalizeBoolean, pickValue } from '../utils'

const loading = ref(false)
const configList = ref([])
const dialogVisible = ref(false)
const editingConfig = ref(null)

async function loadConfigs() {
  loading.value = true
  try {
    const response = await winPatchApi.getWsusConfigs()
    configList.value = Array.isArray(response?.data) ? response.data : []
  } catch (error) {
    console.error('加载 WSUS 配置失败:', error)
    ElMessage.error('加载 WSUS 配置失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingConfig.value = null
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingConfig.value = row
  dialogVisible.value = true
}

async function handleDelete(row) {
  const id = pickValue(row, ['id'], '')
  if (!id) return

  try {
    await ElMessageBox.confirm('确定删除该 WSUS 配置吗？', '删除确认', {
      type: 'warning'
    })
    await winPatchApi.deleteWsusConfig(id)
    ElMessage.success('WSUS 配置已删除')
    loadConfigs()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 WSUS 配置失败:', error)
      ElMessage.error('删除 WSUS 配置失败')
    }
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped lang="scss">
.win-patch-page {
  gap: 12px;
}

:deep(.win-patch-table__time-column .cell) {
  white-space: nowrap;
}
</style>
