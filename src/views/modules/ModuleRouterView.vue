<template>
  <component
    :is="resolvedComponent"
    v-bind="componentProps"
    :module-definition="moduleDefinition || undefined"
  />
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
// import ModuleUnderConstruction from '@/modules/shared/views/ModuleUnderConstruction.vue'
import { getModuleDefinition } from '@/modules/registry'

const asyncComponentCache = new WeakMap()

const route = useRoute()

const moduleCode = computed(() => {
  const metaCode = route.meta?.moduleCode
  const paramCode = route.params?.moduleCode
  return String(metaCode || paramCode || '').trim()
})

const moduleDefinition = computed(() => {
  if (!moduleCode.value) return null
  return getModuleDefinition(moduleCode.value)
})
const componentProps = computed(() => {
  const definition = moduleDefinition.value
  const titleFromMeta =
    typeof route.meta?.moduleTitle === 'string' ? route.meta.moduleTitle : undefined

  return {
    moduleCode: moduleCode.value,
    title: titleFromMeta || definition?.title || definition?.name || moduleCode.value.toUpperCase(),
    description: definition?.description || '',
    groupCode: definition?.groupCode || route.meta?.groupCode,
    moduleDefinition: definition || undefined
  }
})

const resolvedComponent = computed(() => {
  const definition = moduleDefinition.value
  const loader = definition?.loader
  // if (!loader) return ModuleUnderConstruction

  if (!asyncComponentCache.has(loader)) {
    asyncComponentCache.set(
      loader,
      defineAsyncComponent({
        loader,
        suspensible: false,
        delay: 0, // 立即显示，减少闪烁
        timeout: 30000, // 30秒超时
        onError(_error, retry, fail, attempts) {
          if (attempts <= 2) {
            retry()
          } else {
            fail()
          }
        }
      })
    )
  }

  return asyncComponentCache.get(loader)
})
</script>
