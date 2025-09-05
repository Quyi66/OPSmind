/**
 * 基于Penpal的iframe通信服务
 * 提供类型安全和可靠的iframe通信机制
 */

import { connect } from 'penpal'
import { authService } from '@/core/auth'

/**
 * Penpal iframe通信服务类
 */
export class PenpalIframeService {
  constructor() {
    this.connection = null
    this.child = null
    this.iframe = null
    this.isConnected = false
    this.connectionPromise = null
    this.pingInterval = null
    this.pingSequence = 0
    this.lastPongTime = 0
    this.connectionCallbacks = {
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {}
    }
  }

  /**
   * 连接到iframe中的Angular应用
   * @param {HTMLIFrameElement} iframe - iframe元素
   * @param {Object} options - 连接选项
   * @returns {Promise} 连接Promise
   */
  async connectToIframe(iframe, options = {}) {
    if (this.connectionPromise) {
      console.log('🔄 [PenpalIframeService] Connection already in progress, waiting...')
      return this.connectionPromise
    }

    console.log('🚀 [PenpalIframeService] Starting connection to Angular iframe...')

    this.iframe = iframe
    const { onConnect, onDisconnect, onError, timeout = 30000 } = options

    if (onConnect) this.connectionCallbacks.onConnect = onConnect
    if (onDisconnect) this.connectionCallbacks.onDisconnect = onDisconnect
    if (onError) this.connectionCallbacks.onError = onError

    this.connectionPromise = this.establishConnection(timeout)
    return this.connectionPromise
  }

  /**
   * 建立Penpal连接
   * @param {number} timeout - 连接超时时间
   * @returns {Promise} 连接Promise
   */
  async establishConnection(timeout) {
    try {
      console.log('🔗 [PenpalIframeService] Establishing Penpal connection...')

      // 定义父应用提供给子应用的方法
      const parentMethods = {
        // 接收ping消息
        receivePing: (data) => {
          this.handlePingFromChild(data)
          return {
            type: 'pong',
            timestamp: Date.now(),
            receivedAt: new Date().toISOString(),
            originalData: data
          }
        },

        // 接收认证数据请求
        requestAuthData: () => {
          console.log('🔄 [PenpalIframeService] Angular requesting auth data via Penpal')
          return this.getAuthData()
        },

        // 接收状态更新
        updateStatus: (status) => {
          console.log('📊 [PenpalIframeService] Status update from Angular:', status)
          this.logMessage('RECEIVED', 'status-update', status)
          return { received: true, timestamp: Date.now() }
        },

        // 接收日志消息
        log: (level, message, data) => {
          console.log(`📝 [PenpalIframeService] Angular log [${level}]:`, message, data)
          this.logMessage('RECEIVED', 'log', { level, message, data })
        }
      }

      // 建立连接
      this.connection = connect({
        iframe: this.iframe,
        methods: parentMethods,
        timeout
      })

      // 等待连接建立
      this.child = await this.connection.promise
      this.isConnected = true

      console.log('✅ [PenpalIframeService] Penpal connection established successfully')
      this.logMessage('SYSTEM', 'connection-established', {
        timeout,
        availableMethods: Object.keys(this.child || {})
      })

      // 启动心跳
      this.startHeartbeat()

      // 发送初始认证数据
      await this.sendAuthData()

      // 触发连接回调
      this.connectionCallbacks.onConnect(this.child)

      return this.child

    } catch (error) {
      console.error('❌ [PenpalIframeService] Failed to establish Penpal connection:', error)
      this.logMessage('ERROR', 'connection-failed', { error: error.message })

      this.isConnected = false
      this.connectionPromise = null
      this.connectionCallbacks.onError(error)

      throw error
    }
  }

  /**
   * 获取认证数据
   * @returns {Object} 认证数据
   */
  getAuthData() {
    try {
      const token = authService.getToken() || sessionStorage.getItem('oplus_token')
      const userStr = sessionStorage.getItem('oplus_user')
      let user = null

      if (userStr) {
        try {
          user = JSON.parse(userStr)
        } catch (e) {
          user = authService.getCurrentUser()
        }
      } else {
        user = authService.getCurrentUser()
      }

      const authData = {
        token,
        user,
        timestamp: Date.now(),
        source: 'penpal-iframe-service'
      }

      console.log('🔐 [PenpalIframeService] Providing auth data:', {
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: user?.login,
        tenantId: user?.tenantId
      })

      this.logMessage('SENT', 'auth-data', {
        hasToken: !!token,
        tokenLength: token?.length,
        userLogin: user?.login,
        tenantId: user?.tenantId,
        permissionsCount: user?.permissions?.length || 0
      })

      return authData

    } catch (error) {
      console.error('❌ [PenpalIframeService] Failed to get auth data:', error)
      this.logMessage('ERROR', 'auth-data-failed', { error: error.message })
      throw error
    }
  }

  /**
   * 发送认证数据到Angular应用
   * @returns {Promise} 发送Promise
   */
  async sendAuthData() {
    if (!this.isConnected || !this.child) {
      console.warn('⚠️ [PenpalIframeService] Not connected, cannot send auth data')
      return
    }

    try {
      console.log('📤 [PenpalIframeService] Sending auth data to Angular...')

      const authData = this.getAuthData()

      // 调用Angular应用的receiveAuthData方法
      if (typeof this.child.receiveAuthData === 'function') {
        const result = await this.child.receiveAuthData(authData)
        console.log('✅ [PenpalIframeService] Auth data sent successfully:', result)
        this.logMessage('SENT', 'auth-data-success', { result })
        return result
      } else {
        console.warn('⚠️ [PenpalIframeService] Angular app does not expose receiveAuthData method')
        this.logMessage('WARNING', 'method-not-available', { method: 'receiveAuthData' })
      }

    } catch (error) {
      console.error('❌ [PenpalIframeService] Failed to send auth data:', error)
      this.logMessage('ERROR', 'send-auth-data-failed', { error: error.message })
      throw error
    }
  }

  /**
   * 启动心跳机制
   */
  startHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    console.log('🏓 [PenpalIframeService] Starting heartbeat mechanism...')

    this.pingInterval = setInterval(async () => {
      await this.sendPing()
    }, 10000) // 每10秒发送一次ping

    // 立即发送第一个ping
    setTimeout(() => this.sendPing(), 2000)
  }

  /**
   * 发送ping到Angular应用
   * @returns {Promise} ping Promise
   */
  async sendPing() {
    if (!this.isConnected || !this.child) {
      return
    }

    try {
      this.pingSequence++
      const pingData = {
        sequence: this.pingSequence,
        timestamp: Date.now(),
        sentAt: new Date().toISOString(),
        source: 'penpal-iframe-service'
      }

      console.log('🏓 [PenpalIframeService] >>>> PING SENT TO ANGULAR <<<<')
      this.logMessage('SENT', 'ping', pingData)

      // 调用Angular应用的receivePing方法
      if (typeof this.child.receivePing === 'function') {
        const pongData = await this.child.receivePing(pingData)
        this.handlePongFromChild(pongData, pingData.timestamp)
      } else {
        console.warn('⚠️ [PenpalIframeService] Angular app does not expose receivePing method')
      }

    } catch (error) {
      console.error('❌ [PenpalIframeService] Ping failed:', error)
      this.logMessage('ERROR', 'ping-failed', { error: error.message })
    }
  }

  /**
   * 处理来自子应用的ping
   * @param {Object} data - ping数据
   */
  handlePingFromChild(data) {
    console.log('🏓 [PenpalIframeService] <<<< PING RECEIVED FROM ANGULAR <<<<')
    this.logMessage('RECEIVED', 'ping', data)
  }

  /**
   * 处理来自子应用的pong
   * @param {Object} pongData - pong数据
   * @param {number} originalTimestamp - 原始ping时间戳
   */
  handlePongFromChild(pongData, originalTimestamp) {
    const now = Date.now()
    const roundTripTime = now - originalTimestamp
    this.lastPongTime = now

    console.log('🏓 [PenpalIframeService] <<<< PONG RECEIVED FROM ANGULAR <<<<')
    this.logMessage('RECEIVED', 'pong', {
      ...pongData,
      roundTripTime: `${roundTripTime}ms`,
      receivedAt: new Date().toISOString()
    })

    if (roundTripTime > 5000) {
      console.warn('⚠️ [PenpalIframeService] High ping latency detected:', `${roundTripTime}ms`)
    }
  }

  /**
   * 统一的消息日志记录
   * @param {string} direction - 消息方向
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   */
  logMessage(direction, type, data) {
    const logEntry = {
      direction,
      source: direction === 'SENT' ? 'Vue-PenpalIframeService' : 'Angular',
      destination: direction === 'SENT' ? 'Angular' : 'Vue-PenpalIframeService',
      type,
      timestamp: new Date().toISOString(),
      connectionId: this.connection?.id || 'unknown',
      isConnected: this.isConnected,
      data
    }

    console.log('JSON:', JSON.stringify(logEntry, null, 2))
  }

  /**
   * 断开连接
   */
  disconnect() {
    console.log('🔌 [PenpalIframeService] Disconnecting...')

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.connection) {
      this.connection.destroy()
      this.connection = null
    }

    this.child = null
    this.isConnected = false
    this.connectionPromise = null
    this.pingSequence = 0
    this.lastPongTime = 0

    this.logMessage('SYSTEM', 'disconnected', {})
    this.connectionCallbacks.onDisconnect()

    console.log('✅ [PenpalIframeService] Disconnected successfully')
  }

  /**
   * 获取连接状态
   * @returns {Object} 连接状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasChild: !!this.child,
      hasConnection: !!this.connection,
      pingSequence: this.pingSequence,
      lastPongTime: this.lastPongTime,
      availableMethods: this.child ? Object.keys(this.child) : []
    }
  }
}

// 创建全局实例
export const penpalIframeService = new PenpalIframeService()

// 默认导出
export default PenpalIframeService
