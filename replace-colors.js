const fs = require('fs')
const path = require('path')

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f)
    let isDirectory = fs.statSync(dirPath).isDirectory()
    if (isDirectory) {
      walk(dirPath, callback)
    } else {
      if (dirPath.endsWith('.vue') || dirPath.endsWith('.scss')) {
        callback(dirPath)
      }
    }
  })
}

function replaceColors() {
  const targetDirs = [
    path.join(__dirname, 'src/components'),
    path.join(__dirname, 'src/modules'),
    path.join(__dirname, 'src/views'),
    path.join(__dirname, 'src/layouts')
  ]

  targetDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      walk(dir, filePath => {
        let content = fs.readFileSync(filePath, 'utf8')
        let original = content

        // Backgrounds to main bg color
        content = content.replace(
          /background(-color)?\s*:\s*#(fff|ffffff|FFF|FFFFFF)\b/g,
          'background$1: var(--el-bg-color)'
        )

        // Backgrounds to page bg color
        content = content.replace(
          /background(-color)?\s*:\s*#(f5f5f5|F5F5F5|f5f7fa|F5F7FA|f0f2f5|F0F2F5|fafafa|FAFAFA)\b/g,
          'background$1: var(--el-bg-color-page)'
        )

        // Border colors
        content = content.replace(
          /border(.*?)\s*:\s*([0-9]+px) (solid|dashed) #(e4e7ed|ebeef5|e2e8f0|dcdfe6|d9d9d9|e8eaed|f0f0f0|F0F0F0)\b/gi,
          'border$1: $2 $3 var(--el-border-color-light)'
        )

        if (content !== original) {
          fs.writeFileSync(filePath, content, 'utf8')
          console.log(`Updated ${filePath}`)
        }
      })
    }
  })
}

replaceColors()
