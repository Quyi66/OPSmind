const fs = require('fs')
const path = require('path')
const targetDir = path.join(__dirname, 'src/modules/asset/components/charts')
const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.vue'))

files.forEach(f => {
  const p = path.join(targetDir, f)
  let content = fs.readFileSync(p, 'utf8')
  let original = content

  // Fix syntax error of the previous script
  content = content.replace(/\/\*\s*color_removed\s*\*\/\s*,/g, '')
  content = content.replace(/\/\*\s*color_removed\s*\*\//g, '')

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8')
    console.log('Fixed syntax in ', f)
  }
})
