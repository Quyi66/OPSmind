<template>
  <div class="win-patch-yum-page">
    <div class="ops-filter-bar">
      <el-form inline size="small">
        <el-form-item label="关键词">
          <el-input
            v-model="filterText"
            placeholder="搜索名称、描述、地址或文件"
            style="width: 240px"
            clearable
            maxlength="100"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>

    <div class="ops-action-bar">
      <el-button type="primary" size="small" @click="handleAddConfig">YUM源配置录入</el-button>
      <el-button
        size="small"
        :disabled="!configs.length"
        :loading="batchCollecting"
        @click="emit('collect-all')"
      >
        全部采集
      </el-button>
      <span class="win-patch-action-spacer"></span>
      <el-button class="toolbar-icon-btn" circle size="small" :loading="loading" @click="emit('refresh')">
        <el-icon v-show="!loading"><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="ops-table-wrapper">
      <el-table v-loading="loading" :data="filteredConfigs" max-height="calc(100vh - 520px)">
        <el-table-column label="源名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigLabel(row) }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="仓库地址" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigBaseurl(row) }}
          </template>
        </el-table-column>
        <el-table-column label="来源文件" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getYumConfigFile(row) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.updateTime || row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="采集状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getCollectStatusTagType(row)">
              {{ getCollectStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="包数量" width="90" align="center">
          <template #default="{ row }">
            {{ row.packageCount ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :loading="collectingConfigId === resolveYumConfigId(row)"
              @click.stop="emit('collect', row)"
            >
              采集
            </el-button>
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-packages', row)">
              清单
            </el-button>
            <el-button text type="primary" size="small" :disabled="!getSourceId(row)" @click.stop="emit('open-compare', row)">
              比对
            </el-button>
            <el-button text type="primary" size="small" @click.stop="handleEditConfig(row)">编辑</el-button>
            <el-button text type="danger" size="small" @click.stop="handleDeleteConfig(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingConfig ? '编辑YUM源配置' : 'YUM源配置录入'" width="600px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="YUM源名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入YUM源名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" placeholder="请输入描述" maxlength="200" />
        </el-form-item>
        <el-form-item label="YUM源地址" prop="baseurl">
          <el-input v-model="formData.baseurl" placeholder="请输入YUM源地址" maxlength="500" />
        </el-form-item>
        <el-form-item label="YUM源文件" prop="file">
          <el-input v-model="formData.file" placeholder="如：/etc/yum.repos.d/local.repo" maxlength="256" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { yumRepoApi } from '../../yum-repo/api'
import {
  formatDateTime,
  findYumRepoSourceByConfig,
  getCollectStatusLabel,
  getCollectStatusTagType,
  getYumConfigBaseurl,
  getYumConfigFile,
  getYumConfigLabel,
  resolveYumConfigId,
  resolveYumRepoId
} from '../../yum-repo/utils'

const props = defineProps({
  configs: {
    type: Array,
    default: () => []
  },
  sources: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  collectingConfigId: {
    type: String,
    default: ''
  },
  batchCollecting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'refresh',
  'collect',
  'collect-all',
  'open-packages',
  'open-compare',
  'created',
  'updated'
])

const filterText = ref('')
const dialogVisible = ref(false)
const submitting = ref(false)
const editingConfig = ref(null)
const formRef = ref(null)
const formData = reactive({
  name: '',
  description: '',
  baseurl: '',
  file: ''
})
const formRules = {
  baseurl: [{ required: true, message: '请输入YUM源地址', trigger: 'blur' }]
}

const filteredConfigs = computed(() => {
  const keyword = String(filterText.value || '').trim().toLowerCase()
  if (!keyword) return props.configs

  return props.configs.filter(item => {
    const config = item || {}
    return [config.name, config.description, config.baseurl, config.file, config.collectStatus]
      .some(value => String(value || '').toLowerCase().includes(keyword))
  })
})

function getSourceId(row) {
  return resolveYumRepoId(findYumRepoSourceByConfig(row, props.sources))
}

function normalizeBaseurl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    description: '',
    baseurl: '',
    file: ''
  })
}

function handleAddConfig() {
  editingConfig.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEditConfig(row) {
  editingConfig.value = row
  Object.assign(formData, {
    name: row?.name || '',
    description: row?.description || '',
    baseurl: row?.baseurl || '',
    file: row?.file || ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (editingConfig.value) {
      const previousConfig = editingConfig.value || {}
      const previousBaseurl = normalizeBaseurl(previousConfig.baseurl)
      const response = await yumRepoApi.updateConfig(resolveYumConfigId(previousConfig), formData)
      const updatedConfig = {
        ...previousConfig,
        ...formData,
        ...(response?.data ?? response ?? {})
      }
      const baseurlChanged = previousBaseurl !== normalizeBaseurl(updatedConfig.baseurl)

      ElMessage.success(baseurlChanged ? '更新成功，正在自动重新采集并比对' : '更新成功')
      dialogVisible.value = false
      emit('updated', {
        config: updatedConfig,
        baseurlChanged
      })
    } else {
      const response = await yumRepoApi.createConfig(formData)
      const newConfig = response?.data ?? response ?? {}
      ElMessage.success('添加成功，正在自动采集并比对')
      dialogVisible.value = false
      emit('created', newConfig)
    }
  } catch (error) {
    if (error !== false) {
      console.error('提交 Yum 源配置失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

async function handleDeleteConfig(row) {
  try {
    await ElMessageBox.confirm(`确定要删除“${getYumConfigLabel(row)}”吗？此操作不可恢复。`, '删除确认', {
      type: 'warning'
    })
    await yumRepoApi.deleteConfig(resolveYumConfigId(row))
    ElMessage.success('配置已删除')
    emit('refresh')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('删除 Yum 源配置失败:', error)
      ElMessage.error('删除 Yum 源配置失败')
    }
  }
}
</script>

<style scoped lang="scss">
.win-patch-yum-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.win-patch-action-spacer {
  flex: 1;
}

</style>
