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

    <!-- 卡片模式 -->
    <div v-else-if="options.view === 'card'" class="tag-cards">
      <el-card class="tag-card-container">
        <div class="tag-list">
          <el-check-tag
            v-for="tag in tags"
            :key="tag.name"
            :checked="tag.status"
            @change="toggleTag(tag)"
            class="tag-item"
          >
            {{ tag.name }}
            <el-badge :value="tag.hostCount" class="ms-1" />
          </el-check-tag>
        </div>
      </el-card>
    </div>

    <!-- 列表模式 -->
    <div v-else class="tag-list-view">
      <el-scrollbar max-height="400px">
        <div class="list-group">
          <div
            class="list-group-item"
            @click="handleTagClick('')"
          >
            <span class="text-muted">清除标签</span>
          </div>
          <div
            v-for="tag in tags"
            :key="tag.name"
            class="list-group-item"
            :class="{ active: selectedTag === tag.name }"
            @click="handleTagClick(tag.name)"
          >
            {{ tag.name }}
            <el-badge :value="tag.hostCount" class="ms-auto" />
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as jaoApi from '@/modules/automation/api/jao'

const props = defineProps({
  ciType: { type: String, required: true },
  modelValue: { type: [String, Array], default: null },
  options: { type: Object, default: () => ({ view: 'card' }) }
})

const emit = defineEmits(['update:modelValue', 'select'])

const tags = ref([])
const selectedTag = ref(null)

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
      name: tag.name || tag.tagName,
      hostCount: tag.hostCount || tag.count || 0,
      status: false
    })) : []
  } catch (error) {
    console.error('Failed to fetch ACM tags:', error)
    // 如果API失败,使用模拟数据
    tags.value = [
      { name: 'web', hostCount: 15, status: false },
      { name: 'database', hostCount: 8, status: false },
      { name: 'cache', hostCount: 5, status: false },
      { name: 'monitor', hostCount: 3, status: false }
    ]
  }
}function handleTagClick(tagName) {
  selectedTag.value = tagName || null
  const tagParam = tagName ? { key: `#${tagName}`, value: tagName, assetType: props.ciType } : null
  emit('update:modelValue', tagParam)
  emit('select', tagName)

  if (props.options.tagCallback) {
    props.options.tagCallback(tagParam)
  }
}

function toggleTag(tag) {
  tag.status = !tag.status
  const tagParam = { key: `#${tag.name}`, value: tag.name, assetType: props.ciType }

  if (tag.status) {
    const current = Array.isArray(props.modelValue) ? props.modelValue : []
    emit('update:modelValue', [...current, tagParam])
  } else {
    const current = Array.isArray(props.modelValue) ? props.modelValue : []
    emit('update:modelValue', current.filter(item => item.key !== `#${tag.name}`))
  }
}
</script>

<style scoped>
.tag-selector .tag-cards .tag-card-container {
  background: rgba(231, 230, 230, 0.18);
}

.tag-selector .tag-cards .tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.tag-selector .tag-cards .tag-item {
  margin: 0;
  padding: 4px 12px;
  font-size: 13px;
}

.tag-selector .tag-list-view .list-group {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.tag-selector .tag-list-view .list-group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.tag-selector .tag-list-view .list-group-item:last-child {
  border-bottom: none;
}

.tag-selector .tag-list-view .list-group-item:hover {
  background-color: #f3f4f6;
}

.tag-selector .tag-list-view .list-group-item.active {
  background-color: #eff6ff;
  color: #3b82f6;
}
</style>
