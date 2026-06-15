<template>
  <el-dialog
    :model-value="visible"
    title="白名单列表"
    width="700px"
    destroy-on-close
    @close="$emit('close')"
  >
    <el-alert type="info" :closable="false" show-icon class="mb-3">
      白名单中的主机将在巡检时跳过检查
    </el-alert>
    <div class="whitelist-toolbar mb-3">
      <el-button
        type="primary"
        :disabled="selectedIds.length === 0"
        @click="$emit('remove-selected')"
      >
        <i class="fa fa-trash-alt"></i>
        移除白名单
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="data"
      border
      max-height="400"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="host_key" label="主机" min-width="200" />
    </el-table>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  data: Array,
  loading: Boolean
})

const emit = defineEmits(['close', 'remove-selected', 'update:selectedIds'])

const selectedIds = ref([])

function handleSelectionChange(selection) {
  selectedIds.value = selection.map(row => row.host_id)
  emit('update:selectedIds', selectedIds.value)
}

// 当弹窗关闭时清空选择
watch(
  () => props.visible,
  val => {
    if (!val) {
      selectedIds.value = []
    }
  }
)
</script>
