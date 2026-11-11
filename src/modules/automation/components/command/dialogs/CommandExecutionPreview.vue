<template>
  <div class="command-preview" aria-label="待执行命令">
    <div
      v-for="(command, index) in commands"
      :key="command.id || index"
      class="command-preview-item"
    >
      <strong>{{ command.name }}</strong>
      <details
        v-if="
          command.command &&
          (command.command.length > 240 || command.command.split('\n').length > 4)
        "
      >
        <summary>查看完整命令内容</summary>
        <pre>{{ command.command }}</pre>
      </details>
      <pre v-else-if="command.command">{{ command.command }}</pre>
      <span v-else class="text-muted">未提供命令内容</span>
    </div>
  </div>
</template>
<script setup>
defineProps({ commands: { type: Array, default: () => [] } })
</script>
<style scoped>
.command-preview {
  margin-bottom: 12px;
  max-height: 240px;
  overflow: auto;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
.command-preview-item + .command-preview-item {
  margin-top: 12px;
}
.command-preview pre {
  margin: 6px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: monospace;
}
.command-preview summary {
  margin-top: 6px;
  cursor: pointer;
}
</style>
