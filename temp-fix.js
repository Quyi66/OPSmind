const fs = require('fs')
const path = require('path')
const targetDir = path.join(__dirname, 'src/modules/asset/components/charts')
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.vue'))

files.forEach(f => {
  const p = path.join(targetDir, f)
  let content = fs.readFileSync(p, 'utf8')
  let original = content

  // Replace hardcoded colors in CSS
  content = content.replace(/color:\s*#303133;/g, 'color: var(--el-text-color-primary);')
  content = content.replace(/color:\s*#666;/g, 'color: var(--el-text-color-regular);')
  content = content.replace(/color:\s*#333;/g, 'color: var(--el-text-color-primary);')
  content = content.replace(/background:\s*#fff;/g, 'background: var(--el-bg-color);')
  content = content.replace(/background:\s*white;/gi, 'background: var(--el-bg-color);')

  // Replace ECharts hardcoded options
  content = content.replace(
    /color:\s*'#(333|666|f5f5f5|fff|ffffff|e0e0e0|e8e8e8|f0f0f0)'/gi,
    '/* color_removed */'
  )
  content = content.replace(/color:\s*'rgba[^']+'/g, '/* color_removed */')

  // Add useTheme if needed
  if (!content.includes('useTheme')) {
    content = content.replace(
      '<script setup>',
      `<script setup>\nimport { useTheme } from '@/composables/useTheme'\nconst { isDark } = useTheme()`
    )
  }

  // Update echarts.init to use theme, and watch for changes if not already handled
  if (!content.includes("isDark.value ? 'dark' : ''")) {
    // Basic init replace
    content = content.replace(
      /chartInstance = echarts\.init\((.*?)\)/,
      "chartInstance = echarts.init($1, isDark.value ? 'dark' : '')"
    )
    content = content.replace(
      /fullscreenChartInstance = echarts\.init\((.*?)\)/,
      "fullscreenChartInstance = echarts.init($1, isDark.value ? 'dark' : '')"
    )

    // Add watcher:
    if (!content.includes('watch(isDark')) {
      content = content.replace(
        /onMounted\(/,
        `watch(isDark, () => {
  if(chartInstance) {
    chartInstance.dispose();
    chartInstance = echarts.init(chartRef.value, isDark.value ? 'dark' : '');
    updateChart();
  }
  if(fullscreenChartInstance && fullscreenVisible.value) {
    fullscreenChartInstance.dispose();
    fullscreenChartInstance = echarts.init(fullscreenChartRef.value, isDark.value ? 'dark' : '');
    fullscreenChartInstance.setOption(getChartOption());
  }
});\n\nonMounted(`
      )
    }
  }

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8')
    console.log('Fixed ', f)
  }
})
