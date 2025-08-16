import { authService } from './auth.js'

class ApiService {
  constructor() {
    this.baseURL = ''
  }

  // 通用的认证请求方法
  async authenticatedRequest(url, options = {}) {
    const headers = {
      ...authService.getAuthHeaders(),
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (response.status === 401) {
      // Token 过期，清除认证信息并跳转到登录页
      authService.logout()
      window.location.href = '/login'
      throw new Error('Authentication expired')
    }

    return response
  }

  // 获取所有租户
  async getTenants() {
    try {
      const cacheBuster = Date.now()
      const response = await fetch(`${this.baseURL}/oplus-portal/api/tenants/all?cacheBuster=${cacheBuster}`)
      
      if (response.ok) {
        const tenants = await response.json()
        console.log('✅ Tenants loaded:', tenants.length)
        return tenants
      }
      return []
    } catch (error) {
      console.warn('Failed to load tenants:', error)
      return []
    }
  }

  // 验证许可证
  async verifyLicense() {
    try {
      const response = await fetch(`${this.baseURL}/oplus-portal/api/licenses/verify`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ License verified')
        return result
      }
      return null
    } catch (error) {
      console.warn('Failed to verify license:', error)
      return null
    }
  }

  // 检查 OTP 状态
  async checkOTP() {
    try {
      const cacheBuster = Date.now()
      const response = await fetch(`${this.baseURL}/oplus-portal/api/authenticate/otp?cacheBuster=${cacheBuster}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ OTP status checked:', result)
        return result
      }
      return false
    } catch (error) {
      console.warn('Failed to check OTP:', error)
      return false
    }
  }

  // 获取账户信息
  async getAccount() {
    try {
      const response = await this.authenticatedRequest(`${this.baseURL}/oplus-portal/api/account`)
      
      if (response.ok) {
        const accountInfo = await response.json()
        console.log('✅ Account info loaded:', accountInfo.login || accountInfo.username)
        return accountInfo
      }
      
      throw new Error('Failed to get account info')
    } catch (error) {
      console.error('❌ Failed to get account info:', error)
      throw error
    }
  }

  // 获取应用列表
  async getApplets() {
    try {
      const cacheBuster = Date.now()
      const response = await this.authenticatedRequest(
        `${this.baseURL}/oplus-portal/udp/api/udp/applets?isPaging=true&cacheBuster=${cacheBuster}&query=`
      )

      if (response.ok) {
        const applets = await response.json()
        console.log('✅ Applets loaded:', applets.length || 'unknown count')
        console.log('📋 Applets data sample:', applets.slice(0, 3)) // 显示前3个应用的数据结构
        return applets
      }

      throw new Error('Failed to get applets')
    } catch (error) {
      console.error('❌ Failed to get applets:', error)
      throw error
    }
  }

  // 获取系统统计信息
  async getSystemStats() {
    try {
      const response = await this.authenticatedRequest(`${this.baseURL}/oplus-portal/api/dashboard/stats`)
      
      if (response.ok) {
        const stats = await response.json()
        console.log('✅ System stats loaded')
        return stats
      }
      
      // 如果 API 不存在，返回模拟数据
      return this.getMockStats()
    } catch (error) {
      console.warn('Failed to get real stats, using mock data:', error)
      return this.getMockStats()
    }
  }

  // 模拟统计数据
  getMockStats() {
    return [
      {
        id: 'jobs',
        title: '作业总数',
        value: 156,
        icon: 'fa-tasks',
        trend: { type: 'up', value: 12, text: '较上月增长 12%' }
      },
      {
        id: 'scripts',
        title: '脚本数量',
        value: 89,
        icon: 'fa-file-code',
        trend: { type: 'up', value: 5, text: '较上月增长 5%' }
      },
      {
        id: 'assets',
        title: '资产数量',
        value: 234,
        icon: 'fa-server',
        trend: { type: 'stable', value: 0, text: '与上月持平' }
      },
      {
        id: 'alerts',
        title: '告警数量',
        value: 12,
        icon: 'fa-exclamation-triangle',
        trend: { type: 'down', value: 8, text: '较上月减少 8%' }
      }
    ]
  }

  // 转换应用数据为模块格式
  convertAppletsToModules(applets) {
    console.log('🔄 Converting applets to modules:', applets?.length || 0, 'items')

    if (!applets || !Array.isArray(applets)) {
      console.log('⚠️ No valid applets data, using default modules')
      return this.getDefaultModules()
    }

    const modules = applets.map(applet => {
      // 解析 setting JSON 来获取图标和颜色
      let setting = {}
      try {
        setting = JSON.parse(applet.setting || '{}')
      } catch (error) {
        console.warn('Failed to parse setting for applet:', applet.name, error)
      }

      return {
        code: applet.name, // 使用 name 作为模块代码
        title: applet.title,
        icon: setting.icon || 'fa-cube',
        color: setting.color || '#2196F3',
        showIn: { desktop: 1 },
        entry: {
          type: 'AngularApplet',
          value: applet.entry,
          appletId: applet.id
        },
        description: applet.description || applet.title,
        // 保存原始数据以备后用
        _applet: applet
      }
    })

    console.log('✅ Converted modules:', modules.length)
    return modules.length > 0 ? modules : this.getDefaultModules()
  }

  // 默认模块列表
  getDefaultModules() {
    return [
      {
        code: '__jao',
        title: '作业编排',
        icon: 'fa-oplus-jao',
        color: '#212529',
        showIn: { desktop: 3, dock: 3 },
        entry: { type: 'AngularState', value: 'app.jao' },
        description: '自动化作业编排和调度管理'
      },
      {
        code: '__gfs',
        title: '脚本管理',
        icon: 'fa-oplus-gfs',
        color: '#607D8B',
        showIn: { desktop: 2 },
        entry: { type: 'AngularState', value: 'app.gfs' },
        description: '脚本文件管理和版本控制'
      },
      {
        code: '__cmd',
        title: '命令管理',
        icon: 'fa-oplus-cmd',
        color: '#212529',
        showIn: { desktop: 1, dock: 1 },
        entry: { type: 'AngularState', value: 'app.jao_cmd' },
        description: '系统命令管理和执行'
      },
      {
        code: '__cac',
        title: '配置管理',
        icon: 'fa-oplus-cac',
        color: '#4CAF50',
        showIn: { desktop: 4 },
        entry: { type: 'AngularState', value: 'app.cac' },
        description: '系统配置和参数管理'
      },
      {
        code: '__dts',
        title: '数据传输',
        icon: 'fa-oplus-dts',
        color: '#FF9800',
        showIn: { desktop: 5 },
        entry: { type: 'AngularState', value: 'app.dts' },
        description: '数据传输和同步服务'
      },
      {
        code: '__udp',
        title: '统一开发平台',
        icon: 'fa-oplus-udp',
        color: '#2196F3',
        showIn: { desktop: 6 },
        entry: { type: 'AngularState', value: 'app.udp' },
        description: '统一开发和部署平台'
      }
    ]
  }
}

// 创建单例实例
export const apiService = new ApiService()
