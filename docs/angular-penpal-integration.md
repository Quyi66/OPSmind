# Angular端Penpal集成指南

本文档说明如何在Angular应用中集成Penpal，与Vue主应用建立可靠的通信。

## 安装Penpal

```bash
npm install penpal
```

## Angular服务实现

### 1. 创建Penpal通信服务

```typescript
// src/app/services/penpal-communication.service.ts
import { Injectable } from '@angular/core';
import { connect } from 'penpal';

@Injectable({
  providedIn: 'root'
})
export class PenpalCommunicationService {
  private connection: any = null;
  private parent: any = null;
  private isConnected = false;

  constructor() {
    this.initializePenpalConnection();
  }

  private async initializePenpalConnection() {
    try {
      console.log('🔗 [Angular-Penpal] Initializing connection to Vue parent...');

      // 定义Angular应用提供给Vue父应用的方法
      const childMethods = {
        // 接收认证数据
        receiveAuthData: (authData: any) => {
          console.log('🔐 [Angular-Penpal] <<<< AUTH DATA RECEIVED FROM VUE <<<<');
          console.log('JSON:', JSON.stringify({
            direction: 'RECEIVED',
            source: 'Vue-Parent',
            destination: 'Angular-Child',
            type: 'auth-data',
            timestamp: new Date().toISOString(),
            data: authData
          }, null, 2));

          this.handleAuthData(authData);
          return { received: true, timestamp: Date.now() };
        },

        // 接收ping消息
        receivePing: (pingData: any) => {
          console.log('🏓 [Angular-Penpal] <<<< PING RECEIVED FROM VUE <<<<');
          console.log('JSON:', JSON.stringify({
            direction: 'RECEIVED',
            source: 'Vue-Parent',
            destination: 'Angular-Child',
            type: 'ping',
            timestamp: new Date().toISOString(),
            data: pingData
          }, null, 2));

          // 返回pong响应
          const pongData = {
            type: 'pong',
            timestamp: Date.now(),
            receivedAt: new Date().toISOString(),
            originalPing: pingData
          };

          console.log('🏓 [Angular-Penpal] >>>> PONG SENT TO VUE <<<<');
          console.log('JSON:', JSON.stringify({
            direction: 'SENT',
            source: 'Angular-Child',
            destination: 'Vue-Parent',
            type: 'pong',
            timestamp: new Date().toISOString(),
            data: pongData
          }, null, 2));

          return pongData;
        },

        // 路由切换
        navigateToRoute: (route: string) => {
          console.log('🔄 [Angular-Penpal] Route change requested:', route);
          this.handleRouteChange(route);
          return { navigated: true, route, timestamp: Date.now() };
        }
      };

      // 同时监听传统的postMessage路由切换消息
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'route-change') {
          console.log('🔄 [Angular-Penpal] Route change via postMessage:', event.data.route);
          this.handleRouteChange(event.data.route);
        }
      });
      };

      // 建立连接
      this.connection = connect({
        methods: childMethods,
        timeout: 30000
      });

      // 等待连接建立
      this.parent = await this.connection.promise;
      this.isConnected = true;

      console.log('✅ [Angular-Penpal] Connection established with Vue parent');
      console.log('Available parent methods:', Object.keys(this.parent || {}));

      // 通知Vue父应用Angular已准备就绪
      this.notifyParentReady();

    } catch (error) {
      console.error('❌ [Angular-Penpal] Failed to connect to Vue parent:', error);
      this.isConnected = false;
    }
  }

  private handleAuthData(authData: any) {
    // 处理认证数据
    if (authData.token) {
      localStorage.setItem('auth_token', authData.token);
      console.log('🔐 [Angular-Penpal] Auth token saved');
    }

    if (authData.user) {
      localStorage.setItem('current_user', JSON.stringify(authData.user));
      console.log('👤 [Angular-Penpal] User info saved');
    }

    // 触发认证状态更新事件
    window.dispatchEvent(new CustomEvent('auth-updated', { detail: authData }));
  }

  private handleRouteChange(route: string) {
    // 处理路由切换
    // 这里可以使用Angular Router进行导航
    console.log('🔄 [Angular-Penpal] Navigating to route:', route);
  }

  private async notifyParentReady() {
    if (!this.isConnected || !this.parent) {
      return;
    }

    try {
      // 请求认证数据
      if (typeof this.parent.requestAuthData === 'function') {
        const authData = await this.parent.requestAuthData();
        console.log('🔐 [Angular-Penpal] Auth data requested and received');
        this.handleAuthData(authData);
      }

      // 发送状态更新
      if (typeof this.parent.updateStatus === 'function') {
        await this.parent.updateStatus({
          status: 'ready',
          timestamp: Date.now(),
          message: 'Angular application is ready'
        });
      }

    } catch (error) {
      console.error('❌ [Angular-Penpal] Failed to notify parent ready:', error);
    }
  }

  // 公共方法：发送日志到Vue父应用
  public async sendLogToParent(level: string, message: string, data?: any) {
    if (!this.isConnected || !this.parent) {
      return;
    }

    try {
      if (typeof this.parent.log === 'function') {
        await this.parent.log(level, message, data);
      }
    } catch (error) {
      console.error('❌ [Angular-Penpal] Failed to send log to parent:', error);
    }
  }

  // 公共方法：发送ping到Vue父应用
  public async sendPingToParent() {
    if (!this.isConnected || !this.parent) {
      return;
    }

    try {
      const pingData = {
        sequence: Math.floor(Math.random() * 1000),
        timestamp: Date.now(),
        sentAt: new Date().toISOString(),
        source: 'angular-child'
      };

      console.log('🏓 [Angular-Penpal] >>>> PING SENT TO VUE <<<<');
      console.log('JSON:', JSON.stringify({
        direction: 'SENT',
        source: 'Angular-Child',
        destination: 'Vue-Parent',
        type: 'ping',
        timestamp: new Date().toISOString(),
        data: pingData
      }, null, 2));

      if (typeof this.parent.receivePing === 'function') {
        const pongData = await this.parent.receivePing(pingData);
        console.log('🏓 [Angular-Penpal] <<<< PONG RECEIVED FROM VUE <<<<');
        console.log('JSON:', JSON.stringify(pongData, null, 2));
      }

    } catch (error) {
      console.error('❌ [Angular-Penpal] Failed to send ping to parent:', error);
    }
  }

  // 获取连接状态
  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasParent: !!this.parent,
      availableParentMethods: this.parent ? Object.keys(this.parent) : []
    };
  }
}
```

### 2. 在Angular组件中使用

```typescript
// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { PenpalCommunicationService } from './services/penpal-communication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  
  constructor(private penpalService: PenpalCommunicationService) {}

  ngOnInit() {
    // 监听认证状态更新
    window.addEventListener('auth-updated', (event: any) => {
      console.log('🔐 [Angular] Auth updated:', event.detail);
      // 处理认证状态更新
    });

    // 定期发送ping测试连接
    setInterval(() => {
      this.penpalService.sendPingToParent();
    }, 30000);
  }

  // 测试方法
  testPenpalConnection() {
    const status = this.penpalService.getConnectionStatus();
    console.log('Penpal Status:', status);
    
    this.penpalService.sendLogToParent('info', 'Test log from Angular', {
      timestamp: new Date().toISOString(),
      component: 'AppComponent'
    });
  }
}
```

## 调试和监控

### 在Angular中添加调试工具

```typescript
// 在浏览器控制台中暴露调试方法
declare global {
  interface Window {
    angularPenpalDebug: any;
  }
}

// 在服务中添加
export class PenpalCommunicationService {
  constructor() {
    this.initializePenpalConnection();
    this.exposeDebugMethods();
  }

  private exposeDebugMethods() {
    if (typeof window !== 'undefined') {
      window.angularPenpalDebug = {
        getStatus: () => this.getConnectionStatus(),
        sendPing: () => this.sendPingToParent(),
        sendLog: (level: string, message: string, data?: any) => 
          this.sendLogToParent(level, message, data)
      };
      
      console.log('🛠️ [Angular-Penpal] Debug methods exposed to window.angularPenpalDebug');
    }
  }
}
```

## 使用示例

### Vue端调试命令
```javascript
// 检查Penpal连接状态
window.authDebug.checkPenpalStatus()

// 测试Penpal连接
window.authDebug.testPenpalConnection()
```

### Angular端调试命令
```javascript
// 检查连接状态
window.angularPenpalDebug.getStatus()

// 发送测试ping
window.angularPenpalDebug.sendPing()

// 发送测试日志
window.angularPenpalDebug.sendLog('info', 'Test message', { test: true })
```

## 消息格式

所有Penpal通信都使用统一的JSON格式：

```json
{
  "direction": "SENT|RECEIVED",
  "source": "Vue-Parent|Angular-Child",
  "destination": "Angular-Child|Vue-Parent",
  "type": "消息类型",
  "timestamp": "ISO时间戳",
  "data": "消息数据"
}
```

## 优势

1. **类型安全**：Penpal提供TypeScript支持
2. **可靠通信**：自动处理连接建立和错误恢复
3. **方法调用**：支持异步方法调用和返回值
4. **统一日志**：所有通信都有JSON格式日志
5. **调试友好**：提供完整的调试工具和状态监控
