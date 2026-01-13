<template>
  <div class="tag-selector">
    <!-- 下拉模式 -->
    <el-dropdown v-if="options.view === 'dropdown'" trigger="click" @command="handleTagClick">
      <el-button>
        <i class="fa fa-tag me-1" />
        <span v-if="!selectedTag">选择标签</span>
        <span v-else>{{ selectedTag }}</span>
      </el-button>
      <template #dropdown>
        <el-scrollbar max-height="300px">
          <el-dropdown-menu>
            <el-dropdown-item command="">
              <span class="text-muted">清除标签</span>
            </el-dropdown-item>
            <el-dropdown-item
              v-for="tag in tags"
              :key="tag.name"
              :command="tag.name"
            >
              {{ tag.name }}
              <el-badge :value="tag.hostCount" class="ms-2" />
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-scrollbar>
      </template>
    </el-dropdown>

    <!-- 多选卡片模式（默认） -->
    <div v-else class="tag-cards">
      <div class="tag-list">
        <el-check-tag
          v-for="tag in tags"
          :key="tag.name"
          :checked="isTagSelected(tag.name)"
          @change="toggleTag(tag)"
          class="tag-item"
        >
          {{ tag.name }}
          <span class="tag-count">({{ tag.hostCount || 0 }})</span>
        </el-check-tag>
        <div v-if="tags.length === 0" class="no-tags">
          暂无标签数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  options: { type: Object, default: () => ({ view: 'card' }) }
})

const emit = defineEmits(['update:modelValue', 'select'])

const tags = ref([])
const selectedTag = ref(null)

// 计算当前选中的标签名列表
const selectedTagNames = computed(() => {
  if (!Array.isArray(props.modelValue)) return []
  return props.modelValue.map(item => item.value || item.name || item)
})

// 判断标签是否被选中
function isTagSelected(tagName) {
  return selectedTagNames.value.includes(tagName)
}

watch(() => props.ciType, () => {
  fetchTags()
}, { immediate: true })

onMounted(() => {
  fetchTags()
})

async function fetchTags() {
  try {
    const response = await jaoApi.queryAcmTags(props.ciType)
    const data = response?.data || response
    tags.value = Array.isArray(data) ? data.map(tag => ({
      name: tag.name || tag.tagName || tag,
      hostCount: tag.hostCount || tag.count || 0
    })) : []
  } catch (error) {
    console.error('Failed to fetch ACM tags:', error)
    tags.value = []
  }
}

function handleTagClick(tagName) {
  selectedTag.value = tagName || null
  const tagParam = tagName ? { key: `#${tagName}`, value: tagName, assetType: props.ciType } : null
  emit('update:modelValue', tagParam ? [tagParam] : [])
  emit('select', tagName)

  if (props.options.tagCallback) {
    props.options.tagCallback(tagParam)
  }
}

function toggleTag(tag) {
  const tagParam = {
    key: `#${tag.name}`,
    value: tag.name,
    runType: 'tag',
    assetType: props.ciType
  }

  const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  const existingIndex = current.findIndex(item => item.value === tag.name || item.key === `#${tag.name}`)

  if (existingIndex >= 0) {
    // 取消选中
    current.splice(existingIndex, 1)
  } else {
    // 添加选中
    current.push(tagParam)
  }

  emit('update:modelValue', current)
}
</script>

<style scoped>
.tag-selector .tag-cards {
  padding: 10px;
}

.tag-selector .tag-cards .tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}

.tag-selector .tag-cards .tag-item {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tag-selector .tag-cards .tag-item .tag-count {
  margin-left: 4px;
  color: #909399;
  font-size: 12px;
}

.tag-selector .tag-cards .tag-item:hover {
  background-color: #ecf5ff;
}

.tag-selector .no-tags {
  color: #909399;
  font-size: 14px;
  padding: 20px;
  text-align: center;
  width: 100%;
}
</style>
