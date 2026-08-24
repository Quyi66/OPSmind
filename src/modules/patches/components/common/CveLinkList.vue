<template>
  <div v-if="cveList.length" class="cve-link-list">
    <a
      v-for="cve in visibleCves"
      :key="cve"
      :href="resolveUrl(cve)"
      target="_blank"
      rel="noopener noreferrer"
      class="cve-link"
      @click.stop
    >
      {{ cve }}
    </a>
    <button
      v-if="overflowCount > 0"
      type="button"
      class="cve-link cve-link--more"
      @click.stop="dialogVisible = true"
    >
      +{{ overflowCount }}
    </button>

    <el-dialog
      v-if="overflowCount > 0"
      v-model="dialogVisible"
      :title="dialogTitle"
      width="fit-content"
      :style="{ minWidth: '680px', maxWidth: 'calc(100vw - 32px)' }"
      append-to-body
      destroy-on-close
    >
      <div class="cve-link-list cve-link-list--dialog">
        <a
          v-for="cve in cveList"
          :key="cve"
          :href="resolveUrl(cve)"
          target="_blank"
          rel="noopener noreferrer"
          class="cve-link"
          @click.stop
        >
          {{ cve }}
        </a>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
  <span v-else class="cve-link-list__empty">{{ emptyText }}</span>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // CVE 列表，支持数组或逗号/分号/空格分隔的字符串
  cves: {
    type: [Array, String],
    default: () => []
  },
  // 生成单个 CVE 跳转地址的解析函数：(cveId) => url
  urlResolver: {
    type: Function,
    default: null
  },
  // 表格内最多内联展示的数量，超出折叠为 "+N"；传 0 表示全部展开（详情场景）
  max: {
    type: Number,
    default: 3
  },
  // "+N" 弹窗标题
  dialogTitle: {
    type: String,
    default: '关联漏洞'
  },
  // 空数据占位文案
  emptyText: {
    type: String,
    default: '-'
  }
})

const dialogVisible = ref(false)

const cveList = computed(() => {
  const raw = props.cves
  if (Array.isArray(raw)) {
    return raw.map(item => String(item).trim()).filter(Boolean)
  }

  return String(raw || '')
    .split(/[,，;；\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
})

const visibleCves = computed(() => {
  if (!props.max || props.max <= 0) {
    return cveList.value
  }
  return cveList.value.slice(0, props.max)
})

const overflowCount = computed(() => cveList.value.length - visibleCves.value.length)

function resolveUrl(cve) {
  if (typeof props.urlResolver === 'function') {
    return props.urlResolver(cve) || ''
  }
  return ''
}
</script>

<style scoped lang="scss">
.cve-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cve-link-list--dialog {
  display: grid;
  grid-template-columns: repeat(4, max-content);
  gap: 8px;
  max-width: 100%;
  max-height: 50vh;
  overflow: auto;
}

.cve-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.25);
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;

  &::after {
    content: '↗';
    font-size: 11px;
    opacity: 0.7;
  }

  &:hover {
    color: #fff;
    background: #409eff;
    border-color: #409eff;
    text-decoration: none;
  }
}

.cve-link--more {
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  border-color: var(--el-border-color);

  &::after {
    content: '';
  }

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }
}

.cve-link-list__empty {
  color: var(--el-text-color-secondary);
}
</style>
