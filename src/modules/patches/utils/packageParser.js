/**
 * 软件包名称及版本解析工具
 */

/**
 * 解析单个软件包条目，提取包名和版本
 * 支持格式：
 * 1. name==version 或 name=version
 * 2. 带有 .rpm / .deb 后缀的文件名（如 openssl-1.0.2k-23.el7_9.x86_64.rpm）
 * 3. 带有 CPU 架构后缀（如 .x86_64, .noarch 等）
 * 4. 冒号分隔（如 1:openssl-1.0.2k 或 openssl:1.0.2）
 * 5. NVR 连字符格式（如 openssl-devel-1.0.2k-23.el7）
 * 6. 空格或制表符分隔（如 openssl 1.0.2）
 * 7. 纯包名（如 openssl）
 *
 * @param {string} rawStr
 * @returns {{ name: string, version: string } | null}
 */
export function parsePackageItem(rawStr) {
  if (!rawStr) return null
  let str = String(rawStr).trim()
  if (!str) return null

  // 1. 去除常见的包文件后缀 (如 .rpm, .deb)
  const isDeb = /\.deb$/i.test(str)
  str = str.replace(/\.(rpm|deb)$/i, '')

  // 1.5 DEB 文件名使用 _ 分隔 (name_version_arch)，单独处理
  if (isDeb && str.includes('_')) {
    const debParts = str.split('_')
    const knownArch = /^(x86_64|i[36]86|noarch|amd64|arm64|aarch64|all|mips64el|loongarch64)$/i
    if (debParts.length >= 3 && knownArch.test(debParts[debParts.length - 1])) {
      return { name: debParts[0], version: debParts.slice(1, -1).join('_') }
    }
    if (debParts.length >= 2 && /^[0-9]/.test(debParts[1])) {
      return { name: debParts[0], version: debParts.slice(1).join('_') }
    }
  }

  // 2. 去除常见的架构后缀 (如 .x86_64, .i686, .amd64, .noarch 等)
  const archRegex = /\.(x86_64|i[36]86|noarch|amd64|arm64|aarch64|mips64el|loongarch64)$/i
  str = str.replace(archRegex, '')

  // 3. 兼容双等号 == 或单等号 =（使用 indexOf 单次分割，避免版本中含 = 时丢失后续部分）
  if (str.includes('==')) {
    const idx = str.indexOf('==')
    return { name: str.slice(0, idx).trim(), version: str.slice(idx + 2).trim() }
  }
  if (str.includes('=')) {
    const idx = str.indexOf('=')
    return { name: str.slice(0, idx).trim(), version: str.slice(idx + 1).trim() }
  }

  // 4. 处理冒号分隔
  if (str.includes(':')) {
    const idx = str.indexOf(':')
    const before = str.slice(0, idx).trim()
    const after = str.slice(idx + 1).trim()
    if (/^\d+$/.test(before)) {
      // epoch 前缀 (如 1:openssl-1.0.2k)，剥离 epoch 后继续解析后续格式
      str = after
    } else if (/^[0-9]/.test(after)) {
      // 包名:版本 格式 (如 openssl: 1.0.2)
      return { name: before, version: after }
    }
  }

  // 5. 智能识别 NVR 连字符格式 (如 openssl-devel-1.0.2k-23.el7)，非贪婪匹配找到第一个 -数字 边界
  const nvrMatch = str.match(/^([\w\-+]+?)-([0-9].*)$/)
  if (nvrMatch) {
    return { name: nvrMatch[1], version: nvrMatch[2] }
  }

  // 6. 兼容空格或制表符分隔 (如 openssl 1.0.2, yum list / apt list 输出)
  const spaceParts = str.split(/\s+/)
  if (spaceParts.length >= 2) {
    // 清理包名中的 .arch 后缀 (如 openssl.x86_64) 和 /repo 后缀 (如 openssl/focal-updates)
    let name = spaceParts[0].replace(/\.(x86_64|i[36]86|noarch|amd64|arm64|aarch64|mips64el|loongarch64)$/i, '')
    name = name.replace(/\/.*$/, '')
    // 过滤版本后的噪声字段 (如 @updates, amd64, [installed])
    const verParts = spaceParts.slice(1).filter(p =>
      !/^[@\[]/.test(p) &&
      !/^(x86_64|i[36]86|noarch|amd64|arm64|aarch64|mips64el|loongarch64)$/i.test(p)
    )
    const possibleVer = verParts.join(' ')
    if (possibleVer && /^[0-9]/.test(possibleVer)) {
      return { name, version: possibleVer }
    }
  }

  // 7. 无版本，仅包名
  return { name: str, version: '' }
}

/**
 * 批量解析用户输入的多行或逗号分隔文本
 * @param {string} text 用户输入的原始文本
 * @returns {string[]} 转换为后端需要的 name==version 或 name 数组
 */
export function parseRawPackagesText(text) {
  if (!text) return []
  const rawItems = text.split(/[,\n\r，]+/).map(p => p.trim()).filter(Boolean)
  const results = rawItems
    .map(item => {
      const res = parsePackageItem(item)
      if (!res) return ''
      return res.version ? `${res.name}==${res.version}` : res.name
    })
    .filter(Boolean)
  return [...new Set(results)]
}

/**
 * 标准化受影响软件包列表为后端要求的 packages 字符串数组（优先保留完整目标包名标识 file_name，如 kernel-4.19.90-89.45.v2401.ky10.aarch64）
 * @param {Array<string|Object>} items 受影响包列表（可能为文件名、"installed -> target"、或 API 对象）
 * @returns {string[]} 去重后的标准化安装包数组
 */
export function normalizeAffectedPackages(items = []) {
  if (!Array.isArray(items)) return []
  const results = items
    .map(item => {
      if (!item) return ''
      let raw = ''
      if (typeof item === 'string') {
        if (item.includes('→')) {
          raw = item.split('→')[1]?.trim() || ''
        } else if (item.includes('->')) {
          raw = item.split('->')[1]?.trim() || ''
        } else {
          raw = item.trim()
        }
      } else if (typeof item === 'object') {
        raw = item.file_name || item.target_pkg || item.pkg_name || item.name || ''
      }
      if (!raw) return ''
      return raw.replace(/\.(rpm|deb)$/i, '').trim()
    })
    .filter(Boolean)
  return [...new Set(results)]
}

