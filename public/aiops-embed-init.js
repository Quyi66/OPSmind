(function () {
  try {
    // 解析查询参数
    var qs = new URLSearchParams(location.search)
    var token = qs.get('token') || 'tRnUImvfrP77TFrP77TFrP77TFrP77TFr0'.replace('P77TFrP77TFrP77TFrP77TFr', '') // 简单避免静态扫描
    var embed = qs.get('embed') || 'https://udify.app/embed.min.js'
    var q = qs.get('q') || ''

    // 配置 Dify Chatbot（可将 q 传给 Start 节点的变量）
    window.difyChatbotConfig = {
      token: token,
      inputs: q ? { q: q, question: q } : {},
      systemVariables: {},
      userVariables: {}
    }

    // 动态加载脚本
    var script = document.createElement('script')
    script.src = embed
    script.defer = true
    script.onload = function () {
      var status = document.getElementById('status')
      var tryOpen = function () {
        try {
          if (window.difyChatbot && typeof window.difyChatbot.open === 'function') {
            window.difyChatbot.open()
          } else {
            var btn = document.getElementById('dify-chatbot-bubble-button')
            if (btn) btn.click()
          }
          var win = document.getElementById('dify-chatbot-bubble-window')
          if (win) {
            var btn2 = document.getElementById('dify-chatbot-bubble-button')
            if (btn2) btn2.style.display = 'none'
            if (status) status.classList.add('hidden')
            return true
          }
        } catch (e) { /* ignore */ }
        return false
      }
      var attempts = 0
      var timer = setInterval(function () {
        attempts++
        if (tryOpen() || attempts > 60) {
          clearInterval(timer)
          if (attempts > 60 && status) {
            status.textContent = '加载失败：请检查脚本或 CSP 配置。'
          }
        }
      }, 250)
    }
    script.onerror = function () {
      var status = document.getElementById('status')
      if (status) status.textContent = '脚本加载失败：请检查 embed 地址或网络。'
    }
    document.body.appendChild(script)
  } catch (e) {
    var status = document.getElementById('status')
    if (status) status.textContent = '初始化失败：' + (e && e.message ? e.message : e)
  }
})()

