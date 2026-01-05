<template>
  <el-dialog
    v-model="visible"
    title="导入应用"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="100px" size="small">
      <el-form-item label="导入模式">
        <el-select v-model="importType" style="width: 200px">
          <el-option label="更新导入" value="mod" />
          <el-option label="初始导入" value="del" />
        </el-select>
      </el-form-item>

      <el-form-item label="选择文件">
        <el-upload
          ref="uploadRef"
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          accept=".zip"
          :on-change="handleFileChange"
        >
          <el-button type="primary">
            <i class="fa fa-folder-open" style="margin-right: 4px"></i>
            选择导入文件
          </el-button>
        </el-upload>
        <span v-if="selectedFile" style="margin-left: 12px; color: #409eff;">
          {{ selectedFile.name }}
        </span>
      </el-form-item>
    </el-form>

    <!-- 解析结果展示 -->
    <div v-if="parsedData" class="parsed-content">
      <el-row :gutter="16">
        <el-col :span="12">
          <div class="tree-section">
            <h4>应用列表</h4>
            <div v-if="appletList.length > 0" class="tree-container">
              <el-tree
                :data="appletList"
                :props="treeProps"
                default-expand-all
                node-key="id"
              >
                <template #default="{ node, data }">
                  <span>
                    <i :class="['fa', data.type === 'folder' ? 'fa-folder' : 'fa-file']"
                       style="margin-right: 6px; color: #409eff;"></i>
                    {{ node.label }}
                  </span>
                </template>
              </el-tree>
            </div>
            <el-empty v-else description="无应用数据" :image-size="60" />
          </div>
        </el-col>
        <el-col :span="12">
          <div class="tree-section">
            <h4>脚本列表</h4>
            <div v-if="scriptList.length > 0" class="tree-container">
              <el-tree
                :data="scriptList"
                :props="treeProps"
                default-expand-all
                node-key="id"
              >
                <template #default="{ node, data }">
                  <span>
                    <i :class="['fa', data.type === 'folder' ? 'fa-folder' : 'fa-file-code']"
                       style="margin-right: 6px; color: #67c23a;"></i>
                    {{ node.label }}
                  </span>
                </template>
              </el-tree>
            </div>
            <el-empty v-else description="无脚本数据" :image-size="60" />
          </div>
        </el-col>
      </el-row>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="importing"
        :disabled="!parsedData"
        @click="handleImport"
      >
        <i class="fa fa-upload" style="margin-right: 4px"></i>
        导入
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiService } from '@/core/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = ref(props.modelValue)
const uploading = ref(false)
const importing = ref(false)
const importType = ref('mod')
const selectedFile = ref(null)
const parsedData = ref(null)
const appletList = ref([])
const scriptList = ref([])
const scriptsPath = ref('')
const uploadRef = ref(null)

const treeProps = {
  label: 'title',
  children: 'children'
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) {
    resetForm()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

function resetForm() {
  importType.value = 'mod'
  selectedFile.value = null
  parsedData.value = null
  appletList.value = []
  scriptList.value = []
  scriptsPath.value = ''
}

function handleClose() {
  visible.value = false
  resetForm()
}

// 转换数据为树形结构
function convertToTreeNode(rawNodeList) {
  if (!rawNodeList || !Array.isArray(rawNodeList)) return []

  return rawNodeList.map(rawNode => {
    let title = rawNode.name || ''
    // 处理 #{key} 格式的标题
    if (title.indexOf('#{') >= 0) {
      title = title.substring(2, title.length - 1)
    }

    // 保存 scriptsPath
    if (rawNode.zipScriptPath) {
      scriptsPath.value = rawNode.zipScriptPath
    }

    const node = {
      id: rawNode.id,
      type: rawNode.type,
      title: title,
      value: rawNode.value
    }

    if (rawNode.type === 'folder' && rawNode.children && rawNode.children.length > 0) {
      node.children = convertToTreeNode(rawNode.children)
    }

    return node
  })
}

// 从树中提取所有应用数据
function extractApplets(nodeList) {
  const result = []

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.type !== 'folder' && node.value) {
        result.push({
          ...node.value,
          scriptsDir: scriptsPath.value
        })
      }
      if (node.children) {
        traverse(node.children)
      }
    }
  }

  traverse(nodeList)
  return result
}

async function handleFileChange(file) {
  selectedFile.value = file.raw

  if (!selectedFile.value) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await apiService.post(
      `/adm/api/adm/applet/pre-upload/scripts?cacheBuster=${Date.now()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const data = response?.data || response
    parsedData.value = data

    // 解析应用列表
    if (data?.Applet) {
      appletList.value = convertToTreeNode(data.Applet)
    }

    // 解析脚本列表
    if (data?.Scripts) {
      scriptList.value = convertToTreeNode(data.Scripts)
    }

    ElMessage.success('文件解析成功')
  } catch (error) {
    console.error('文件上传失败:', error)
    ElMessage.error('文件解析失败')
    parsedData.value = null
  } finally {
    uploading.value = false
  }
}

async function handleImport() {
  if (!parsedData.value) {
    ElMessage.warning('请先选择要导入的文件')
    return
  }

  importing.value = true
  try {
    // 提取所有应用数据
    const udpAppletList = extractApplets(appletList.value)

    if (udpAppletList.length === 0) {
      ElMessage.warning('没有可导入的应用')
      return
    }

    await apiService.post(
      `/adm/api/adm/applet/import/relation/${importType.value}?cacheBuster=${Date.now()}`,
      udpAppletList
    )

    ElMessage.success('导入成功')
    emit('success')
    handleClose()
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped lang="scss">
.parsed-content {
  margin-top: 16px;
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

.tree-section {
  h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }
}

.tree-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
}
</style>
