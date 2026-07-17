<template>
  <div class="ai-assistant">
    <!-- 智能助手横幅 -->
    <div class="assistant-banner">
      <!-- 左侧：图标与文字 -->
      <div class="banner-left">
        <img src="@/assets/icons/aiOPS2@2x.png" alt="AI助手" class="ai-ops-icon" />
        <div class="banner-text">
          <h3 class="banner-title">OPS智能助手，很高兴为你服务</h3>
          <p class="banner-subtitle">为运维人员设计的助手Agent，帮助解决系统维护问题。</p>
        </div>
      </div>

      <!-- 右侧：搜索栏 -->
      <div class="search-container">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="询问任何系统维护问题"
            class="search-input"
            @focus="handleFocus"
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" class="search-btn" :disabled="!searchQuery.trim()">
            <img class="search-icon" src="@/assets/icons/icon-aiops-search@2x.png" alt="Search" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 搜索查询
const searchQuery = ref('')
// 动态获取 Dify token：优先 URL 参数 -> runtime-config.js -> 环境变量；不写死
function getDifyToken() {
  try {
    const t = new URLSearchParams(location.search).get('token')
    if (t) return t
  } catch {
    /* empty */
  }
  try {
    const rt = window.__OPS_RUNTIME__ || {}
    if (rt.DIFY_TOKEN) return rt.DIFY_TOKEN
  } catch {
    /* empty */
  }
  try {
    return import.meta.env.VITE_DIFY_TOKEN || ''
  } catch {
    return ''
  }
}

// 最近对话
const recentChats = ref([
  {
    id: 1,
    question: '如何查看服务器CPU使用率？',
    time: '2分钟前'
  },
  {
    id: 2,
    question: '数据库连接异常怎么处理？',
    time: '10分钟前'
  },
  {
    id: 3,
    question: '如何配置负载均衡？',
    time: '1小时前'
  }
])

// 事件处理
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入您的问题')
    return
  }

  const q = searchQuery.value.trim()

  // 先同步打开新页，确保处于用户手势上下文
  try {
    const base = import.meta.env.BASE_URL || '/'
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    const token = getDifyToken()
    if (token) params.set('token', token)
    const url = `${window.location.origin}${base}aiops-full.html${params.toString() ? `?${params.toString()}` : ''}`
    const win = window.open(url, '_blank')
    if (win) win.opener = null
  } catch (e) {
    console.warn('Failed to open aiops-embed page:', e)
  }

  ElMessage.info(`正在处理您的问题: ${q}`)

  // 模拟添加到最近对话
  recentChats.value.unshift({
    id: Date.now(),
    question: q,
    time: '刚刚'
  })

  // 限制最近对话数量
  if (recentChats.value.length > 5) {
    recentChats.value = recentChats.value.slice(0, 5)
  }

  searchQuery.value = ''
}

// 点击搜索框即新建 Tab，进入全屏助手页（并传 token）；做轻量防抖避免重复打开
let focusCooldown = false
function handleFocus(e) {
  try {
    if (focusCooldown) return
    focusCooldown = true
    const base = import.meta.env.BASE_URL || '/'
    const params = new URLSearchParams()
    const token = getDifyToken()
    if (token) params.set('token', token)
    const url = `${window.location.origin}${base}aiops-full.html${params.toString() ? `?${params.toString()}` : ''}`
    const win = window.open(url, '_blank')
    if (win) win.opener = null
    // 尝试移除输入框焦点，避免浏览器/输入法导致的二次触发
    if (e && e.target && typeof e.target.blur === 'function') e.target.blur()
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    /* empty */
  } finally {
    setTimeout(() => {
      focusCooldown = false
    }, 800)
  }
}

// 处理聊天记录点击（预留功能）
// const handleChatClick = chat => {
//   searchQuery.value = chat.question
//   ElMessage.info(`重新提问: ${chat.question}`)
// }
</script>

<style scoped lang="scss">
.ai-assistant {
  padding: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.assistant-banner {
  display: flex;
  align-items: center;
  background: transparent;
  padding: 0 20px;
  gap: 24px;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  white-space: nowrap;
}

.ai-ops-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.banner-text {
  flex: 0 0 auto;
}

.banner-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0 0 2px 0;
  line-height: 1.2;
}

.banner-subtitle {
  font-size: 11px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.2;
}

.search-container {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 0 12px;
  width: 100%;
  height: 38px;
  transition: all 0.2s ease;

  &:focus-within {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--el-text-color-primary);
  padding: 0;

  &::placeholder {
    color: var(--el-text-color-placeholder);
  }
}

.search-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  transition: color 0.3s ease;

  &:hover:not(:disabled) {
    color: #2d8cf0;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .search-icon {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .assistant-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .banner-left {
    width: 100%;
  }

  .search-container {
    width: 100%;
    justify-content: stretch;
    padding-left: 0;
  }

  .search-input-wrapper {
    width: 100%;
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .ai-assistant {
    padding: 0;
  }

  .assistant-banner {
    padding: 12px 16px;
  }

  .ai-ops-icon {
    width: 36px;
    height: 36px;
  }

  .banner-title {
    font-size: 15px;
  }

  .banner-subtitle {
    font-size: 11px;
  }

  .search-input-wrapper {
    padding: 8px 12px;
    height: 40px;
  }

  .search-input {
    font-size: 14px;
  }
}
</style>
