<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center space-x-8">
          <div class="flex items-center">
            <img src="@/assets/icons/logo@2x.png" alt="OpsMind" class="h-8 w-auto object-contain" />
          </div>

          <nav class="flex space-x-6">
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-orange-600 bg-orange-50 rounded-lg">
              <span class="w-4 h-4 bg-orange-500 rounded"></span>
              <span>首页</span>
            </a>
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900">
              <span class="w-4 h-4 bg-yellow-500 rounded"></span>
              <span>自动化管理</span>
            </a>
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900">
              <span class="w-4 h-4 bg-purple-500 rounded"></span>
              <span>补丁测试</span>
            </a>
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900">
              <span class="w-4 h-4 bg-blue-500 rounded"></span>
              <span>系统巡检</span>
            </a>
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900">
              <span class="w-4 h-4 bg-yellow-600 rounded"></span>
              <span>资产管理</span>
            </a>
            <a href="#" class="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900">
              <span class="w-4 h-4 bg-green-500 rounded"></span>
              <span>用户管理</span>
            </a>
          </nav>
        </div>

        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span class="text-sm">A OPS</span>
          </div>
          <button class="p-2 text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
          </button>
          <div class="flex items-center space-x-2">
            <img src="/placeholder.svg?height=32&width=32" alt="User" class="w-8 h-8 rounded-full">
            <span class="text-sm text-gray-700">管理员</span>
            <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>
      </div>
    </header>

    <div class="flex">
      <!-- Sidebar -->
      <aside class="w-80 bg-white border-r border-gray-200 min-h-screen">
        <!-- User Profile Section -->
        <div class="p-4">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div class="flex items-center space-x-3">
              <img src="/placeholder.svg?height=48&width=48" alt="Manager" class="w-12 h-12 rounded-full border-2 border-white">
              <div>
                <h3 class="font-medium">管理员下午好，欢迎登录</h3>
                <p class="text-blue-100 text-sm">今天是2025-07-10 星期三</p>
              </div>
            </div>
          </div>
        </div>

        <!-- My Tasks -->
        <div class="px-4 pb-4">
          <h4 class="text-gray-900 font-medium mb-3">我的待办</h4>
          <div class="space-y-3">
            <div v-for="task in tasks" :key="task.id" class="flex items-start space-x-3">
              <div class="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900">{{ task.title }}</p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs text-gray-500">{{ task.assignee }}</span>
                  <span class="text-xs text-gray-400">{{ task.time }}</span>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <span class="text-xs text-gray-500">{{ task.status }}</span>
                  <button class="text-xs text-blue-600 hover:text-blue-800">立即处理</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Usage -->
        <div class="px-4">
          <h4 class="text-gray-900 font-medium mb-3">最近使用</h4>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="item in recentItems" :key="item.name" class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div class="w-4 h-4 bg-gray-400 rounded"></div>
              <span class="text-sm text-gray-700">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-6">
        <div class="grid grid-cols-12 gap-6">
          <!-- AI Assistant -->
          <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">OPS智能助手，很高兴为你服务</h3>
                <p class="text-sm text-gray-500">为运维人员设计的助手Agent，帮助解决系统维护问题。</p>
              </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <input type="text" placeholder="问我想要做的地方" class="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 border-none outline-none">
            </div>
            <button class="mt-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center ml-auto">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>

          <!-- Operations Overview -->
          <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">作业概况</h3>
              <button class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-blue-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">78</div>
                <div class="text-xs text-gray-500">REST作业</div>
              </div>
              <div class="text-center">
                <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-orange-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">2</div>
                <div class="text-xs text-gray-500">合令作业</div>
              </div>
              <div class="text-center">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-green-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">56</div>
                <div class="text-xs text-gray-500">脚本作业</div>
              </div>
            </div>
          </div>

          <!-- Inspection Overview -->
          <div class="col-span-4 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">巡检概况</h3>
              <button class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-blue-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">23</div>
                <div class="text-xs text-gray-500">本月巡检次数</div>
              </div>
              <div class="text-center">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-green-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">23</div>
                <div class="text-xs text-gray-500">正常</div>
              </div>
              <div class="text-center">
                <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <div class="w-4 h-4 bg-red-600 rounded"></div>
                </div>
                <div class="text-2xl font-bold text-gray-900">9</div>
                <div class="text-xs text-gray-500">异常</div>
              </div>
            </div>
          </div>

          <!-- Operations Chart -->
          <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">近10天执行作业数据</h3>
              <div class="flex items-center space-x-4">
                <span class="text-xs text-gray-500">单位：次</span>
                <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-blue-500 rounded"></div>
                    <span class="text-xs text-gray-600">REST作业</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-blue-400 rounded"></div>
                    <span class="text-xs text-gray-600">合令作业</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-green-500 rounded"></div>
                    <span class="text-xs text-gray-600">脚本作业</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="h-48 flex items-end justify-between space-x-2">
              <div v-for="(day, index) in chartData" :key="index" class="flex-1 flex flex-col items-center">
                <div class="w-full flex flex-col items-center space-y-1 mb-2">
                  <div class="w-full bg-blue-500 rounded-t" :style="`height: ${day.rest * 2}px`"></div>
                  <div class="w-full bg-blue-400 rounded" :style="`height: ${day.combined * 2}px`"></div>
                  <div class="w-full bg-green-500 rounded-b" :style="`height: ${day.script * 2}px`"></div>
                </div>
                <span class="text-xs text-gray-500">{{ day.date }}</span>
              </div>
            </div>
          </div>

          <!-- Inspection Results Chart -->
          <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">近10天巡检结果情况</h3>
              <div class="flex items-center space-x-4">
                <span class="text-xs text-gray-500">单位：次</span>
                <button class="text-xs text-blue-600">全部</button>
                <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-green-500 rounded"></div>
                    <span class="text-xs text-gray-600">正常</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span class="text-xs text-gray-600">异常</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="h-48 flex items-end justify-between space-x-2">
              <div v-for="(day, index) in inspectionData" :key="index" class="flex-1 flex flex-col items-center">
                <div class="w-full flex flex-col items-center space-y-1 mb-2">
                  <div class="w-full bg-green-500 rounded-t" :style="`height: ${day.normal * 2}px`"></div>
                  <div class="w-full bg-yellow-500 rounded-b" :style="`height: ${day.abnormal * 2}px`"></div>
                </div>
                <span class="text-xs text-gray-500">{{ day.date }}</span>
              </div>
            </div>
          </div>

          <!-- Asset Overview -->
          <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">资产概况</h3>
              <div class="flex space-x-2">
                <button class="text-xs text-blue-600 px-2 py-1 bg-blue-50 rounded">按类型</button>
                <button class="text-xs text-gray-600 px-2 py-1 hover:bg-gray-50 rounded">按系统</button>
              </div>
            </div>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Linux服务器</span>
                <div class="flex items-center space-x-2 flex-1 mx-4">
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: 80%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900">4</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Unix服务器</span>
                <div class="flex items-center space-x-2 flex-1 mx-4">
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: 20%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900">1</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Windows服务器</span>
                <div class="flex items-center space-x-2 flex-1 mx-4">
                  <div class="flex-1 bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: 40%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-900">2</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Monitoring Overview -->
          <div class="col-span-6 bg-white rounded-xl p-4 border border-gray-200">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-gray-900">监测概况</h3>
              <div class="flex space-x-2">
                <button class="text-xs text-blue-600 px-2 py-1 bg-blue-50 rounded">Linux</button>
                <button class="text-xs text-gray-600 px-2 py-1 hover:bg-gray-50 rounded">Windows</button>
              </div>
            </div>
            <div class="flex items-center justify-center">
              <div class="relative w-32 h-32">
                <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" stroke-width="2"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="25, 100"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="20, 100" stroke-dashoffset="-25"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="30, 100" stroke-dashoffset="-45"/>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="25, 100" stroke-dashoffset="-75"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-lg font-bold text-gray-900">总数</div>
                    <div class="text-sm text-gray-500">200</div>
                  </div>
                </div>
              </div>
              <div class="ml-8 space-y-2">
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-red-500 rounded"></div>
                  <span class="text-sm text-gray-600">严重</span>
                  <span class="text-sm font-medium text-gray-900">50</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-orange-500 rounded"></div>
                  <span class="text-sm text-gray-600">重要</span>
                  <span class="text-sm font-medium text-gray-900">40</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span class="text-sm text-gray-600">中等</span>
                  <span class="text-sm font-medium text-gray-900">60</span>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span class="text-sm text-gray-600">低级</span>
                  <span class="text-sm font-medium text-gray-900">50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const tasks = ref([
  {
    id: 1,
    title: '您有新的服务需要审批，请及时审查',
    assignee: '发送人:system',
    time: '2025-07-14 10:22:34',
    status: '急急'
  },
  {
    id: 2,
    title: '您有新的服务需要审批，请及时审查',
    assignee: '发送人:system',
    time: '2025-07-14 10:22:34',
    status: '急急'
  },
  {
    id: 3,
    title: '您有新的服务需要审批，请及时审查',
    assignee: '发送人:system',
    time: '2025-07-14 10:22:34',
    status: '急急'
  }
])

const recentItems = ref([
  { name: '命令管理' },
  { name: '资产信息' },
  { name: '数据管理' },
  { name: '资源权限' },
  { name: '异常设备' },
  { name: '操作记录' },
  { name: '命令管理' },
  { name: '命令管理' }
])

const chartData = ref([
  { date: '07/01', rest: 50, combined: 30, script: 40 },
  { date: '07/02', rest: 60, combined: 25, script: 35 },
  { date: '07/03', rest: 80, combined: 40, script: 50 },
  { date: '07/04', rest: 45, combined: 20, script: 30 },
  { date: '07/05', rest: 70, combined: 35, script: 45 },
  { date: '07/06', rest: 90, combined: 50, script: 60 },
  { date: '07/07', rest: 65, combined: 30, script: 40 },
  { date: '07/08', rest: 75, combined: 40, script: 50 },
  { date: '07/09', rest: 85, combined: 45, script: 55 },
  { date: '07/10', rest: 55, combined: 25, script: 35 }
])

const inspectionData = ref([
  { date: '07/01', normal: 60, abnormal: 20 },
  { date: '07/02', normal: 70, abnormal: 30 },
  { date: '07/03', normal: 50, abnormal: 25 },
  { date: '07/04', normal: 80, abnormal: 15 },
  { date: '07/05', normal: 65, abnormal: 35 },
  { date: '07/06', normal: 90, abnormal: 40 },
  { date: '07/07', normal: 75, abnormal: 25 },
  { date: '07/08', normal: 85, abnormal: 45 },
  { date: '07/09', normal: 70, abnormal: 30 },
  { date: '07/10', normal: 60, abnormal: 20 }
])
</script>
