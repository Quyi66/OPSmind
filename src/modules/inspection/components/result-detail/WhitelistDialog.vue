<template>
  <el-dialog
    :model-value="visible"
    title="主机豁免黑名单列表"
    width="720px"
    destroy-on-close
    @close="$emit('close')"
    :close-on-press-escape="selectedIds.length === 0"
    :close-on-click-modal="selectedIds.length === 0"
  >
    <div class="whitelist-dialog-body">
      <div class="whitelist-header-bar">
        <div class="whitelist-hint">
          <i class="fas fa-info-circle" aria-hidden="true"></i>
          <span>已加入黑名单的主机将在巡检任务中自动豁免跳过检查。</span>
        </div>
        <el-button
          type="danger"
          plain
          size="small"
          :disabled="selectedIds.length === 0"
          @click="$emit('remove-selected')"
        >
          <i class="fa fa-trash-alt" aria-hidden="true"></i>
          移除黑名单 ({{ selectedIds.length }})
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="data"
        max-height="400"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="host_key" label="已豁免主机标识" min-width="200" />
      </el-table>
    </div>
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

watch(
  () => props.visible,
  val => {
    if (!val) {
      selectedIds.value = []
    }
  }
)
</script>

<style scoped lang="scss">
.whitelist-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.whitelist-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  .whitelist-hint {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--el-text-color-regular);
    i {
      color: var(--el-color-primary);
    }
  }
}
</style>
