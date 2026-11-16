export const BATCH_STATUSES = {
  pushing: { label: '安装中', type: 'primary' },
  installed: { label: '等待上线', type: 'primary' },
  online: { label: '已上线', type: 'success' },
  auth_failed: { label: '凭据错误', type: 'danger' },
  unreachable: { label: '网络不通', type: 'warning' },
  install_failed: { label: '安装失败', type: 'danger' },
  await_script: { label: '待脚本安装', type: 'info' },
  conflict: { label: '需人工绑定', type: 'warning' },
  skipped: { label: '已跳过', type: 'info' }
}

export const RETRYABLE_STATUSES = ['auth_failed', 'unreachable', 'install_failed', 'await_script']
export const isRetryableItem = item => RETRYABLE_STATUSES.includes(item.status)
export const needsBatchPolling = counts =>
  Number(counts?.pushing) > 0 || Number(counts?.installed) > 0

export function isBatchWritable(detail, now = Date.now()) {
  const batch = detail?.batch
  if (batch?.status !== 'open') return false
  const expires = Date.parse(String(batch.expiresAt || '').replace(' ', 'T'))
  return !Number.isFinite(expires) || expires > now
}

export function getBatchProgress(counts) {
  const total = Number(counts?.total) || 0
  return total
    ? Math.min(100, Math.max(0, Math.round(((Number(counts.online) || 0) / total) * 100)))
    : 0
}

export function getBatchHostOs(host, fallback = 'linux') {
  const os =
    host?.targetOs ||
    host?.ciType ||
    host?.ci_type ||
    host?.assetType ||
    host?.os ||
    host?.OS_TYPE ||
    fallback
  return /windows/i.test(String(os)) ? 'windows' : 'linux'
}

export function createBatchCredentials() {
  return Object.fromEntries(
    ['linux', 'windows'].map(os => [
      os,
      {
        enabled: false,
        authType: 'password',
        user: os === 'linux' ? 'root' : 'Administrator',
        password: '',
        becomePassword: '',
        port: os === 'linux' ? 22 : 5985,
        winrmTransport: 'ntlm',
        winrmScheme: ''
      }
    ])
  )
}

export function buildBatchCredentials(values, operatingSystems) {
  return [...new Set(operatingSystems)]
    .filter(os => values[os]?.enabled)
    .map(os => {
      const value = values[os]
      const label = os === 'linux' ? 'Linux' : 'Windows'
      const user = value.user.trim()
      if (!user) throw new Error(`请填写 ${label} 登录用户`)
      const keyAuth = os === 'linux' && value.authType === 'key'
      if (!keyAuth && !value.password) throw new Error(`请填写 ${label} 登录密码`)
      if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535)
        throw new Error(`请填写有效的 ${label} 端口（1～65535）`)
      const credential = { os, user, port: value.port, authType: keyAuth ? 'key' : 'password' }
      if (!keyAuth) credential.password = value.password
      if (os === 'linux' && value.becomePassword) credential.becomePassword = value.becomePassword
      if (os === 'windows') {
        credential.winrmTransport = value.winrmTransport
        if (value.winrmScheme) credential.winrmScheme = value.winrmScheme
      }
      return credential
    })
}

export const BATCH_MAX_TARGETS = 2000

const ipToInt = ip => {
  const parts = String(ip).split('.')
  if (parts.length !== 4) return NaN
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return NaN
    value = value * 256 + Number(part)
  }
  return value
}

export function countTargetText(text) {
  return String(text || '')
    .split(/[\s,;，；]+/)
    .filter(Boolean)
    .reduce((total, token) => {
      const cidr = token.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/)
      if (cidr) {
        const mask = Number(cidr[2])
        return total + (mask >= 0 && mask <= 32 ? 2 ** (32 - mask) : 1)
      }
      const range = token.match(/^(\d+\.\d+\.\d+\.)(\d+)-(\d+\.\d+\.\d+\.\d+|\d+)$/)
      if (range) {
        const start = ipToInt(range[1] + range[2])
        const end = /\./.test(range[3]) ? ipToInt(range[3]) : ipToInt(range[1] + range[3])
        return total + (end >= start ? end - start + 1 : 1)
      }
      return total + 1
    }, 0)
}

const IP_HEADERS = ['ip', 'ip地址', '主机ip', '地址']
const HOST_HEADERS = ['hostname', '主机名', '主机名称', '名称']
const OS_HEADERS = ['os', '操作系统', '系统', '系统类型']

function findColumn(header, names) {
  return header.findIndex(cell => names.includes(String(cell ?? '').trim().toLowerCase()))
}

/** 将 Excel 行（二维数组，首行为表头）转换为接口的 targets。表头需含 IP 列，主机名、操作系统可选。 */
export function parseBatchTargetRows(rows, fallbackOs = 'linux') {
  const [header = [], ...body] = (rows || []).filter(row => Array.isArray(row) && row.length)
  const ipCol = findColumn(header, IP_HEADERS)
  if (ipCol < 0) throw new Error('导入文件缺少“IP”列')
  const hostCol = findColumn(header, HOST_HEADERS)
  const osCol = findColumn(header, OS_HEADERS)
  const targets = []
  const seen = new Set()
  body.forEach((row, index) => {
    const ip = String(row[ipCol] ?? '').trim()
    if (!ip) return
    if (!Number.isFinite(ipToInt(ip))) throw new Error(`第 ${index + 2} 行 IP 不合法：${ip}`)
    if (seen.has(ip)) return
    seen.add(ip)
    const target = { ip, os: getBatchHostOs({ os: osCol >= 0 ? row[osCol] || fallbackOs : fallbackOs }) }
    const hostname = hostCol >= 0 ? String(row[hostCol] ?? '').trim() : ''
    if (hostname) target.hostname = hostname
    targets.push(target)
  })
  if (!targets.length) throw new Error('导入文件中没有有效的 IP')
  if (targets.length > BATCH_MAX_TARGETS)
    throw new Error(`单批最多支持 ${BATCH_MAX_TARGETS} 台主机，请分批导入`)
  return targets
}

export async function readBatchTargetsFile(file, fallbackOs = 'linux') {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return parseBatchTargetRows(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }), fallbackOs)
}

export function hasAgentManagePermission(authService) {
  return (
    authService.hasPermission('agent:manage') ||
    [
      'admin',
      'role_admin',
      'privuser',
      'role_privuser',
      'developer',
      'role_developer',
      'free',
      'role_free'
    ].some(role => authService.hasRole(role))
  )
}
