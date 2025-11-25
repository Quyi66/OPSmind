<template>
  <div class="group-selector">
    <!-- 下拉模式 -->
    <el-dropdown v-if="options.showAs === 'dropdown'" trigger="click" @command="handleSelect">
      <el-button>
        <span v-if="!selectedGroup">
          {{ options.dropdownText || '选择分组' }}
        </span>
        <span v-else>
          分组: <strong class="text-primary">{{ selectedGroup }}</strong>
        </span>
      </el-button>
      <template #dropdown>
        <el-scrollbar max-height="300px">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'name', children: 'children' }"
            node-key="path"
            @node-click="handleNodeClick"
          />
        </el-scrollbar>
      </template>
    </el-dropdown>

    <!-- 树形模式 -->
    <div v-else class="tree-wrapper">
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="{ label: 'name', children: 'children' }"
        node-key="path"
        @node-click="handleNodeClick"
      />
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
  options: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'select'])

const treeRef = ref(null)
const treeData = ref([])
const selectedGroup = ref(null)

watch(() => props.ciType, () => {
  fetchGroups()
}, { immediate: true })

onMounted(() => {
  fetchGroups()
})

async function fetchGroups() {
  try {
    const response = await jaoApi.queryAcmGroups(props.ciType)
    const data = response?.data || response
    treeData.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Failed to fetch ACM groups:', error)
    // 如果API失败,使用模拟数据
    treeData.value = [
      {
        name: '全部',
        path: '/',
        children: [
          {
            name: '生产环境',
            path: '/prod',
            children: [
              { name: 'Web服务器', path: '/prod/web' },
              { name: '数据库服务器', path: '/prod/db' }
            ]
          },
          {
            name: '测试环境',
            path: '/test',
            children: [
              { name: 'Web服务器', path: '/test/web' },
              { name: '数据库服务器', path: '/test/db' }
            ]
          }
        ]
      }
    ]
  }
}function handleNodeClick(node) {
  selectedGroup.value = node.name
  emit('update:modelValue', node.path)
  emit('select', node.path)

  if (props.options.groupCallBack) {
    props.options.groupCallBack(node.path)
  }
}

function handleSelect(command) {
  // 处理下拉选择
}
</script>

<style scoped>
.group-selector .tree-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  max-height: 400px;
  overflow-y: auto;
}
</style>
