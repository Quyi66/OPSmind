<template>
  <div class="debug-url-manager">
    <h3>URL Manager Debug</h3>
    <div class="debug-info">
      <p><strong>Environment:</strong> {{ environment.env }}</p>
      <p><strong>Hostname:</strong> {{ hostname }}</p>
      <p><strong>isDev:</strong> {{ isDev }}</p>
      <p><strong>Angular Base URL:</strong> {{ angularBaseUrl }}</p>
      <p><strong>CAC URL:</strong> {{ cacUrl }}</p>
      <p><strong>Has CAC App:</strong> {{ hasCacApp }}</p>
    </div>
    
    <div class="test-iframe" v-if="showTestIframe">
      <h4>Test Iframe</h4>
      <iframe 
        :src="cacUrl" 
        width="100%" 
        height="400px" 
        frameborder="0"
        @load="onIframeLoad"
        @error="onIframeError">
      </iframe>
    </div>
    
    <div class="actions">
      <button @click="showTestIframe = !showTestIframe">
        {{ showTestIframe ? 'Hide' : 'Show' }} Test Iframe
      </button>
      <button @click="refreshInfo">Refresh Info</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { appUrlManager } from '@/config/module-urls.config'

const showTestIframe = ref(false)
const hostname = ref('')
const isDev = ref(false)

const environment = computed(() => appUrlManager.getCurrentEnvironment())
const angularBaseUrl = computed(() => appUrlManager.getAngularBaseUrl())
const cacUrl = computed(() => appUrlManager.getAppUrl('cac'))
const hasCacApp = computed(() => appUrlManager.hasApp('cac'))

const refreshInfo = () => {
  hostname.value = window.location.hostname
  isDev.value = import.meta.env.DEV
  console.log('🔍 Debug info refreshed:', {
    hostname: hostname.value,
    isDev: isDev.value,
    environment: environment.value,
    cacUrl: cacUrl.value
  })
}

const onIframeLoad = () => {
  console.log('✅ Test iframe loaded successfully')
}

const onIframeError = (error) => {
  console.error('❌ Test iframe failed to load:', error)
}

onMounted(() => {
  refreshInfo()
})
</script>

<style scoped>
.debug-url-manager {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 20px;
  background: #f9f9f9;
}

.debug-info p {
  margin: 8px 0;
  font-family: monospace;
}

.actions {
  margin-top: 20px;
}

.actions button {
  margin-right: 10px;
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.actions button:hover {
  background: #f0f0f0;
}

.test-iframe {
  margin-top: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
}
</style>
