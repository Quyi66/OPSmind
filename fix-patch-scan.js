const fs = require('fs')
let vueCode = fs.readFileSync('src/modules/patches/components/LinuxPatchScan.vue', 'utf8')

// 1. Fix dark mode colors
vueCode = vueCode.replace(
  /border-bottom:\s*1px\s+solid\s*#(e9ecef|dee2e6);/g,
  'border-bottom: 1px solid var(--el-border-color-lighter);'
)
vueCode = vueCode.replace(
  /border-top:\s*1px\s+solid\s*#(e9ecef|dee2e6);/g,
  'border-top: 1px solid var(--el-border-color-lighter);'
)
vueCode = vueCode.replace(
  /border:\s*1px\s+solid\s*#(e9ecef|dee2e6|e8e8e8);/g,
  'border: 1px solid var(--el-border-color-lighter);'
)
vueCode = vueCode.replace(/border-color:\s*#(dcdfe6);/g, 'border-color: var(--el-border-color);')
vueCode = vueCode.replace(/color:\s*#495057;/g, 'color: var(--el-text-color-primary);')

// Fix .page-header back/bg
vueCode = vueCode.replace(/background:\s*#fff;/g, 'background: var(--el-bg-color);')

// Fix stats-dashboard margin
vueCode = vueCode.replace(
  /margin-bottom:\s*24px;\r?\n}/g,
  'margin-bottom: 24px;\n  padding-top: 4px;\n}'
)

// Insert PatchDetailDialog import and implementation
if (!vueCode.includes('PatchDetailDialog')) {
  vueCode = vueCode.replace(
    /import OperationLogsDialog from '\.\/dialogs\/OperationLogsDialog\.vue'/,
    "import OperationLogsDialog from './dialogs/OperationLogsDialog.vue'\nimport PatchDetailDialog from './host-detail/PatchDetailDialog.vue'"
  )
}

if (!vueCode.includes('patchDetailVisible')) {
  vueCode = vueCode.replace(
    /\/\/ 修复漏洞对话框/,
    `// 补丁详情
const patchDetailVisible = ref(false)
const patchDetailLoading = ref(false)
const patchDetailData = ref({})
const currentPatchOsDistro = ref('')

async function loadPatchDetail(patchId, osDistro) {
  currentPatchOsDistro.value = osDistro || ''
  patchDetailVisible.value = true
  patchDetailLoading.value = true
  patchDetailData.value = {}
  try {
    const response = await patchScanApi.getPatchDetail({ patch_id: patchId })
    const records = response?.data?.records || response?.records || []
    if (records.length > 0) {
      patchDetailData.value = records[0]
    } else {
      ElMessage.warning('未找到补丁详情')
      patchDetailVisible.value = false
    }
  } catch (error) {
    console.error('Failed to load patch detail:', error)
    ElMessage.error('获取补丁详情失败')
    patchDetailVisible.value = false
  } finally {
    patchDetailLoading.value = false
  }
}

function getPatchIdList(patchId) {
  if (!patchId) return []
  return String(patchId).split(',').map(item => item.trim()).filter(Boolean)
}

// 修复漏洞对话框`
  )
}

// Update handlePatchClick function
vueCode = vueCode.replace(
  /function handlePatchClick\(row\) \{[\s\S]*?\}/,
  `function handlePatchClick(row) {
  if (row.patch_id) {
    loadPatchDetail(row.patch_id, row.os_distro)
  }
}`
)

// Replace old template
const oldTmpl = `<template #default="{ row }">
                <a href="javascript:void(0)" class="patch-link" @click="handlePatchClick(row)">
                  {{ row.patch_id }}
                </a>
              </template>`
const newTmpl = `<template #default="{ row }">
                <div class="patch-list">
                  <a v-for="patchId in getPatchIdList(row.patch_id)" :key="patchId" href="javascript:void(0)" class="patch-link" @click="handlePatchClick({patch_id: patchId, os_distro: row.os_distro})">
                    {{ patchId }}
                  </a>
                </div>
              </template>`
vueCode = vueCode.replace(oldTmpl, newTmpl)

if (!vueCode.includes('<PatchDetailDialog')) {
  vueCode = vueCode.replace(
    /<!-- 操作记录对话框 -->/,
    `<!-- 补丁详情弹窗 -->
    <PatchDetailDialog
      v-model="patchDetailVisible"
      :patch-data="patchDetailData"
      :loading="patchDetailLoading"
      :os-distro="currentPatchOsDistro"
    />

    <!-- 操作记录对话框 -->`
  )
}

fs.writeFileSync('src/modules/patches/components/LinuxPatchScan.vue', vueCode)
