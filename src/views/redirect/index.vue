<script setup>
import { onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onBeforeMount(() => {
  const { params, query } = route
  const { path } = params
  // 确保重定向路径正确
  const targetPath = Array.isArray(path) ? path.join('/') : path
  router.replace({ path: '/' + targetPath, query })
})
</script>

<template>
  <div></div>
</template>
