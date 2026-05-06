<template>
  <el-dialog
    v-model="visible"
    :title="modelData?.title || '模型详情'"
    width="800px"
    :close-on-click-modal="false"
  >
    <div v-if="modelData" class="model-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模型名称">
            {{ modelData.title }}
          </el-descriptions-item>
          <el-descriptions-item label="资产代码">
            {{ modelData.code }}
          </el-descriptions-item>
          <el-descriptions-item label="是否自动化">
            <el-tag :type="modelData.is_auto === 1 ? 'success' : 'info'" size="small">
              {{ modelData.is_auto === 1 ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资产数量">
            {{ modelData.count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="图标">
            <i
              v-if="modelData.icon"
              :class="modelData.icon"
              style="font-size: 18px; color: #409eff"
            ></i>
            <span v-else class="text-secondary">未设置</span>
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(modelData.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ modelData.description || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 属性信息 -->
      <div class="detail-section">
        <div class="section-title">
          属性列表
          <span class="attr-count">({{ attributes.length }})</span>
        </div>
        <el-table v-loading="loadingAttrs" :data="attributes" max-height="300" size="small">
          <el-table-column prop="name" label="属性名称" min-width="120" />
          <el-table-column prop="code" label="属性代码" min-width="120" />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              {{ getAttrTypeName(row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="required" label="必填" width="80" align="left">
            <template #default="{ row }">
              <el-tag v-if="row.required" type="danger" size="small">是</el-tag>
              <span v-else class="text-secondary">否</span>
            </template>
          </el-table-column>
          <el-table-column prop="default_value" label="默认值" min-width="100" />
        </el-table>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { dtsApi } from '../../api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  modelData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loadingAttrs = ref(false)
const attributes = ref([])

// 属性类型映射
const attrTypeMap = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  date: '日期',
  datetime: '日期时间',
  enum: '枚举',
  text: '长文本'
}

const getAttrTypeName = type => {
  return attrTypeMap[type] || type || '-'
}

// 格式化日期时间
const formatDateTime = dateStr => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 加载属性列表
const loadAttributes = async () => {
  if (!props.modelData?.id) {
    attributes.value = []
    return
  }

  loadingAttrs.value = true
  try {
    const res = await dtsApi.queryData('ACM_CIT_ATTRS', {
      citId: props.modelData.id
    })
    attributes.value = res?.records || []
  } catch (error) {
    console.error('加载属性失败:', error)
    attributes.value = []
  } finally {
    loadingAttrs.value = false
  }
}

// 监听弹窗打开
watch(
  () => props.modelValue,
  val => {
    if (val && props.modelData) {
      loadAttributes()
    }
  }
)
</script>

<style scoped lang="scss">
.model-detail {
  .detail-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 12px;
      padding-left: 8px;
      border-left: 3px solid var(--el-color-primary);

      .attr-count {
        font-weight: normal;
        color: var(--el-text-color-secondary);
        margin-left: 4px;
      }
    }
  }

  .text-secondary {
    color: var(--el-text-color-secondary);
  }
}
</style>
