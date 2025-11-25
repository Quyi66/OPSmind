<template>
  <div class="gfs-file-selector">
    <div v-if="fileList.length" class="file-list">
      <div class="file-list-header">
        <span>已选择 {{ fileList.length }} 个文件</span>
        <el-button text type="primary" size="small" @click="handleOpenSelector">
          <i class="fa fa-plus me-1" />添加文件
        </el-button>
      </div>
      <table class="file-table">
        <thead>
          <tr>
            <th>脚本路径</th>
            <th v-if="showConfig">参数</th>
            <th v-if="showTag">Tag</th>
            <th width="80">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(file, index) in fileList" :key="index">
            <td>
              <el-input v-model="file.path" placeholder="请输入文件路径" size="small" />
            </td>
            <td v-if="showConfig">
              <el-input v-model="file.config" placeholder="参数" size="small" />
            </td>
            <td v-if="showTag">
              <el-input v-model="file.tag" placeholder="Tag" size="small" />
            </td>
            <td>
              <el-button text type="danger" size="small" @click="handleRemove(index)">
                <i class="fa fa-minus" />
              </el-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <i class="fa fa-file-alt empty-icon" />
      <p>暂无文件</p>
      <el-button type="primary" plain size="small" @click="handleOpenSelector">
        <i class="fa fa-folder-open me-1" />选择文件
      </el-button>
    </div>
    <p class="helper-text">后续将接入 GFS 文件浏览器选择器</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  showConfig: { type: Boolean, default: true },
  showTag: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const fileList = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function handleOpenSelector() {
  ElMessage.info('GFS 文件选择器功能开发中,当前请手动输入文件路径')
  // 临时添加一个空行
  const newList = [...fileList.value]
  newList.push({ path: '', config: '', tag: '' })
  fileList.value = newList
}

function handleRemove(index) {
  const newList = [...fileList.value]
  newList.splice(index, 1)
  fileList.value = newList
}
</script>

<style scoped>
.gfs-file-selector {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.file-table th,
.file-table td {
  border: 1px solid #e2e8f0;
  padding: 8px;
  font-size: 13px;
}

.file-table th {
  background: #f1f5f9;
  font-weight: 600;
  text-align: left;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #cbd5e1;
}

.empty-state p {
  margin: 0 0 12px;
}

.helper-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.me-1 {
  margin-right: 4px;
}
</style>
