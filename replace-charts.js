const fs = require('fs')
const path = require('path')

const targetDir = path.join(__dirname, 'src/components/dashboard')

if (fs.existsSync(targetDir)) {
  fs.readdirSync(targetDir).forEach(f => {
    if (f.endsWith('.vue')) {
      let filePath = path.join(targetDir, f)
      let content = fs.readFileSync(filePath, 'utf8')
      let original = content

      // Import useTheme if not present
      if (!content.includes('useTheme')) {
        // Try to inject correctly. Looking for <script setup>
        if (content.includes('import { useDashboardStore }')) {
          content = content.replace(
            'import { useDashboardStore }',
            "import { useTheme } from '@/composables/useTheme'\nconst { isDark } = useTheme()\nimport { useDashboardStore }"
          )
        } else if (content.includes('import { ref, computed }')) {
          content = content.replace(
            'import { ref, computed }',
            "import { useTheme } from '@/composables/useTheme'\nconst { isDark } = useTheme()\nimport { ref, computed }"
          )
        }
      }

      // Add theme prop to v-chart
      if (!content.includes(':theme=')) {
        content = content.replace(/<v-chart(.*?)>/g, "<v-chart$1 :theme=\"isDark ? 'dark' : ''\">")
      }

      // Replace hardcoded text colors in class/SCSS
      content = content.replace(/color:\s*#374151;/g, 'color: var(--el-text-color-primary);')
      content = content.replace(/color:\s*#6b7280;/g, 'color: var(--el-text-color-regular);')
      content = content.replace(/color:\s*#262626;/g, 'color: var(--el-text-color-primary);')
      content = content.replace(
        /background:\s*#fafbfc;/g,
        'background: var(--el-fill-color-light);'
      )
      content = content.replace(/color:\s*#666;/g, 'color: var(--el-text-color-regular);')
      content = content.replace(/color:\s*#333;/g, 'color: var(--el-text-color-primary);')

      // Clean up common hardcoded colors in echarts options
      content = content.replace(/backgroundColor:\s*'rgba.*?'.*?,/g, '')
      content = content.replace(/borderColor:\s*'#.*?'.*?,/g, '')
      content = content.replace(/borderWidth:\s*1,/g, '')

      // We will match the entire textStyle block carefully or just textStyle nested color line.
      content = content.replace(
        /textStyle:\s*\{\s*color:\s*'#(333|666|f5f5f5|fff|ffffff)'\s*\},?/gi,
        ''
      )

      // color: '#e8e8e8', color: '#f0f0f0' in echarts options
      // This is risky, only delete known axis color properties
      content = content.replace(
        /color:\s*'#(666|e8e8e8|f0f0f0|262626|333|f5f5f5|fff|ffffff)'/gi,
        '/*color_removed*/'
      )

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8')
        console.log(`Updated ${filePath}`)
      }
    }
  })
}
