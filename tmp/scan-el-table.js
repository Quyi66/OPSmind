const fs = require('fs');
const path = require('path');

const root = 'c:/Users/yumiao/Desktop/新建文件夹 (5)/opsmind-dev';
const src = path.join(root, 'src');
const out = path.join(root, 'tmp', 'el-table-missing.txt');
const results = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !full.endsWith('.vue')) {
      continue;
    }
    const text = fs.readFileSync(full, 'utf8');
    const regex = /<el-table\b[^>]*>/gis;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const tag = match[0];
      if (!/(max-height|height)\s*=/.test(tag)) {
        const before = text.slice(0, match.index);
        const line = before.split('\n').length;
        const rel = path.relative(root, full).replace(/\\/g, '/');
        results.push(`${rel}:${line}`);
      }
    }
  }
}

walk(src);
results.sort();
fs.writeFileSync(out, results.join('\n'), 'utf8');
console.log(`Found ${results.length} el-table tags missing max-height/height.`);
