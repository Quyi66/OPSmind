<template>
  <el-dialog
    v-model="dialogVisible"
    :title="guides.length > 1 ? `修复指引（${guides.length} 个实例）` : '修复指引'"
    width="820px"
    append-to-body
    destroy-on-close
  >
    <div v-loading="loading" class="fix-guide-content">
      <el-empty
        v-if="!loading && guides.length === 0"
        description="未能加载修复指引"
        :image-size="72"
      />

      <el-collapse v-else v-model="activeGuideNames" accordion>
        <el-collapse-item
          v-for="(guide, index) in guides"
          :key="guideKey(guide, index)"
          :name="guideKey(guide, index)"
        >
          <template #title>
            <div class="guide-title">
              <strong>{{ guideTitle(guide) }}</strong>
              <span v-if="guide.installPath">{{ guide.installPath }}</span>
            </div>
          </template>

          <div class="guide-body">
            <el-alert
              :title="guide.summary || guide.fixHint || '请按以下步骤完成修复'"
              type="info"
              show-icon
              :closable="false"
            />

            <el-descriptions v-if="guide.fixTarget || Number(guide.numVuls) > 0" :column="2" border>
              <el-descriptions-item v-if="guide.fixTarget" label="修复目标">
                {{ guide.fixTarget }}
              </el-descriptions-item>
              <el-descriptions-item v-if="Number(guide.numVuls) > 0" label="可处理漏洞">
                {{ guide.numVuls }} 条
              </el-descriptions-item>
            </el-descriptions>

            <section v-if="guideSteps(guide).length" class="guide-section">
              <h4>处理步骤</h4>
              <ol class="guide-list guide-list--ordered">
                <li v-for="(step, stepIndex) in guideSteps(guide)" :key="`${stepIndex}-${step}`">
                  {{ step }}
                </li>
              </ol>
            </section>

            <section
              v-if="guideCautions(guide).length"
              class="guide-section guide-section--cautions"
            >
              <h4>注意事项</h4>
              <ul class="guide-list">
                <li
                  v-for="(caution, cautionIndex) in guideCautions(guide)"
                  :key="`${cautionIndex}-${caution}`"
                >
                  {{ caution }}
                </li>
              </ul>
            </section>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  guides: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible'])

const activeGuideNames = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value)
})

watch(
  () => props.guides,
  guides => {
    activeGuideNames.value = guides.length ? guideKey(guides[0], 0) : ''
  },
  { immediate: true }
)

function guideKey(guide, index) {
  return guide?.instanceKey || `guide-${index}`
}

function guideTitle(guide) {
  const host = guide?.hostKey || guide?.hostId || '未知主机'
  const type = middlewareTypeLabel(guide?.middlewareType)
  return `${host} · ${type}`
}

function middlewareTypeLabel(type) {
  const key = String(type || '').toLowerCase()
  return { tomcat: 'Tomcat', weblogic: 'WebLogic', nginx: 'Nginx' }[key] || type || '中间件'
}

function guideSteps(guide) {
  return Array.isArray(guide?.steps) ? guide.steps : []
}

function guideCautions(guide) {
  return Array.isArray(guide?.cautions) ? guide.cautions : []
}
</script>

<style scoped lang="scss">
.fix-guide-content {
  max-height: calc(100vh - 240px);
  min-height: 120px;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;
}

.guide-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 0;
  line-height: 1.5;

  span {
    max-width: 100%;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.guide-body {
  padding: 4px 8px 18px;
}

.guide-body :deep(.el-alert) {
  margin-bottom: 16px;
}

.guide-body :deep(.el-alert__title),
.guide-body :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.guide-section {
  margin-top: 18px;

  h4 {
    margin: 0 0 10px;
    color: var(--el-text-color-primary);
    font-size: 14px;
  }
}

.guide-section--cautions {
  padding: 12px 14px;
  border-radius: 6px;
  background: var(--el-color-warning-light-9);
}

.guide-list {
  margin: 0;
  padding-left: 20px;
  color: var(--el-text-color-regular);

  li {
    margin-bottom: 8px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  li:last-child {
    margin-bottom: 0;
  }
}

.guide-list--ordered {
  padding-left: 24px;
  list-style-position: outside;
  list-style-type: decimal;

  li::marker {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}
</style>
