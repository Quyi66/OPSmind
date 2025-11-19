/**
 * 迁移跟踪器
 * 管理和跟踪 Angular 到 Vue 的模块迁移进度
 */

import { ref, reactive, computed } from 'vue'

// 迁移阶段
export const MIGRATION_PHASES = {
  PLANNING: 'planning',           // 规划阶段
  ANALYSIS: 'analysis',          // 分析阶段
  DEVELOPMENT: 'development',     // 开发阶段
  TESTING: 'testing',            // 测试阶段
  DEPLOYMENT: 'deployment',       // 部署阶段
  COMPLETED: 'completed',         // 已完成
  CANCELLED: 'cancelled'          // 已取消
}

// 迁移优先级
export const MIGRATION_PRIORITY = {
  CRITICAL: 'critical',   // 关键 - 必须优先迁移
  HIGH: 'high',          // 高 - 建议优先迁移
  MEDIUM: 'medium',      // 中 - 可以延后迁移
  LOW: 'low'             // 低 - 最后迁移
}

class MigrationTracker {
  constructor() {
    this.migrationTasks = reactive(new Map())
    this.milestones = reactive([])
    this.metrics = reactive({
      totalModules: 0,
      completedModules: 0,
      inProgressModules: 0,
      plannedModules: 0,
      totalEffort: 0,
      completedEffort: 0
    })

    this.initializeDefaultTasks()
  }

  /**
   * 初始化默认迁移任务
   */
  initializeDefaultTasks() {
    const defaultTasks = [
      {
        moduleCode: 'dashboard',
        moduleName: '仪表盘',
        priority: MIGRATION_PRIORITY.CRITICAL,
        phase: MIGRATION_PHASES.COMPLETED,
        estimatedEffort: 2,
        actualEffort: 2.5,
        features: ['数据概览', '快速操作', '系统状态'],
        completedFeatures: ['数据概览', '快速操作', '系统状态'],
        startDate: '2024-01-01',
        completedDate: '2024-01-15',
        assignee: 'Vue Team',
        notes: '已完成迁移，作为其他模块的参考实现'
      },
      {
        moduleCode: 'cac',
        moduleName: 'CAC 配置管理',
        priority: MIGRATION_PRIORITY.HIGH,
        phase: MIGRATION_PHASES.PLANNING,
        estimatedEffort: 6,
        features: ['配置检查', '合规审计', '模板管理', '主机管理', '脚本管理'],
        completedFeatures: [],
        dependencies: ['dashboard'],
        risks: ['复杂的配置逻辑', '大量的表单验证'],
        assignee: 'TBD',
        notes: '高频使用模块，需要优先迁移'
      },
      {
        moduleCode: 'jao',
        moduleName: 'JAO 作业编排',
        priority: MIGRATION_PRIORITY.MEDIUM,
        phase: MIGRATION_PHASES.ANALYSIS,
        estimatedEffort: 8,
        features: ['作业定义', '流程编排', '执行监控', '结果分析'],
        completedFeatures: [],
        dependencies: ['cac'],
        risks: ['复杂的工作流逻辑', '实时状态更新'],
        assignee: 'TBD',
        notes: '涉及复杂的工作流，需要仔细设计'
      },
      {
        moduleCode: 'gfs',
        moduleName: 'GFS 脚本管理',
        priority: MIGRATION_PRIORITY.MEDIUM,
        phase: MIGRATION_PHASES.PLANNING,
        estimatedEffort: 4,
        features: ['脚本管理', '版本控制', '脚本执行', '文件管理'],
        completedFeatures: [],
        risks: ['文件上传下载', '代码编辑器集成'],
        assignee: 'TBD',
        notes: '相对独立的模块，适合并行开发'
      }
    ]

    defaultTasks.forEach(task => {
      this.addMigrationTask(task)
    })

    this.updateMetrics()
  }

  /**
   * 添加迁移任务
   */
  addMigrationTask(taskConfig) {
    const task = {
      id: `migration-${taskConfig.moduleCode}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      blockers: [],
      ...taskConfig
    }

    // 计算进度
    if (task.features && task.completedFeatures) {
      task.progress = Math.round(
        (task.completedFeatures.length / task.features.length) * 100
      )
    }

    this.migrationTasks.set(task.moduleCode, task)
    this.updateMetrics()

    //console.log(`📋 Migration task added: ${task.moduleCode}`)
    return task
  }

  /**
   * 更新迁移任务
   */
  updateMigrationTask(moduleCode, updates) {
    const task = this.migrationTasks.get(moduleCode)
    if (!task) {
      console.warn(`Migration task not found: ${moduleCode}`)
      return null
    }

    Object.assign(task, updates, { updatedAt: new Date() })

    // 重新计算进度
    if (task.features && task.completedFeatures) {
      task.progress = Math.round(
        (task.completedFeatures.length / task.features.length) * 100
      )
    }

    this.updateMetrics()
    //console.log(`📝 Migration task updated: ${moduleCode}`)
    return task
  }

  /**
   * 标记功能为已完成
   */
  markFeatureCompleted(moduleCode, feature) {
    const task = this.migrationTasks.get(moduleCode)
    if (!task) return false

    if (!task.completedFeatures.includes(feature)) {
      task.completedFeatures.push(feature)
      task.updatedAt = new Date()

      // 检查是否所有功能都已完成
      if (task.completedFeatures.length === task.features.length) {
        task.phase = MIGRATION_PHASES.COMPLETED
        task.completedDate = new Date().toISOString().split('T')[0]
      }

      this.updateMigrationTask(moduleCode, {})
      //console.log(`✅ Feature completed: ${moduleCode}.${feature}`)
      return true
    }
    return false
  }

  /**
   * 添加阻塞问题
   */
  addBlocker(moduleCode, blocker) {
    const task = this.migrationTasks.get(moduleCode)
    if (!task) return false

    task.blockers.push({
      id: Date.now(),
      description: blocker,
      createdAt: new Date(),
      resolved: false
    })

    task.updatedAt = new Date()
    //console.log(`🚫 Blocker added: ${moduleCode} - ${blocker}`)
    return true
  }

  /**
   * 解决阻塞问题
   */
  resolveBlocker(moduleCode, blockerId) {
    const task = this.migrationTasks.get(moduleCode)
    if (!task) return false

    const blocker = task.blockers.find(b => b.id === blockerId)
    if (blocker) {
      blocker.resolved = true
      blocker.resolvedAt = new Date()
      task.updatedAt = new Date()
      //console.log(`✅ Blocker resolved: ${moduleCode} - ${blockerId}`)
      return true
    }
    return false
  }

  /**
   * 获取迁移任务
   */
  getMigrationTask(moduleCode) {
    return this.migrationTasks.get(moduleCode)
  }

  /**
   * 获取所有迁移任务
   */
  getAllMigrationTasks() {
    return Array.from(this.migrationTasks.values())
  }

  /**
   * 按阶段获取任务
   */
  getTasksByPhase(phase) {
    return this.getAllMigrationTasks().filter(task => task.phase === phase)
  }

  /**
   * 按优先级获取任务
   */
  getTasksByPriority(priority) {
    return this.getAllMigrationTasks().filter(task => task.priority === priority)
  }

  /**
   * 获取活跃任务 (进行中的任务)
   */
  getActiveTasks() {
    return this.getAllMigrationTasks().filter(task =>
      [MIGRATION_PHASES.DEVELOPMENT, MIGRATION_PHASES.TESTING].includes(task.phase)
    )
  }

  /**
   * 获取阻塞任务
   */
  getBlockedTasks() {
    return this.getAllMigrationTasks().filter(task =>
      task.blockers.some(blocker => !blocker.resolved)
    )
  }

  /**
   * 更新统计指标
   */
  updateMetrics() {
    const tasks = this.getAllMigrationTasks()

    this.metrics.totalModules = tasks.length
    this.metrics.completedModules = tasks.filter(
      t => t.phase === MIGRATION_PHASES.COMPLETED
    ).length
    this.metrics.inProgressModules = tasks.filter(
      t => [MIGRATION_PHASES.DEVELOPMENT, MIGRATION_PHASES.TESTING].includes(t.phase)
    ).length
    this.metrics.plannedModules = tasks.filter(
      t => [MIGRATION_PHASES.PLANNING, MIGRATION_PHASES.ANALYSIS].includes(t.phase)
    ).length

    this.metrics.totalEffort = tasks.reduce((sum, task) =>
      sum + (task.estimatedEffort || 0), 0
    )
    this.metrics.completedEffort = tasks
      .filter(t => t.phase === MIGRATION_PHASES.COMPLETED)
      .reduce((sum, task) => sum + (task.actualEffort || task.estimatedEffort || 0), 0)
  }

  /**
   * 生成迁移报告
   */
  generateReport() {
    const tasks = this.getAllMigrationTasks()
    const completionRate = this.metrics.totalModules > 0
      ? Math.round((this.metrics.completedModules / this.metrics.totalModules) * 100)
      : 0

    return {
      summary: {
        completionRate,
        totalModules: this.metrics.totalModules,
        completedModules: this.metrics.completedModules,
        inProgressModules: this.metrics.inProgressModules,
        blockedTasks: this.getBlockedTasks().length
      },
      phases: Object.values(MIGRATION_PHASES).map(phase => ({
        phase,
        count: this.getTasksByPhase(phase).length,
        tasks: this.getTasksByPhase(phase).map(t => ({
          moduleCode: t.moduleCode,
          moduleName: t.moduleName,
          progress: t.progress
        }))
      })),
      priorities: Object.values(MIGRATION_PRIORITY).map(priority => ({
        priority,
        count: this.getTasksByPriority(priority).length
      })),
      effort: {
        total: this.metrics.totalEffort,
        completed: this.metrics.completedEffort,
        remaining: this.metrics.totalEffort - this.metrics.completedEffort
      },
      blockers: this.getBlockedTasks().map(task => ({
        moduleCode: task.moduleCode,
        blockers: task.blockers.filter(b => !b.resolved)
      }))
    }
  }
}

// 创建全局实例
export const migrationTracker = new MigrationTracker()

// 导出 Composition API
export const useMigrationTracker = () => {
  return {
    // 数据
    tasks: computed(() => migrationTracker.getAllMigrationTasks()),
    activeTasks: computed(() => migrationTracker.getActiveTasks()),
    blockedTasks: computed(() => migrationTracker.getBlockedTasks()),
    metrics: computed(() => migrationTracker.metrics),
    report: computed(() => migrationTracker.generateReport()),

    // 方法
    getMigrationTask: migrationTracker.getMigrationTask.bind(migrationTracker),
    updateMigrationTask: migrationTracker.updateMigrationTask.bind(migrationTracker),
    markFeatureCompleted: migrationTracker.markFeatureCompleted.bind(migrationTracker),
    addBlocker: migrationTracker.addBlocker.bind(migrationTracker),
    resolveBlocker: migrationTracker.resolveBlocker.bind(migrationTracker),
    getTasksByPhase: migrationTracker.getTasksByPhase.bind(migrationTracker),
    getTasksByPriority: migrationTracker.getTasksByPriority.bind(migrationTracker)
  }
}
