<template>
  <div class="top-nav-wrapper">
    <!-- Header -->
    <header class="top-nav-header">
      <div class="nav-container">
        <div class="nav-left">
          <!-- Logo Section -->
          <div class="logo-section">
            <img :src="logoImage" alt="OPSmind" class="brand-logo" />
          </div>

          <!-- Navigation Menu -->
          <nav class="nav-menu">
            <!-- 首页菜单项 -->
            <a href="#" class="nav-item" :class="{ 'nav-item-active': activeGroup === 'home' }"
              @click.prevent="handleHomeClick">
              <img :src="iconHome" alt="首页" class="nav-icon nav-icon-home" />
              <span class="nav-text">{{ homeMenu.name }}</span>
            </a>

            <!-- 分组菜单项 -->
            <a v-for="group in menuGroups" :key="group.code" href="#" class="nav-item"
              :class="{ 'nav-item-active': activeGroup === group.code }" @click.prevent="handleGroupClick(group)">
              <img :src="getMenuIcon(group.code)" :alt="group.name" class="nav-icon" />
              <span class="nav-text">{{ group.name }}</span>
            </a>
          </nav>

          <!-- Mobile Menu Button -->
          <button @click="toggleMobileMenu" class="mobile-menu-btn"
            :class="{ 'mobile-menu-btn-active': showMobileMenu }">
            <svg class="mobile-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                :d="showMobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"></path>
            </svg>
          </button>
        </div>

        <!-- Right Side User Area -->
        <div class="nav-right">
          <!-- AI OPS Button -->
          <el-tooltip content="AI OPS" placement="bottom">
            <div class="ai-ops-wrapper" @mouseenter="prewarmAiOps" @click="handleAiOpsClick">
              <img :src="aiOpsIcon" alt="AI OPS" class="ai-ops-simple" />
            </div>
          </el-tooltip>

          <!-- Notification Button -->
          <NotificationPopover v-model:visible="notificationPopoverVisible"
            @count-change="handleNotificationCountChange">
            <div class="notification-wrapper">
              <el-tooltip content="通知" placement="bottom" :disabled="notificationPopoverVisible">
                <button class="notification-btn" aria-label="通知">
                  <svg class="notification-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span v-if="notificationCount > 0" class="notification-badge">
                    {{ notificationCount > 99 ? '99+' : notificationCount }}
                  </span>
                </button>
              </el-tooltip>
            </div>
          </NotificationPopover>

          <!-- User Dropdown -->
          <el-dropdown @command="handleUserCommand" class="user-dropdown">
            <div class="user-dropdown-trigger">
              <el-avatar :size="24" class="user-avatar" :src="displayAvatarUrl"></el-avatar>
              <span class="user-name">{{ displayUserName }}</span>
              <svg class="dropdown-arrow" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd" />
              </svg>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon>
                    <User />
                  </el-icon>
                  个人资料
                </el-dropdown-item>
                <!-- <el-dropdown-item command="admin">
                  <el-icon>
                    <Setting />
                  </el-icon>
                  管理后台
                </el-dropdown-item> -->
                <el-dropdown-item divided command="logout">
                  <el-icon>
                    <SwitchButton />
                  </el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- Settings Button -->
          <el-tooltip content="设置" placement="bottom">
            <button @click="handleSettingsClick" class="menu-action-btn"
              :class="{ 'is-settings-active': isSettingsActive }">
              <el-icon>
                <Setting />
              </el-icon>
            </button>
          </el-tooltip>

          <!-- About Dropdown: hover/click 展开，包含“帮助”和“关于” -->
          <!-- <el-dropdown trigger="hover" @command="handleAboutCommand" class="about-dropdown">
            <button class="menu-action-btn" aria-label="关于">
              <el-icon>
                <InfoFilled />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="help" disabled>
                  <el-icon style="margin-right:6px; color:#9ca3af"><QuestionFilled /></el-icon>
                  <span style="color:#9ca3af">帮助</span>
                </el-dropdown-item>
                <el-dropdown-item command="about">
                  <el-icon style="margin-right:6px"><InfoFilled /></el-icon>
                  关于
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown> -->

          <!-- Language Dropdown: 三个选项，全部置灰禁用 -->
          <!-- <el-dropdown trigger="hover" class="language-dropdown">
            <button class="menu-action-btn" aria-label="语言">
              <el-icon>
                <svg
                  class="language-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3c3 3.5 3 14.5 0 18" />
                  <path d="M12 3c-3 3.5-3 14.5 0 18" />
                </svg>
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">中文简体</span>
                </el-dropdown-item>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">中文繁体</span>
                </el-dropdown-item>
                <el-dropdown-item disabled>
                  <span style="color:#9ca3af">English</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown> -->
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div v-if="showMobileMenu" class="mobile-menu-dropdown">
        <nav class="mobile-nav">
          <!-- 首页菜单项 -->
          <a href="#" class="mobile-nav-item" :class="{ 'mobile-nav-item-active': activeGroup === 'home' }"
            @click.prevent="handleHomeClick">
            <img :src="iconHome" alt="首页" class="mobile-nav-icon mobile-nav-icon-home" />
            <span class="mobile-nav-text">{{ homeMenu.name }}</span>
          </a>

          <!-- 分组菜单项 -->
          <a v-for="group in menuGroups" :key="group.code" href="#" class="mobile-nav-item"
            :class="{ 'mobile-nav-item-active': activeGroup === group.code }" @click.prevent="handleGroupClick(group)">
            <img :src="getMenuIcon(group.code)" :alt="group.name" class="mobile-nav-icon" />
            <span class="mobile-nav-text">{{ group.name }}</span>
          </a>
        </nav>
      </div>
    </header>

    <!-- About 对话框 -->
    <el-dialog v-model="versionDialogVisible" title="About" width="800px" append-to-body class="about-dialog">
      <el-tabs v-model="aboutActiveTab" class="about-tabs">
        <el-tab-pane label="版本信息" name="versions">
          <div v-loading="versionLoading">
            <el-table :data="versionRows" stripe size="small" class="about-table">
              <el-table-column prop="name" label="名称" width="180" />
              <el-table-column prop="version" label="版本" width="140" />
              <el-table-column prop="build" label="打包时间" />
              <el-table-column prop="code" label="代码版本" width="220" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button type="primary" @click="versionDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { appUrlManager } from '@/config/module-urls.config'
import { getDefaultAdminTarget } from '@/config/admin-menu.config'
import { authService } from '@/core/auth'
import { accountService } from '@/core/account'
import { useMenuStore } from '@/stores/menu.js'
import { useDashboardStore } from '@/stores/dashboard'
import { User, Setting, SwitchButton, InfoFilled, Check, QuestionFilled } from '@element-plus/icons-vue'
import NotificationPopover from '@/components/layout/NotificationPopover.vue'

// 导入菜单图标
import iconHome from '@/assets/icons/menu/icon-home@2x.png'
import iconJao from '@/assets/icons/menu/icon-jao@2x.png'
import iconPatch from '@/assets/icons/menu/icon-patch@2x.png'
import iconGfs from '@/assets/icons/menu/icon-gfs@2x.png'
import iconAsset from '@/assets/icons/menu/icon-asset@2x.png'
import iconUser from '@/assets/icons/menu/icon-user@2x.png'
// 自绘气泡方案：不直接在当前页注入 Dify 脚本，改为 iframe 承载全屏页

// 导入logo、aiOPS图标和用户头像
import logoImage from '@/assets/icons/logo@2x.png'
import aiOpsIcon from '@/assets/icons/aiOPS@2x.png'
import avatarImage from '@/assets/icons/avatar@2x.png'

const router = useRouter()
const route = useRoute()
const menuStore = useMenuStore()
const dashboardStore = useDashboardStore()

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

// 计算属性
const homeMenu = computed(() => menuStore.homeMenu)
const menuGroups = computed(() => menuStore.menuGroups)
const activeGroup = computed(() => menuStore.activeGroup)
const isSettingsActive = computed(() => menuStore.activeMenuItem === 'ssc')

const accountFullName = ref('')
const userAvatarUrl = ref('')

const displayUserName = computed(() => {
  if (accountFullName.value) return accountFullName.value
  const u = props.user || authService.getCurrentUser() || null
  if (!u) return '未登录'
  return u.fullName || u.firstName || u.name || u.login || '用户'
})

// 计算头像URL：优先使用用户上传的头像，否则使用默认头像
const displayAvatarUrl = computed(() => {
  if (!userAvatarUrl.value) return avatarImage
  return '/oplus-upload' + userAvatarUrl.value
})

// 通知相关状态
const notificationCount = ref(0)
const notificationPopoverVisible = ref(false)

// 处理通知数量变化
const handleNotificationCountChange = (count) => {
  notificationCount.value = count
}

// 移动菜单状态
const showMobileMenu = ref(false)

// 语言切换状态（暂不真正切换，仅提示开发中）
const currentLanguage = ref('zh-cn')


// 加载账号信息（优先缓存，再请求；用于显示 fullName 和头像）
onMounted(async () => {
  try {
    const acc = (accountService.getCached()) || (await accountService.getAccount().catch(() => null))
    if (acc) {
      if (acc.fullName || acc.login) accountFullName.value = acc.fullName || ''
      // 设置用户头像（如果有）
      if (acc.imageUrl) userAvatarUrl.value = acc.imageUrl
    }
  } catch (e) {
    // 忽略错误，保持旧回退逻辑
  }
})

// 处理首页菜单点击
const handleHomeClick = () => {

  // 设置首页为激活状态
  menuStore.setHomeActive()

  // 关闭任何打开的iframe弹窗
  const event = new CustomEvent('closeAngularModuleContainer')
  window.dispatchEvent(event)

  // 导航到home页面
  router.push('/home')
}

// 分组对应的默认路由
const GROUP_DEFAULT_ROUTES = {
  'automation': '/jao/jobs',
  'patch-testing': '/patches/machineScan',
  'system-inspection': '/cac/overview',
  'asset-management': '/acm/overview',
  'user-management': '/users/overview'
}

// 处理分组菜单点击
const handleGroupClick = group => {

  // 如果点击的是当前激活的分组，则切换显示/隐藏左侧菜单
  if (activeGroup.value === group.code) {
    menuStore.toggleSideMenu()
  } else {
    // 激活新的分组并导航到默认页面
    menuStore.setActiveGroup(group.code)

    // 导航到分组的默认页面
    const defaultRoute = GROUP_DEFAULT_ROUTES[group.code]
    if (defaultRoute) {
      router.push(defaultRoute)
    }
  }
}

// 获取菜单图标
const getMenuIcon = groupCode => {
  const iconMap = {
    automation: iconJao,
    'patch-testing': iconPatch,
    'system-inspection': iconGfs,
    'asset-management': iconAsset,
    'user-management': iconUser
  }
  return iconMap[groupCode] || iconHome
}

// 处理通知点击 - 现由 NotificationPopover 组件处理
// const handleNotificationClick = () => {
//   notificationPopoverVisible.value = !notificationPopoverVisible.value
// }

// 切换移动菜单
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const handleUserCommand = command => {
  switch (command) {
    case 'profile':
      // 通过 menuStore 打开个人资料页面，自动记录当前路径以便关闭时返回
      menuStore.setActiveMenuItem('settings')
      break
    case 'admin': {
      // 新开页签进入管理后台 /ops/#/admin，并自动携带 token（便于新 Tab 自动登录）
      try {
        const base = import.meta.env.BASE_URL || '/'
        const token = authService.getToken()
        const tokenParam = appUrlManager.getTokenParam()
        const q = token ? `?${tokenParam}=${encodeURIComponent(token)}&vue_auth=true` : ''
        const def = getDefaultAdminTarget()
        const path = `#/admin/${def.groupCode}/${def.pageCode}`
        const url = `${base}${q}${path}`
        window.open(url, '_blank', 'noopener')
      } catch (e) {
        console.warn('Failed to open admin page:', e)
      }
      break
    }
    case 'logout':
      handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    ElMessage.success('正在安全登出...')
    // 清理账户缓存
    try { accountService.clear() } catch { }
    await authService.logout()
  } catch (error) {
    console.error('Logout error:', error)
    ElMessage.error('登出失败')
  }
}

const handleClearHighlight = () => {
  menuStore.clearActiveMenu()
}

// 处理设置按钮点击
const handleSettingsClick = () => {
  // 顶部“设置”按钮：通过 Inline Iframe 打开 /#/ssc
  try {
    menuStore.setActiveMenuItem('ssc')
  } catch (e) { }
}

// Dify runtime token: prefer URL param, then runtime-config.js, then env; no hardcoded fallback
const DEFAULT_DIFY_TOKEN = 'tRnUImvfrP77TFr0'
function getDifyToken() {
  // 1) URL param
  try {
    const urlToken = new URLSearchParams(location.search).get('token')
    if (urlToken) return urlToken
  } catch { }
  // 2) LocalStorage (dev convenience)
  try {
    const ls = window.localStorage
    const keys = ['DIFY_TOKEN', 'ops:dify_token', 'dify:token']
    for (const k of keys) {
      const v = ls.getItem(k)
      if (v) return v
    }
  } catch { }
  // 3) Runtime config
  try {
    const rt = (window).__OPS_RUNTIME__ || {}
    if (rt.DIFY_TOKEN) return rt.DIFY_TOKEN
  } catch { }
  // 4) Env var
  try {
    return import.meta.env.VITE_DIFY_TOKEN || DEFAULT_DIFY_TOKEN
  } catch { return DEFAULT_DIFY_TOKEN }
}

// 处理AI OPS按钮点击：显示/隐藏右下角面板（iframe 内为气泡方案页面）
const handleAiOpsClick = async () => {
  try {
    ensureOpsBubble()
    const panel = document.getElementById('ops-dify-bubble-panel')
    if (!panel) return
    if (panel.classList.contains('visible')) {
      panel.classList.remove('visible')
    } else {
      panel.classList.add('visible')
    }
  } catch (e) {
    console.warn('Failed to mount/toggle OPS bubble panel:', e)
  }
}

function ensureOpsBubble() {
  const base = import.meta.env.BASE_URL || '/'
  const C = {
    root: 'ops-dify-bubble-root',
    panel: 'ops-dify-bubble-panel',
    iframe: 'ops-dify-bubble-iframe',
    style: 'ops-dify-bubble-style-self'
  }
  // 样式（只注入一次）
  if (!document.getElementById(C.style)) {
    const style = document.createElement('style')
    style.id = C.style
    style.textContent = `
      #${C.panel} {
        position: fixed; right: 0; bottom: 16px; top: var(--ops-bubble-top, 64px);
        width: min(34vw, 30rem);
        background: #fff; border: none; box-shadow: none; /* match full mode */
        border-radius: 12px 0 0 12px; overflow: hidden;
        z-index: 2147483647; display: none; pointer-events: auto;
      }
      #${C.panel}.visible { display: block; }
      #${C.iframe} { width: 100%; height: 100%; border: 0; background: #fff; }
    `
    document.head.appendChild(style)
  }
  // 根容器
  if (!document.getElementById(C.root)) {
    const root = document.createElement('div')
    root.id = C.root
    document.body.appendChild(root)

    // 面板 + iframe（在创建的 iframe 文档内直接注入脚本与配置）
    const panel = document.createElement('div')
    panel.id = C.panel
    const iframe = document.createElement('iframe')
    iframe.id = C.iframe
    // 仅本地加载，避免跨域与远端依赖
    const token = getDifyToken()
    const embedSrc = `${window.location.origin}${base}dify/embed.min.js`
    const rt = (() => { try { return (window).__OPS_RUNTIME__ || {} } catch { return {} } })()
    const difyBase = String(rt.DIFY_BASE_URL || '').replace(/\/$/, '')
    iframe.setAttribute('allow', 'fullscreen;microphone')
    // 使用 srcdoc 注入最小页面，确保聊天框在此 iframe 内创建
    const tokenJson = JSON.stringify(token || '')
    const tokenAttr = String(token || '').replace(/"/g, '&quot;')
    const html = `<!doctype html><html lang="zh-CN"><head>
      <meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
      <link rel=\"preconnect\" href=\"${difyBase}\" crossorigin>
      <style>
        html,body{height:100%;margin:0;background:#fff;}
        /* 按钮主色 */
        #dify-chatbot-bubble-button{ background-color:#1C64F2 !important; }
        /* 让聊天窗占满 iframe 可视区域 */
        #dify-chatbot-bubble-window{
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
          box-shadow: none !important;
        }
      </style>
    </head><body>
      <script>
        window.difyChatbotConfig = { token: ${tokenJson}, baseUrl: '${difyBase}', inputs: {}, systemVariables: {}, userVariables: {} }
      <\/script>
      <script src=\"${embedSrc}\" id=\"${tokenAttr}\" defer><\/script>
      <script>
        (function(){
          var attempts = 0, max = 60;
          var timer = setInterval(function(){
            attempts++;
            try{
              if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
                window.difyChatbot.open();
              } else {
                var btn = document.getElementById('dify-chatbot-bubble-button');
                if (btn) btn.click();
              }
              var win = document.getElementById('dify-chatbot-bubble-window');
              if (win) {
                // 打开后隐藏按钮，避免遮挡
                var btn2 = document.getElementById('dify-chatbot-bubble-button');
                if (btn2) btn2.style.display = 'none';
                // 再次确保全屏样式（保险）
                win.style.position = 'fixed';
                win.style.inset = '0';
                win.style.width = '100vw';
                win.style.height = '100vh';
                win.style.maxWidth = 'none';
                win.style.maxHeight = 'none';
                win.style.borderRadius = '0';
                win.style.border = 'none';
                win.style.boxShadow = 'none';
                clearInterval(timer);
              }
            }catch(e){}
            if (attempts > max) clearInterval(timer);
          }, 250);
        })();
      <\/script>
    </body></html>`
    iframe.srcdoc = html
    panel.appendChild(iframe)
    root.appendChild(panel)
    // 计算顶部菜单栏高度，令面板上边缘贴合菜单栏底部
    function setPanelTopOffset() {
      try {
        const header = document.querySelector('.top-nav-header') || document.querySelector('.top-nav-wrapper')
        const h = header ? (header.getBoundingClientRect().height || header.offsetHeight || 0) : 0
        // 额外预留 8px 间距
        const top = Math.max(0, Math.round(h + 8))
        panel.style.top = top + 'px'
      } catch { }
    }
    setPanelTopOffset()
    window.addEventListener('resize', setPanelTopOffset)
    window.addEventListener('orientationchange', setPanelTopOffset)

    // 初始不显示；由菜单点击进行显隐切换
    // ESC 关闭面板（再次点击顶部菜单可重新显示）
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') panel.classList.remove('visible')
    })
  }
}

// 预热 AI OPS：预加载本地脚本 + 预连接 Dify 服务
let aiOpsPrewarmed = false
function prewarmAiOps() {
  if (aiOpsPrewarmed) return
  aiOpsPrewarmed = true
  try {
    const base = import.meta.env.BASE_URL || '/'
    const embedHref = `${base}dify/embed.min.js`
    // Prefer prefetch to avoid preload unused warning if user never opens bot
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = embedHref
    link.as = 'script'
    document.head.appendChild(link)

    // Preconnect to Dify base (unified key)
    const rt = (() => { try { return (window).__OPS_RUNTIME__ || {} } catch { return {} } })()
    const difyBase = String(rt.DIFY_BASE_URL || '').replace(/\/$/, '')
    if (difyBase) {
      const preconnect = document.createElement('link')
      preconnect.rel = 'preconnect'
      preconnect.href = difyBase
      preconnect.crossOrigin = ''
      document.head.appendChild(preconnect)

      const dns = document.createElement('link')
      dns.rel = 'dns-prefetch'
      dns.href = difyBase
      document.head.appendChild(dns)
    }
  } catch { }
}

// 处理关于下拉菜单命令
const versionDialogVisible = ref(false)
const versionLoading = ref(false)
const versionRows = ref([])
const aboutActiveTab = ref('versions')

const handleAboutCommand = async (command) => {
  switch (command) {
    case 'help':
      // 当前不提供帮助入口，提示开发中
      ElMessage.info('帮助开发中...')
      break
    case 'about':
      await openVersionDialog()
      break
  }
}

async function openVersionDialog() {
  try {
    versionLoading.value = true
    versionDialogVisible.value = true
    // 按优先级尝试多种可用地址
    const candidates = []
    try {
      const angularBase = appUrlManager.getAngularBaseUrl() || '/oplus/base'
      candidates.push(`${angularBase}/app/modules/VERSION.json`)
    } catch { }
    candidates.push(`${window.location.origin}/oplus/base/app/modules/VERSION.json`)
    candidates.push('http://localhost:18080/oplus/base/app/modules/VERSION.json')

    let data = null
    let lastErr = null
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache', mode: 'cors' })
        if (res.ok) {
          data = await res.json()
          break
        } else {
          lastErr = new Error(`HTTP ${res.status} for ${url}`)
        }
      } catch (e) {
        lastErr = e
      }
    }
    if (!data) throw lastErr || new Error('无法获取版本信息')

    const versions = data?.versions || {}
    const builds = data?.builds || {}
    // 仅展示存在版本信息的条目
    const names = Object.keys(versions).sort()
    versionRows.value = names.map(name => ({
      name,
      version: versions[name],
      build: builds[name] ? `#${builds[name]}` : '-',
      code: '-'
    }))
  } catch (e) {
    console.error('加载版本信息失败:', e)
    ElMessage.error('版本信息加载失败')
  } finally {
    versionLoading.value = false
  }
}

// 处理语言切换（仅提示开发中）
const handleLanguageCommand = (_language) => {
  ElMessage.info('语言功能开发中...')
}

// 监听路由变化，自动设置菜单状态
watch(
  () => route.path,
  newPath => {
    menuStore.setMenuFromRoute(newPath)
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  window.addEventListener('clearMenuHighlight', handleClearHighlight)
  // 预热 AI OPS 资源，提升首次打开速度
  try {
    if ('requestIdleCallback' in window) {
      // @ts-ignore
      window.requestIdleCallback(() => prewarmAiOps())
    } else {
      setTimeout(() => prewarmAiOps(), 0)
    }
  } catch { }
})

onUnmounted(() => {
  window.removeEventListener('clearMenuHighlight', handleClearHighlight)
})
</script>



<style scoped lang="scss">
/* About 对话框尺寸与滚动 */
.about-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow: auto;
  padding-top: 8px;
}

/* 表头深色背景，强调区分 */
.about-table :deep(.el-table__header th) {
  background-color: #eef2f7;
  color: #374151;
  font-weight: 600;
}

/* 去掉竖直分隔线（未启用 border，本行做额外保险） */
.about-table :deep(.el-table__row > td) {
  border-right: none !important;
}

/* 去掉表格顶部额外的横线 */
.about-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

// 顶部导航包装器
.top-nav-wrapper {
  position: sticky;
  top: 0;
  z-index: 1000;
  /* 顶部条左右留白区域使用与外围一致的背景 */
  background: var(--app-surround-bg);
}

// 顶部导航头部
.top-nav-header {
  /* 顶部菜单栏占满宽度（整条白底） */
  background: #fff;
  position: relative;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

// 导航容器
.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 与内容区对齐：左右内边距与主容器一致；进一步减小高度 */
  padding: 0.25rem 1rem;
  /* 再次收紧垂直间距 */
  /* 顶部菜单与内容区使用相同的定宽容器 */
  max-width: var(--app-max-width);
  margin: 0 auto;
  width: 100%;
  /* 让白底来自整条 header，容器透明，仅负责对齐 */
  background: transparent;
  border-bottom: none;
  box-shadow: none;
}

// 左侧导航区域
.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
  min-width: 0; // 防止flex子元素溢出
}

// Logo区域
.logo-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.brand-logo {
  height: 1.5rem;
  /* shrink logo to reduce header height */
  width: auto;
  object-fit: contain;
  object-position: center;
}

// 导航菜单
.nav-menu {
  display: none;
  align-items: center;
  gap: 0.25rem;

  @media (min-width: 768px) {
    display: flex;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  /* 进一步收紧内边距 */
  margin: 0 0.25rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.nav-item-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.nav-icon {
  width: 1.25rem;
  /* 放大图标尺寸 */
  height: 1.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  object-fit: contain;
}

.nav-text {
  font-size: 1rem;
  /* 字体放大一档 */
  font-weight: 500;
}

// 移动端菜单按钮
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  @media (min-width: 768px) {
    display: none;
  }

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.mobile-menu-btn-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.mobile-menu-icon {
  width: 1.5rem;
  height: 1.5rem;
}

// 右侧导航区域
.nav-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;

  @media (min-width: 640px) {
    gap: 0.5rem;
  }
}

/* (admin 专用) 右侧 Logo 与搜索已从全局头部移除 */

// AI OPS按钮
// AI OPS简单样式 - 模仿logo的实现
.ai-ops-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.375rem;
  transition: background 0.2s ease-in-out;

  &:hover {
    background: #f9fafb;
  }
}

.ai-ops-simple {
  height: 1.5rem;
  /* 按要求放大到 1.5rem */
  width: auto;
  object-fit: contain;
  object-position: center;
}

// 通知按钮
.notification-wrapper {
  position: relative;
}

.notification-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
  position: relative;

  &:hover {
    color: #6b7280;
  }
}

.notification-icon {
  width: 1.25rem;
  /* 放大图标尺寸 */
  height: 1.25rem;
}

.notification-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  border-radius: 50%;
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

// 菜单操作按钮
.menu-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  width: 2rem;
  /* 放大触控目标 */
  height: 2rem;

  &:hover {
    color: #6b7280;
    background: #f9fafb;
  }

  &.is-settings-active {
    color: #f97316;
    background: #fff7ed;
  }

  .el-icon {
    font-size: 1.25rem;
    /* 放大内部图标 */
  }
}

// 语言下拉菜单
.language-dropdown {
  .el-dropdown-menu__item {
    &.is-active {
      color: #2563eb;
      background-color: #eff6ff;
      font-weight: 500;
    }
  }
}

// 用户下拉菜单
.user-dropdown {
  cursor: pointer;
}

.user-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: #f9fafb;
  }
}

.user-avatar {
  border: 2px solid #e5e7eb;
  transition: border-color 0.2s ease-in-out;

  &:hover {
    border-color: #d1d5db;
  }
}

.user-name {
  display: none;
  font-size: 1rem;
  /* 放大用户名字号 */
  color: #374151;

  @media (min-width: 768px) {
    display: inline;
  }
}

.dropdown-arrow {
  display: none;
  width: 1.25rem;
  /* 放大下拉箭头 */
  height: 1.25rem;
  color: #9ca3af;

  @media (min-width: 640px) {
    display: inline;
  }
}

// Language icon sizing within el-icon
.language-icon {
  width: 1.25rem;
  /* 放大语言图标 */
  height: 1.25rem;
  display: block;
}

// 移动端菜单下拉
.mobile-menu-dropdown {
  display: block;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 1rem 1.5rem;

  @media (min-width: 768px) {
    display: none;
  }
}

.mobile-nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #6b7280;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: #111827;
    background: #f9fafb;
  }

  &.mobile-nav-item-active {
    color: #ea580c;
    background: #fff7ed;
  }
}

.mobile-nav-icon {
  width: 1.25rem;
  /* 移动端图标同步放大 */
  height: 1.25rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  object-fit: contain;
}

.mobile-nav-text {
  font-size: 1rem;
  /* 移动端字体同步放大 */
  font-weight: 500;
}

/* 大屏（27寸等 ≥1600px）放大排版与触控目标 */
@media (min-width: 1600px) {
  .nav-container {
    padding: 0.75rem 2rem;
  }

  .nav-left {
    gap: 2.5rem;
  }

  .brand-logo {
    height: 2.5rem;
  }

  .nav-menu {
    gap: 0.5rem;
  }

  .nav-item {
    gap: 0.625rem;
    padding: 0.625rem 1rem;
  }

  .nav-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .nav-text {
    font-size: 1rem;
  }

  .ai-ops-simple {
    height: 1.5rem;
  }

  .notification-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .notification-badge {
    width: 1.1rem;
    height: 1.1rem;
    font-size: 0.75rem;
    top: -0.3rem;
    right: -0.3rem;
  }

  .menu-action-btn {
    width: 2rem;
    height: 2rem;

    .el-icon {
      font-size: 1.125rem;
    }
  }

  .language-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .user-dropdown-trigger {
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .user-name {
    font-size: 1rem;
  }

  .dropdown-arrow {
    width: 1.1rem;
    height: 1.1rem;
  }
}

/* 超宽屏（≥1920px）进一步放大 */
@media (min-width: 1920px) {
  .nav-container {
    padding: 1rem 2.5rem;
  }

  .brand-logo {
    height: 2.75rem;
  }

  .nav-item {
    padding: 0.75rem 1.1rem;
  }

  .nav-icon {
    width: 1.35rem;
    height: 1.35rem;
  }

  .nav-text {
    font-size: 1.05rem;
  }

  .menu-action-btn {
    width: 2.25rem;
    height: 2.25rem;

    .el-icon {
      font-size: 1.2rem;
    }
  }

  .ai-ops-simple {
    height: 1.75rem;
  }
}
</style>
