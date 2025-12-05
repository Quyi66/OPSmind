<template>
  <div class="input-filter">
    <!-- 输入表单 -->
    <div v-if="!showResult" class="filter-form">
      <el-form label-width="120px">
        <el-form-item label="匹配属性">
          <el-select v-model="attrCode" placeholder="请选择属性">
            <el-option label="IP" value="IP" />
            <el-option label="主机名" value="name" />
          </el-select>
        </el-form-item>

        <el-form-item label="匹配数据">
          <el-input
            v-model="searchText"
            type="textarea"
            :rows="10"
            placeholder="请输入要匹配的数据，每行一个"
          />
          <div class="form-text text-muted mt-2">
            支持多行输入，可使用逗号、分号、换行符等分隔
          </div>
        </el-form-item>

        <el-form-item label="其他分隔符">
          <el-checkbox-group v-model="searchDelims">
            <el-checkbox
              v-for="delim in delimDefs"
              :key="delim.value"
              :label="delim.value"
            >
              {{ delim.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :disabled="!searchText"
            @click="doSearch"
          >
            <i class="fa fa-search me-1" />
            查找
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 搜索结果 -->
    <div v-else class="search-result">
      <el-alert
        v-if="notFounds.length > 0"
        type="error"
        :closable="false"
        class="mb-3"
      >
        <template #title>
          未找到以下数据:
        </template>
        <ul class="mb-0">
          <li v-for="item in notFounds" :key="item">{{ item }}</li>
        </ul>
      </el-alert>

      <el-table
        :data="searchResult"
        border
        height="300"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="IP" label="IP地址" min-width="150" />
        <el-table-column prop="name" label="主机名" min-width="150" />
      </el-table>

      <el-button type="primary" plain class="mt-3" @click="showResult = false">
        重新输入
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const attrCode = ref('IP')
const searchText = ref('')
const searchDelims = ref([])
const showResult = ref(false)
const searchResult = ref([])
const notFounds = ref([])

const delimDefs = [
  { label: '逗号 (,)', value: ',' },
  { label: '分号 (;)', value: ';' },
  { label: '空格', value: ' ' },
  { label: '制表符', value: '\t' }
]

async function doSearch() {
  if (!searchText.value) {
    return
  }

  // 解析输入的文本
  const delimiters = ['\n', ...searchDelims.value]
  const pattern = new RegExp(delimiters.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
  const keywords = searchText.value
    .split(pattern)
    .map(k => k.trim())
    .filter(Boolean)

  try {
    // 调用 ACM 按属性搜索接口
    const response = await jaoApi.searchAcmByAttr(
      props.ciType,
      attrCode.value,
      keywords
    )

    const data = response?.data || response

    // 处理返回结果 - 根据API响应格式调整
    let founds = []
    let notFound = []

    if (Array.isArray(data)) {
      // 如果直接返回数组，那就是找到的记录
      founds = data
      // 计算未找到的
      const foundValues = data.map(item => item[attrCode.value] || item.IP || item.ip)
      notFound = keywords.filter(k => !foundValues.includes(k))
    } else if (data?.found) {
      founds = data.found
      notFound = data.notFound || []
    } else if (data?.records) {
      founds = data.records
      const foundValues = data.records.map(item => item[attrCode.value] || item.IP || item.ip)
      notFound = keywords.filter(k => !foundValues.includes(k))
    }

    searchResult.value = founds.map(item => ({
      id: item.id || item.ci_id,
      IP: item.IP || item.ip,
      name: item.name || item.hostname || item.ci_name,
      assetType: props.ciType
    }))
    notFounds.value = notFound
    showResult.value = true
  } catch (error) {
    console.error('Failed to search ACM by attr:', error)
    ElMessage.error('搜索失败，请重试')
    searchResult.value = []
    notFounds.value = keywords
    showResult.value = true
  }
}

function handleSelectionChange(selection) {
  const selected = selection.map(row => ({
    key: row.id,
    value: row.IP,
    assetType: props.ciType
  }))
  emit('update:modelValue', selected)
}
</script>

<style scoped>
.input-filter .filter-form {
  padding: 20px;
}

.input-filter .search-result {
  padding: 20px;
}
</style>
