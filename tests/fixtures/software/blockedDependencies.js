import { h } from 'vue'
import { rejectWrite } from './mockApi'

export default {
  render: () => h('span', '隔离样例不连接真实主机选择器')
}
export function useJobPolling() {
  return { isPolling: false, startPolling: rejectWrite, stopPolling: () => {} }
}
