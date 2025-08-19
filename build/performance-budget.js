/**
 * 性能预算配置
 * 用于监控构建产物的大小和性能指标
 */

export const PERFORMANCE_BUDGET = {
  // 文件大小限制 (KB)
  maxSizes: {
    // 主要 JS 文件
    'js/main-*.js': 500,
    'js/vue-vendor-*.js': 300,
    'js/element-plus-*.js': 400,
    'js/core-*.js': 200,
    'js/shared-*.js': 150,
    
    // 模块文件
    'js/modules/module-*-*.js': 100,
    
    // CSS 文件
    'assets/*.css': 100,
    
    // 图片文件
    'images/*': 200,
    
    // 字体文件
    'fonts/*': 100
  },
  
  // 总体大小限制
  totalSize: {
    js: 2000,      // 所有 JS 文件总大小
    css: 300,      // 所有 CSS 文件总大小
    images: 1000,  // 所有图片文件总大小
    fonts: 500,    // 所有字体文件总大小
    total: 4000    // 所有文件总大小
  },
  
  // 性能指标阈值
  metrics: {
    // 首屏加载时间 (ms)
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    
    // 交互性指标 (ms)
    timeToInteractive: 3000,
    firstInputDelay: 100,
    
    // 累积布局偏移
    cumulativeLayoutShift: 0.1,
    
    // 资源加载
    resourceLoadTime: 2000,
    
    // 内存使用 (MB)
    memoryUsage: 50
  },
  
  // 网络条件
  networkConditions: {
    // 3G 网络
    '3g': {
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
      latency: 40                                 // 40ms
    },
    
    // 4G 网络
    '4g': {
      downloadThroughput: 4 * 1024 * 1024 / 8,   // 4 Mbps
      uploadThroughput: 3 * 1024 * 1024 / 8,     // 3 Mbps
      latency: 20                                 // 20ms
    }
  }
}

/**
 * 检查构建产物是否符合性能预算
 */
export function checkPerformanceBudget(buildStats) {
  const violations = []
  
  // 检查文件大小
  Object.entries(PERFORMANCE_BUDGET.maxSizes).forEach(([pattern, maxSize]) => {
    const regex = new RegExp(pattern.replace('*', '.*'))
    
    buildStats.assets.forEach(asset => {
      if (regex.test(asset.name) && asset.size > maxSize * 1024) {
        violations.push({
          type: 'file_size',
          file: asset.name,
          actual: Math.round(asset.size / 1024),
          expected: maxSize,
          message: `File ${asset.name} (${Math.round(asset.size / 1024)}KB) exceeds budget (${maxSize}KB)`
        })
      }
    })
  })
  
  // 检查总体大小
  const totalSizes = calculateTotalSizes(buildStats.assets)
  Object.entries(PERFORMANCE_BUDGET.totalSize).forEach(([type, maxSize]) => {
    if (totalSizes[type] > maxSize * 1024) {
      violations.push({
        type: 'total_size',
        category: type,
        actual: Math.round(totalSizes[type] / 1024),
        expected: maxSize,
        message: `Total ${type} size (${Math.round(totalSizes[type] / 1024)}KB) exceeds budget (${maxSize}KB)`
      })
    }
  })
  
  return {
    passed: violations.length === 0,
    violations,
    summary: {
      totalViolations: violations.length,
      fileSizeViolations: violations.filter(v => v.type === 'file_size').length,
      totalSizeViolations: violations.filter(v => v.type === 'total_size').length
    }
  }
}

/**
 * 计算各类型文件的总大小
 */
function calculateTotalSizes(assets) {
  const sizes = {
    js: 0,
    css: 0,
    images: 0,
    fonts: 0,
    total: 0
  }
  
  assets.forEach(asset => {
    sizes.total += asset.size
    
    if (asset.name.endsWith('.js')) {
      sizes.js += asset.size
    } else if (asset.name.endsWith('.css')) {
      sizes.css += asset.size
    } else if (/\.(png|jpe?g|gif|svg|webp)$/i.test(asset.name)) {
      sizes.images += asset.size
    } else if (/\.(woff2?|eot|ttf|otf)$/i.test(asset.name)) {
      sizes.fonts += asset.size
    }
  })
  
  return sizes
}

/**
 * 生成性能报告
 */
export function generatePerformanceReport(buildStats, budgetCheck) {
  const report = {
    timestamp: new Date().toISOString(),
    buildInfo: {
      totalAssets: buildStats.assets.length,
      totalSize: Math.round(buildStats.assets.reduce((sum, asset) => sum + asset.size, 0) / 1024),
      buildTime: buildStats.time
    },
    budget: {
      passed: budgetCheck.passed,
      violations: budgetCheck.violations,
      summary: budgetCheck.summary
    },
    recommendations: generateRecommendations(budgetCheck.violations)
  }
  
  return report
}

/**
 * 生成优化建议
 */
function generateRecommendations(violations) {
  const recommendations = []
  
  violations.forEach(violation => {
    switch (violation.type) {
      case 'file_size':
        if (violation.file.includes('vendor')) {
          recommendations.push('考虑使用动态导入分割第三方库')
        } else if (violation.file.includes('module-')) {
          recommendations.push('考虑进一步分割业务模块')
        } else {
          recommendations.push(`优化 ${violation.file} 的代码或资源`)
        }
        break
        
      case 'total_size':
        if (violation.category === 'js') {
          recommendations.push('考虑启用 Tree Shaking 和代码压缩')
        } else if (violation.category === 'images') {
          recommendations.push('优化图片格式和大小，考虑使用 WebP')
        } else if (violation.category === 'css') {
          recommendations.push('移除未使用的 CSS 规则')
        }
        break
    }
  })
  
  return [...new Set(recommendations)] // 去重
}
